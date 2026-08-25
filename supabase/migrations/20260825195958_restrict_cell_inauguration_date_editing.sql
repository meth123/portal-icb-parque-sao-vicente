begin;

create or replace function public.update_own_cell_started_on(
  target_cell_id uuid,
  target_started_on date
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_profile_id uuid := (select auth.uid());
  previous_started_on date;
  current_local_date date := (now() at time zone 'America/Sao_Paulo')::date;
begin
  if target_cell_id is null
    or target_started_on > current_local_date
  then
    raise exception 'CELL_INAUGURATION_DATE_INVALID';
  end if;

  select cell.started_on
  into previous_started_on
  from public.cells as cell
  where cell.id = target_cell_id
    and cell.is_active = true
    and exists (
      select 1
      from public.profiles as profile
      where profile.id = actor_profile_id
        and profile.is_active = true
        and profile.must_change_password = false
        and (
          profile.global_role in ('administrator', 'pastor')
          or profile.is_supervisor = true
          or exists (
            select 1
            from public.cell_leaderships as leadership
            where leadership.cell_id = cell.id
              and leadership.profile_id = actor_profile_id
              and leadership.ends_on is null
              and leadership.role = 'leader'
          )
        )
    )
  for update of cell;

  if not found then
    raise exception 'CELL_INAUGURATION_DATE_FORBIDDEN'
      using errcode = '42501';
  end if;

  update public.cells
  set started_on = target_started_on
  where id = target_cell_id;

  insert into public.admin_operation_audits (
    actor_profile_id,
    action,
    target_type,
    target_id,
    metadata
  )
  values (
    actor_profile_id,
    'cell.inauguration_date.update',
    'cell',
    target_cell_id,
    jsonb_build_object(
      'previous_started_on', previous_started_on,
      'started_on', target_started_on
    )
  );
end;
$$;

revoke execute on function public.update_own_cell_started_on(uuid, date)
from public, anon;
grant execute on function public.update_own_cell_started_on(uuid, date)
to authenticated;

comment on function public.update_own_cell_started_on(uuid, date) is
  'Allows the current cell leader, supervisors, pastors and administrators to correct a cell inauguration date. Vice-leaders are not authorized.';

commit;
