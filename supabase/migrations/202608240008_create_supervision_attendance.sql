begin;

create function public.can_manage_supervision_attendance()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles
    where profiles.id = (select auth.uid())
      and profiles.is_active = true
      and profiles.must_change_password = false
      and (
        profiles.global_role in ('administrator', 'pastor')
        or profiles.is_supervisor = true
        or exists (
          select 1
          from public.cell_leaderships
          where cell_leaderships.profile_id = profiles.id
            and cell_leaderships.role = 'leader'
            and cell_leaderships.ends_on is null
        )
      )
  );
$$;

revoke execute on function public.can_manage_supervision_attendance()
from public, anon;
grant execute on function public.can_manage_supervision_attendance()
to authenticated;

create table public.supervision_attendance_sessions (
  id uuid primary key default gen_random_uuid(),
  network_id uuid not null references public.networks (id) on delete restrict,
  session_on date not null,
  status text not null default 'draft'
    check (status in ('draft', 'finalized')),
  created_by uuid not null references public.profiles (id) on delete restrict,
  finalized_by uuid references public.profiles (id) on delete restrict,
  finalized_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (network_id, session_on),
  check (
    (status = 'draft' and finalized_by is null and finalized_at is null)
    or
    (status = 'finalized' and finalized_by is not null and finalized_at is not null)
  )
);

create index supervision_attendance_sessions_history_idx
on public.supervision_attendance_sessions (session_on desc, created_at desc);

create table public.supervision_attendance_entries (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null
    references public.supervision_attendance_sessions (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete restrict,
  present boolean,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (session_id, profile_id)
);

create index supervision_attendance_entries_profile_idx
on public.supervision_attendance_entries (profile_id);

create trigger set_supervision_attendance_sessions_updated_at
before update on public.supervision_attendance_sessions
for each row execute procedure public.set_updated_at();

create trigger set_supervision_attendance_entries_updated_at
before update on public.supervision_attendance_entries
for each row execute procedure public.set_updated_at();

alter table public.supervision_attendance_sessions enable row level security;
alter table public.supervision_attendance_entries enable row level security;

revoke all on table public.supervision_attendance_sessions from anon, authenticated;
revoke all on table public.supervision_attendance_entries from anon, authenticated;
grant select on table public.supervision_attendance_sessions to authenticated;
grant select on table public.supervision_attendance_entries to authenticated;

create policy "Pastoral users can read supervision attendance sessions"
on public.supervision_attendance_sessions
for select
to authenticated
using ((select public.can_manage_supervision_attendance()));

create policy "Pastoral users can read supervision attendance entries"
on public.supervision_attendance_entries
for select
to authenticated
using ((select public.can_manage_supervision_attendance()));

create function public.create_supervision_attendance_session(
  target_network_code text,
  target_session_on date
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  normalized_network_code text := case
    when upper(replace(btrim(coalesce(target_network_code, '')), '.', '')) = 'HM'
      then 'H.M'
    else upper(btrim(coalesce(target_network_code, '')))
  end;
  target_network_id uuid;
  created_session_id uuid;
begin
  if not (select public.can_manage_supervision_attendance()) then
    raise exception 'SUPERVISION_ATTENDANCE_FORBIDDEN';
  end if;

  if target_session_on is null
    or target_session_on > (now() at time zone 'America/Sao_Paulo')::date then
    raise exception 'SUPERVISION_ATTENDANCE_INVALID_DATE';
  end if;

  select networks.id
  into target_network_id
  from public.networks
  where networks.code = normalized_network_code
    and networks.code in ('RJ', 'H.M')
    and networks.is_active = true;

  if target_network_id is null then
    raise exception 'SUPERVISION_ATTENDANCE_INVALID_NETWORK';
  end if;

  insert into public.supervision_attendance_sessions (
    network_id,
    session_on,
    created_by
  )
  values (
    target_network_id,
    target_session_on,
    (select auth.uid())
  )
  on conflict (network_id, session_on) do nothing
  returning id into created_session_id;

  if created_session_id is null then
    select sessions.id
    into created_session_id
    from public.supervision_attendance_sessions as sessions
    where sessions.network_id = target_network_id
      and sessions.session_on = target_session_on;

    return created_session_id;
  end if;

  insert into public.supervision_attendance_entries (session_id, profile_id)
  select
    created_session_id,
    eligible_people.profile_id
  from (
    select distinct leaderships.profile_id
    from public.cell_leaderships as leaderships
    join public.cell_classifications as classifications
      on classifications.cell_id = leaderships.cell_id
      and classifications.starts_on <= target_session_on
      and (
        classifications.ends_on is null
        or classifications.ends_on > target_session_on
      )
    join public.cell_types
      on cell_types.id = classifications.cell_type_id
      and cell_types.network_id = target_network_id
    join public.profiles
      on profiles.id = leaderships.profile_id
      and profiles.is_active = true
    where leaderships.starts_on <= target_session_on
      and (
        leaderships.ends_on is null
        or leaderships.ends_on > target_session_on
      )
  ) as eligible_people;

  return created_session_id;
end;
$$;

create function public.finalize_supervision_attendance_session(
  target_session_id uuid,
  target_present_profile_ids uuid[] default '{}'
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_status text;
begin
  if not (select public.can_manage_supervision_attendance()) then
    raise exception 'SUPERVISION_ATTENDANCE_FORBIDDEN';
  end if;

  select sessions.status
  into target_status
  from public.supervision_attendance_sessions as sessions
  where sessions.id = target_session_id
  for update;

  if target_status is null then
    raise exception 'SUPERVISION_ATTENDANCE_NOT_FOUND';
  end if;

  if target_status <> 'draft' then
    raise exception 'SUPERVISION_ATTENDANCE_ALREADY_FINALIZED';
  end if;

  if exists (
    select 1
    from unnest(coalesce(target_present_profile_ids, '{}')) as selected(profile_id)
    where not exists (
      select 1
      from public.supervision_attendance_entries as entries
      where entries.session_id = target_session_id
        and entries.profile_id = selected.profile_id
    )
  ) then
    raise exception 'SUPERVISION_ATTENDANCE_INVALID_PERSON';
  end if;

  update public.supervision_attendance_entries
  set present = false
  where session_id = target_session_id;

  update public.supervision_attendance_entries
  set present = true
  where session_id = target_session_id
    and profile_id = any(coalesce(target_present_profile_ids, '{}'));

  update public.supervision_attendance_sessions
  set
    status = 'finalized',
    finalized_by = (select auth.uid()),
    finalized_at = now()
  where id = target_session_id;
end;
$$;

create function public.save_supervision_attendance_draft(
  target_session_id uuid,
  target_present_profile_ids uuid[] default '{}'
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_status text;
begin
  if not (select public.can_manage_supervision_attendance()) then
    raise exception 'SUPERVISION_ATTENDANCE_FORBIDDEN';
  end if;

  select sessions.status
  into target_status
  from public.supervision_attendance_sessions as sessions
  where sessions.id = target_session_id
  for update;

  if target_status is distinct from 'draft' then
    raise exception 'SUPERVISION_ATTENDANCE_NOT_DRAFT';
  end if;

  if exists (
    select 1
    from unnest(coalesce(target_present_profile_ids, '{}')) as selected(profile_id)
    where not exists (
      select 1
      from public.supervision_attendance_entries as entries
      where entries.session_id = target_session_id
        and entries.profile_id = selected.profile_id
    )
  ) then
    raise exception 'SUPERVISION_ATTENDANCE_INVALID_PERSON';
  end if;

  update public.supervision_attendance_entries
  set present = null
  where session_id = target_session_id;

  update public.supervision_attendance_entries
  set present = true
  where session_id = target_session_id
    and profile_id = any(coalesce(target_present_profile_ids, '{}'));
end;
$$;

create function public.update_supervision_attendance_entry(
  target_session_id uuid,
  target_profile_id uuid,
  target_present boolean
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not (select public.can_manage_supervision_attendance()) then
    raise exception 'SUPERVISION_ATTENDANCE_FORBIDDEN';
  end if;

  if target_present is null then
    raise exception 'SUPERVISION_ATTENDANCE_INVALID_STATUS';
  end if;

  if not exists (
    select 1
    from public.supervision_attendance_sessions as sessions
    where sessions.id = target_session_id
      and sessions.status = 'finalized'
  ) then
    raise exception 'SUPERVISION_ATTENDANCE_NOT_FINALIZED';
  end if;

  update public.supervision_attendance_entries
  set present = target_present
  where session_id = target_session_id
    and profile_id = target_profile_id;

  if not found then
    raise exception 'SUPERVISION_ATTENDANCE_INVALID_PERSON';
  end if;
end;
$$;

create function public.get_supervision_attendance_overview()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with authorized as (
    select public.can_manage_supervision_attendance() as allowed
  ),
  available_networks as (
    select networks.id, networks.name, networks.code
    from public.networks
    cross join authorized
    where authorized.allowed = true
      and networks.is_active = true
      and networks.code in ('RJ', 'H.M')
  ),
  session_totals as (
    select
      sessions.id,
      sessions.session_on,
      sessions.status,
      sessions.created_at,
      networks.id as network_id,
      networks.name as network_name,
      networks.code as network_code,
      count(entries.id)::integer as total,
      count(entries.id) filter (where entries.present = true)::integer as present,
      count(entries.id) filter (where entries.present = false)::integer as absent,
      count(entries.id) filter (where entries.present is null)::integer as unmarked
    from public.supervision_attendance_sessions as sessions
    join public.networks as networks
      on networks.id = sessions.network_id
      and networks.code in ('RJ', 'H.M')
    left join public.supervision_attendance_entries as entries
      on entries.session_id = sessions.id
    group by sessions.id, networks.id, networks.name, networks.code
  )
  select case
    when not (select allowed from authorized) then null
    else jsonb_build_object(
      'networks', coalesce((
        select jsonb_agg(jsonb_build_object(
          'id', networks.id,
          'name', networks.name,
          'code', networks.code
        ) order by case networks.code when 'RJ' then 1 else 2 end)
        from available_networks as networks
      ), '[]'::jsonb),
      'sessions', coalesce((
        select jsonb_agg(jsonb_build_object(
          'id', totals.id,
          'sessionOn', totals.session_on,
          'status', totals.status,
          'networkId', totals.network_id,
          'networkName', totals.network_name,
          'networkCode', totals.network_code,
          'total', totals.total,
          'present', totals.present,
          'absent', totals.absent,
          'unmarked', totals.unmarked,
          'percentage', case
            when totals.total = 0 then 0
            else round(totals.present * 100.0 / totals.total)::integer
          end
        ) order by totals.session_on desc, totals.created_at desc)
        from session_totals as totals
      ), '[]'::jsonb)
    )
  end;
$$;

create function public.get_supervision_attendance_session(
  target_session_id uuid
)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with authorized_session as (
    select
      sessions.id,
      sessions.session_on,
      sessions.status,
      sessions.created_at,
      sessions.finalized_at,
      networks.id as network_id,
      networks.name as network_name,
      networks.code as network_code,
      coalesce(creator.full_name, 'Nome não informado') as responsible_name,
      coalesce(finalizer.full_name, 'Nome não informado') as finalized_by_name
    from public.supervision_attendance_sessions as sessions
    join public.networks as networks on networks.id = sessions.network_id
    join public.profiles as creator on creator.id = sessions.created_by
    left join public.profiles as finalizer on finalizer.id = sessions.finalized_by
    where sessions.id = target_session_id
      and networks.code in ('RJ', 'H.M')
      and (select public.can_manage_supervision_attendance())
  ),
  people as (
    select
      entries.profile_id,
      coalesce(profiles.full_name, 'Nome não informado') as full_name,
      entries.present,
      cells.name as cell_name,
      leaderships.role as leadership_role
    from public.supervision_attendance_entries as entries
    join authorized_session as sessions on sessions.id = entries.session_id
    join public.profiles on profiles.id = entries.profile_id
    left join lateral (
      select cell_leaderships.cell_id, cell_leaderships.role
      from public.cell_leaderships
      where cell_leaderships.profile_id = entries.profile_id
        and cell_leaderships.starts_on <= sessions.session_on
        and (
          cell_leaderships.ends_on is null
          or cell_leaderships.ends_on > sessions.session_on
        )
      order by cell_leaderships.starts_on desc, cell_leaderships.id
      limit 1
    ) as leaderships on true
    left join public.cells on cells.id = leaderships.cell_id
  ),
  totals as (
    select
      count(*)::integer as total,
      count(*) filter (where people.present = true)::integer as present,
      count(*) filter (where people.present = false)::integer as absent,
      count(*) filter (where people.present is null)::integer as unmarked
    from people
  )
  select jsonb_build_object(
    'id', sessions.id,
    'sessionOn', sessions.session_on,
    'status', sessions.status,
    'createdAt', sessions.created_at,
    'finalizedAt', sessions.finalized_at,
    'networkId', sessions.network_id,
    'networkName', sessions.network_name,
    'networkCode', sessions.network_code,
    'responsibleName', sessions.responsible_name,
    'finalizedByName', case
      when sessions.finalized_at is null then null
      else sessions.finalized_by_name
    end,
    'total', totals.total,
    'present', totals.present,
    'absent', totals.absent,
    'unmarked', totals.unmarked,
    'percentage', case
      when totals.total = 0 then 0
      else round(totals.present * 100.0 / totals.total)::integer
    end,
    'people', coalesce((
      select jsonb_agg(jsonb_build_object(
        'profileId', people.profile_id,
        'fullName', people.full_name,
        'present', people.present,
        'cellName', people.cell_name,
        'leadershipRole', people.leadership_role
      ) order by people.full_name, people.profile_id)
      from people
    ), '[]'::jsonb)
  )
  from authorized_session as sessions
  cross join totals;
$$;

revoke execute on function public.create_supervision_attendance_session(text, date)
from public, anon;
revoke execute on function public.finalize_supervision_attendance_session(uuid, uuid[])
from public, anon;
revoke execute on function public.save_supervision_attendance_draft(uuid, uuid[])
from public, anon;
revoke execute on function public.update_supervision_attendance_entry(uuid, uuid, boolean)
from public, anon;
revoke execute on function public.get_supervision_attendance_overview()
from public, anon;
revoke execute on function public.get_supervision_attendance_session(uuid)
from public, anon;

grant execute on function public.create_supervision_attendance_session(text, date)
to authenticated;
grant execute on function public.finalize_supervision_attendance_session(uuid, uuid[])
to authenticated;
grant execute on function public.save_supervision_attendance_draft(uuid, uuid[])
to authenticated;
grant execute on function public.update_supervision_attendance_entry(uuid, uuid, boolean)
to authenticated;
grant execute on function public.get_supervision_attendance_overview()
to authenticated;
grant execute on function public.get_supervision_attendance_session(uuid)
to authenticated;

comment on table public.supervision_attendance_sessions is
  'Supervision attendance calls for RJ and H.M, independent from the weekly checklist.';
comment on table public.supervision_attendance_entries is
  'Roster snapshot and attendance result for each supervision call.';

commit;
