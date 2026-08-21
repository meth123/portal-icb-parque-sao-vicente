begin;

alter table public.profiles
  add column if not exists must_change_password boolean not null default false;

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
        'globalRole', viewer.global_role,
        'isSupervisor', viewer.is_supervisor,
        'canManageCells', viewer.can_manage_cells,
        'isActive', viewer.is_active,
        'mustChangePassword', viewer.must_change_password,
        'currentCellId', current_assignment.cell_id,
        'currentLeadershipRole', current_assignment.role,
        'hasDocumentLibraryAccess',
          viewer.is_active and (
            viewer.global_role in ('administrator', 'pastor')
            or viewer.is_supervisor = true
            or current_assignment.cell_id is not null
          ),
        'canManageDocumentLibrary',
          viewer.is_active and viewer.global_role in ('administrator', 'pastor')
      )
      from viewer
      left join current_assignment on true
    )
  end;
$function$;

create or replace function public.complete_password_change()
returns void
language plpgsql
security definer
set search_path = ''
as $function$
begin
  if (select auth.uid()) is null then
    raise exception 'AUTHENTICATION_REQUIRED' using errcode = '42501';
  end if;

  update public.profiles
  set must_change_password = false
  where id = (select auth.uid());
end;
$function$;

revoke execute on function public.complete_password_change() from public, anon;
grant execute on function public.complete_password_change() to authenticated;

commit;
