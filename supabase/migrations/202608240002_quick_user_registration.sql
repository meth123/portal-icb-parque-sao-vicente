begin;

alter table public.profiles
  add column if not exists birth_date date,
  add column if not exists leadership_started_on date;

comment on column public.profiles.birth_date is
  'Personal date of birth. Nullable for legacy profiles with unknown birth dates.';

comment on column public.profiles.leadership_started_on is
  'Administrative date when the person first began any leadership activity, independently of a current cell assignment.';

create or replace function public.validate_profile_dates()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  current_local_date date := (now() at time zone 'America/Sao_Paulo')::date;
begin
  if new.birth_date is not null and new.birth_date > current_local_date then
    raise exception 'PROFILE_BIRTH_DATE_INVALID';
  end if;

  if new.leadership_started_on is not null
    and new.leadership_started_on > current_local_date
  then
    raise exception 'PROFILE_LEADERSHIP_STARTED_ON_INVALID';
  end if;

  return new;
end;
$$;

revoke execute on function public.validate_profile_dates()
from public, anon, authenticated;

drop trigger if exists validate_profile_dates on public.profiles;
create trigger validate_profile_dates
before insert or update of birth_date, leadership_started_on
on public.profiles
for each row execute function public.validate_profile_dates();

grant update (birth_date)
on table public.profiles
to authenticated;

-- A forced-password account may authenticate, but it is not yet allowed to
-- use portal data. This helper is used by restrictive RLS policies below and
-- by the established authorization helpers.
create or replace function public.has_completed_password_setup()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles
    where id = (select auth.uid())
      and must_change_password = false
  );
$$;

revoke execute on function public.has_completed_password_setup()
from public, anon;
grant execute on function public.has_completed_password_setup()
to authenticated;

create or replace function public.is_active_user()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles
    where id = (select auth.uid())
      and is_active = true
      and must_change_password = false
  );
$$;

create or replace function public.is_administrator()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles
    where id = (select auth.uid())
      and is_active = true
      and must_change_password = false
      and global_role in ('administrator', 'pastor')
  );
$$;

create or replace function public.can_manage_cells()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles
    where id = (select auth.uid())
      and is_active = true
      and must_change_password = false
      and global_role in ('administrator', 'pastor')
  );
$$;

create or replace function public.can_view_all_cells()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles
    where id = (select auth.uid())
      and is_active = true
      and must_change_password = false
      and (
        global_role in ('administrator', 'pastor')
        or is_supervisor = true
      )
  );
$$;

-- Restrictive policies are ANDed with every existing permissive policy. They
-- protect direct browser access to all current public RLS tables while still
-- allowing the private password-completion update through the server client.
do $$
declare
  target_table record;
begin
  for target_table in
    select tablename
    from pg_tables
    where schemaname = 'public' and rowsecurity = true
  loop
    execute format(
      'drop policy if exists "Completed password setup required" on public.%I',
      target_table.tablename
    );
    execute format(
      'create policy "Completed password setup required" on public.%I as restrictive for all to authenticated using ((select public.has_completed_password_setup())) with check ((select public.has_completed_password_setup()))',
      target_table.tablename
    );
  end loop;
end;
$$;

create or replace function public.get_portal_session_context()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $function$
  with viewer as (
    select
      profiles.id,
      profiles.full_name,
      profiles.avatar_path,
      profiles.birth_date,
      profiles.leadership_started_on,
      profiles.global_role,
      profiles.is_supervisor,
      profiles.can_manage_cells,
      profiles.is_active,
      profiles.must_change_password
    from public.profiles
    where profiles.id = (select auth.uid())
  ),
  current_assignment as (
    select leaderships.cell_id, leaderships.role
    from public.cell_leaderships as leaderships
    join viewer on viewer.id = leaderships.profile_id
    where leaderships.ends_on is null
    limit 1
  )
  select case
    when not exists (select 1 from viewer) then null
    else (
      select jsonb_build_object(
        'id', viewer.id,
        'fullName', viewer.full_name,
        'avatarPath', viewer.avatar_path,
        'birthDate', viewer.birth_date,
        'leadershipStartedOn', viewer.leadership_started_on,
        'globalRole', viewer.global_role,
        'isSupervisor', viewer.is_supervisor,
        'canManageCells', viewer.can_manage_cells,
        'isActive', viewer.is_active,
        'mustChangePassword', viewer.must_change_password,
        'currentCellId', current_assignment.cell_id,
        'currentLeadershipRole', current_assignment.role,
        'hasDocumentLibraryAccess',
          viewer.is_active and viewer.must_change_password = false and (
            viewer.global_role in ('administrator', 'pastor')
            or viewer.is_supervisor = true
            or current_assignment.cell_id is not null
          ),
        'canManageDocumentLibrary',
          viewer.is_active
          and viewer.must_change_password = false
          and viewer.global_role in ('administrator', 'pastor')
      )
      from viewer
      left join current_assignment on true
    )
  end;
$function$;

-- This operation runs after Supabase Auth has created the account. Profile
-- preparation, optional leadership replacement/insertion and audit are one
-- database transaction. If it fails, the server removes the new Auth user.
create function public.finalize_quick_user_registration(
  target_profile_id uuid,
  target_full_name text,
  target_birth_date date,
  target_leadership_started_on date,
  target_cell_id uuid,
  target_leadership_role text,
  target_confirm_leader_replacement boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_profile_id uuid := (select auth.uid());
  normalized_full_name text := btrim(target_full_name);
  current_local_date date := (now() at time zone 'America/Sao_Paulo')::date;
  target_cell_name text;
  target_cell_started_on date;
  current_leader_profile_id uuid;
  current_leader_name text;
  current_vice_profile_ids uuid[];
  leadership_result jsonb := null;
begin
  if actor_profile_id is null or not exists (
    select 1
    from public.profiles as actor
    where actor.id = actor_profile_id
      and actor.is_active = true
      and actor.must_change_password = false
      and actor.global_role in ('administrator', 'pastor')
  ) then
    raise exception 'QUICK_REGISTRATION_FORBIDDEN' using errcode = '42501';
  end if;

  if target_profile_id is null
    or normalized_full_name is null
    or char_length(normalized_full_name) not between 2 and 120
    or target_birth_date is null
    or target_birth_date > current_local_date
  then
    raise exception 'QUICK_REGISTRATION_INVALID';
  end if;

  if target_leadership_started_on is not null
    and target_leadership_started_on > current_local_date
  then
    raise exception 'QUICK_REGISTRATION_LEADERSHIP_DATE_INVALID';
  end if;

  if (target_cell_id is null) <> (target_leadership_role is null)
    or (
      target_leadership_role is not null
      and target_leadership_role not in ('leader', 'vice_leader')
    )
  then
    raise exception 'QUICK_REGISTRATION_LEADERSHIP_INVALID';
  end if;

  perform 1
  from public.profiles as candidate
  join auth.users as auth_user on auth_user.id = candidate.id
  where candidate.id = target_profile_id
    and candidate.full_name is null
    and candidate.birth_date is null
    and candidate.leadership_started_on is null
    and candidate.global_role = 'user'
    and candidate.is_active = true
    and candidate.is_supervisor = false
    and candidate.can_manage_cells = false
    and candidate.must_change_password = false
    and auth_user.created_at >= now() - interval '15 minutes'
    and auth_user.last_sign_in_at is null
    and not exists (
      select 1
      from public.cell_leaderships
      where profile_id = target_profile_id and ends_on is null
    )
  for update of candidate;

  if not found then
    raise exception 'QUICK_REGISTRATION_PROFILE_NOT_ELIGIBLE';
  end if;

  if target_cell_id is not null then
    select cells.name, cells.started_on
    into target_cell_name, target_cell_started_on
    from public.cells
    where cells.id = target_cell_id and cells.is_active = true
    for update;

    if not found then
      raise exception 'QUICK_REGISTRATION_CELL_NOT_ACTIVE';
    end if;

    if target_cell_started_on is not null
      and current_local_date < target_cell_started_on
    then
      raise exception 'QUICK_REGISTRATION_CELL_DATE_INVALID';
    end if;

    if target_leadership_started_on is null
      or target_leadership_started_on > current_local_date
      or (
        target_cell_started_on is not null
        and target_leadership_started_on < target_cell_started_on
      )
    then
      raise exception 'QUICK_REGISTRATION_CELL_LEADERSHIP_DATE_INVALID';
    end if;

    select leadership.profile_id, leader_profile.full_name
    into current_leader_profile_id, current_leader_name
    from public.cell_leaderships as leadership
    join public.profiles as leader_profile
      on leader_profile.id = leadership.profile_id
    where leadership.cell_id = target_cell_id
      and leadership.role = 'leader'
      and leadership.ends_on is null;

    select coalesce(array_agg(profile_id order by profile_id), '{}'::uuid[])
    into current_vice_profile_ids
    from public.cell_leaderships
    where cell_id = target_cell_id
      and role = 'vice_leader'
      and ends_on is null;

    if target_leadership_role = 'leader'
      and current_leader_profile_id is not null
      and target_confirm_leader_replacement is distinct from true
    then
      raise exception 'QUICK_REGISTRATION_LEADER_REPLACEMENT_REQUIRED';
    end if;
  end if;

  update public.profiles
  set full_name = normalized_full_name,
    birth_date = target_birth_date,
    leadership_started_on = target_leadership_started_on,
    must_change_password = true
  where id = target_profile_id;

  if target_cell_id is not null then
    if target_leadership_role = 'leader' then
      leadership_result := public.replace_current_cell_leadership(
        target_cell_id,
        target_leadership_started_on,
        target_profile_id,
        current_vice_profile_ids
      );
    else
      leadership_result := public.replace_current_cell_leadership(
        target_cell_id,
        target_leadership_started_on,
        current_leader_profile_id,
        array_append(current_vice_profile_ids, target_profile_id)
      );
    end if;
  end if;

  insert into public.admin_operation_audits (
    actor_profile_id, action, target_type, target_id, metadata
  ) values (
    actor_profile_id,
    'account.quick_registration.create',
    'profile',
    target_profile_id,
    jsonb_build_object(
      'birth_date_provided', true,
      'leadership_started_on', target_leadership_started_on,
      'cell_id', target_cell_id,
      'leadership_role', target_leadership_role,
      'relationship_starts_on',
         case when target_cell_id is null then null else target_leadership_started_on end,
      'replaced_leader_profile_id',
        case
          when target_leadership_role = 'leader'
          then current_leader_profile_id
          else null
        end,
      'previous_leader_name_recorded',
        current_leader_name is not null,
      'must_change_password', true
    )
  );

  return jsonb_build_object(
    'profile_id', target_profile_id,
    'cell_id', target_cell_id,
    'leadership_role', target_leadership_role,
    'relationship_starts_on',
      case when target_cell_id is null then null else target_leadership_started_on end,
    'leadership_changed',
      coalesce((leadership_result ->> 'changed')::boolean, false)
  );
end;
$$;

revoke execute on function public.finalize_quick_user_registration(
  uuid, text, date, date, uuid, text, boolean
) from public, anon;
grant execute on function public.finalize_quick_user_registration(
  uuid, text, date, date, uuid, text, boolean
) to authenticated;

comment on function public.finalize_quick_user_registration(
  uuid, text, date, date, uuid, text, boolean
) is
  'Atomically finalizes a recent server-created Auth account, its personal profile and an optional current cell leadership assignment.';

-- Password-change completion is now a private server-side profile update made
-- only after auth.updateUser succeeds. Keeping this RPC callable would allow a
-- client to clear the flag without actually changing the Auth password.
drop function if exists public.complete_password_change();

create function public.complete_required_password_change(
  target_profile_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  updated_rows integer;
begin
  if (select auth.role()) is distinct from 'service_role' then
    raise exception 'PASSWORD_CHANGE_COMPLETION_FORBIDDEN'
      using errcode = '42501';
  end if;

  update public.profiles
  set must_change_password = false
  where id = target_profile_id and must_change_password = true;

  get diagnostics updated_rows = row_count;
  return updated_rows = 1;
end;
$$;

revoke execute on function public.complete_required_password_change(uuid)
from public, anon, authenticated;
grant execute on function public.complete_required_password_change(uuid)
to service_role;

comment on function public.complete_required_password_change(uuid) is
  'Private server-only completion step called after Supabase Auth confirms the password update.';

-- The administrative invitation preparation primitive is obsolete. Password
-- recovery remains handled by Supabase Auth and is intentionally untouched.
drop function if exists public.prepare_invited_leadership_profile(uuid, text);

commit;
