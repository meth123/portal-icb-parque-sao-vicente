begin;

-- Clear only checklist answers tied to temporary leadership rows.
delete from public.weekly_leadership_checkins
where cell_leadership_id in (
  '7e570002-0827-4000-8000-000000000001'::uuid,
  '7e570016-0827-4000-8000-000000000001'::uuid,
  '7e570016-0827-4000-8000-000000000002'::uuid,
  '7e570016-0827-4000-8000-000000000003'::uuid,
  '7e570016-0827-4000-8000-000000000004'::uuid,
  '7e570016-0827-4000-8000-000000000005'::uuid
);

-- Remove the five temporary testimonies created by this fixture.
delete from public.testimony_reactions
where testimony_id in (
  '7e570020-0827-4000-8000-000000000001'::uuid,
  '7e570020-0827-4000-8000-000000000002'::uuid,
  '7e570020-0827-4000-8000-000000000003'::uuid,
  '7e570020-0827-4000-8000-000000000004'::uuid,
  '7e570020-0827-4000-8000-000000000005'::uuid
);

delete from public.testimonies
where id in (
  '7e570020-0827-4000-8000-000000000001'::uuid,
  '7e570020-0827-4000-8000-000000000002'::uuid,
  '7e570020-0827-4000-8000-000000000003'::uuid,
  '7e570020-0827-4000-8000-000000000004'::uuid,
  '7e570020-0827-4000-8000-000000000005'::uuid
);

-- Remove the temporary Ficha and its 48 first-time guest rows.
delete from public.cell_report_evangelism_leadership_participants p
using public.cell_report_evangelism_entries e
join public.cell_report_versions v on v.id = e.report_version_id
join public.cell_reports r on r.id = v.report_id
where p.evangelism_entry_id = e.id
  and r.cell_id = '7e570012-0827-4000-8000-000000000001'::uuid;

delete from public.cell_report_evangelism_participants p
using public.cell_report_evangelism_entries e
join public.cell_report_versions v on v.id = e.report_version_id
join public.cell_reports r on r.id = v.report_id
where p.evangelism_entry_id = e.id
  and r.cell_id = '7e570012-0827-4000-8000-000000000001'::uuid;

delete from public.cell_report_evangelism_entries e
using public.cell_report_versions v
join public.cell_reports r on r.id = v.report_id
where e.report_version_id = v.id
  and r.cell_id = '7e570012-0827-4000-8000-000000000001'::uuid;

delete from public.cell_report_vice_presences p
using public.cell_report_versions v
join public.cell_reports r on r.id = v.report_id
where p.report_version_id = v.id
  and r.cell_id = '7e570012-0827-4000-8000-000000000001'::uuid;

delete from public.cell_report_member_entries p
using public.cell_report_versions v
join public.cell_reports r on r.id = v.report_id
where p.report_version_id = v.id
  and r.cell_id = '7e570012-0827-4000-8000-000000000001'::uuid;

delete from public.cell_report_guest_entries p
using public.cell_report_versions v
join public.cell_reports r on r.id = v.report_id
where p.report_version_id = v.id
  and r.cell_id = '7e570012-0827-4000-8000-000000000001'::uuid;

delete from public.cell_report_monthly_responsibilities
where cell_id = '7e570012-0827-4000-8000-000000000001'::uuid;

delete from public.cell_report_versions v
using public.cell_reports r
where v.report_id = r.id
  and r.cell_id = '7e570012-0827-4000-8000-000000000001'::uuid;

delete from public.cell_reports
where cell_id = '7e570012-0827-4000-8000-000000000001'::uuid;

delete from public.cell_leaderships
where id in (
  '7e570002-0827-4000-8000-000000000001'::uuid,
  '7e570016-0827-4000-8000-000000000001'::uuid,
  '7e570016-0827-4000-8000-000000000002'::uuid,
  '7e570016-0827-4000-8000-000000000003'::uuid,
  '7e570016-0827-4000-8000-000000000004'::uuid,
  '7e570016-0827-4000-8000-000000000005'::uuid
);

delete from public.cell_locations
where id = '7e570015-0827-4000-8000-000000000001'::uuid;

delete from public.cell_schedules
where id = '7e570014-0827-4000-8000-000000000001'::uuid;

delete from public.cell_classifications
where id in (
  '7e570001-0827-4000-8000-000000000001'::uuid,
  '7e570013-0827-4000-8000-000000000001'::uuid
);

delete from public.cells
where id = '7e570012-0827-4000-8000-000000000001'::uuid;

delete from public.cell_types
where id = '7e570011-0827-4000-8000-000000000001'::uuid;

-- Restore the production checklist functions exactly to their pre-test rules.
create or replace function public.submit_weekly_leadership_checkin(
  target_prayed_in_group boolean,
  target_fasted_for_cell boolean
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_profile_id uuid := (select auth.uid());
  current_local_date date := (now() at time zone 'America/Sao_Paulo')::date;
  current_iso_weekday integer := extract(
    isodow from (now() at time zone 'America/Sao_Paulo')
  )::integer;
  current_monday date;
  target_week_starts_on date;
  target_week_ends_on date;
  target_leadership_id uuid;
begin
  if current_profile_id is null or not exists (
    select 1
    from public.profiles
    where profiles.id = current_profile_id
      and profiles.is_active = true
      and profiles.global_role = 'user'
  ) then
    raise exception 'WEEKLY_CHECKIN_FORBIDDEN'
      using errcode = '42501';
  end if;

  if target_prayed_in_group is null or target_fasted_for_cell is null then
    raise exception 'WEEKLY_CHECKIN_INVALID';
  end if;

  if current_iso_weekday not between 1 and 3 then
    raise exception 'WEEKLY_CHECKIN_CLOSED';
  end if;

  current_monday := current_local_date - (current_iso_weekday - 1);
  target_week_starts_on := current_monday - 7;
  target_week_ends_on := current_monday - 1;

  select cell_leaderships.id
  into target_leadership_id
  from public.cell_leaderships
  where cell_leaderships.profile_id = current_profile_id
    and cell_leaderships.starts_on <= target_week_ends_on
    and (
      cell_leaderships.ends_on is null
      or cell_leaderships.ends_on > target_week_ends_on
    )
  order by cell_leaderships.starts_on desc
  limit 1;

  if target_leadership_id is null then
    raise exception 'WEEKLY_CHECKIN_LEADERSHIP_NOT_FOUND';
  end if;

  insert into public.weekly_leadership_checkins (
    week_starts_on,
    cell_leadership_id,
    prayed_in_group,
    fasted_for_cell,
    submitted_at
  ) values (
    target_week_starts_on,
    target_leadership_id,
    target_prayed_in_group,
    target_fasted_for_cell,
    now()
  )
  on conflict (week_starts_on, cell_leadership_id)
  do update set
    prayed_in_group = excluded.prayed_in_group,
    fasted_for_cell = excluded.fasted_for_cell,
    submitted_at = now();
end;
$$;

create or replace function public.protect_closed_weekly_leadership_checkin()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_week_starts_on date := case
    when tg_op = 'DELETE' then old.week_starts_on
    else new.week_starts_on
  end;
  target_closes_at timestamptz :=
    (target_week_starts_on + 10)::timestamp
      at time zone 'America/Sao_Paulo';
begin
  if tg_op = 'UPDATE' and (
    new.week_starts_on is distinct from old.week_starts_on
    or new.cell_leadership_id is distinct from old.cell_leadership_id
  ) then
    raise exception 'WEEKLY_CHECKIN_IDENTITY_IMMUTABLE';
  end if;

  if statement_timestamp() >= target_closes_at then
    raise exception 'WEEKLY_CHECKIN_CLOSED';
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;

  return new;
end;
$$;

revoke execute on function public.submit_weekly_leadership_checkin(boolean, boolean)
from public, anon, authenticated;
grant execute on function public.submit_weekly_leadership_checkin(boolean, boolean)
to authenticated;
revoke execute on function public.protect_closed_weekly_leadership_checkin()
from public, anon, authenticated;

do $$
begin
  if exists (
    select 1
    from public.cell_leaderships
    where id in (
      '7e570002-0827-4000-8000-000000000001'::uuid,
      '7e570016-0827-4000-8000-000000000001'::uuid,
      '7e570016-0827-4000-8000-000000000002'::uuid,
      '7e570016-0827-4000-8000-000000000003'::uuid,
      '7e570016-0827-4000-8000-000000000004'::uuid,
      '7e570016-0827-4000-8000-000000000005'::uuid
    )
  ) or exists (
    select 1
    from public.cells
    where id = '7e570012-0827-4000-8000-000000000001'::uuid
  ) or exists (
    select 1
    from public.cell_classifications
    where id in (
      '7e570001-0827-4000-8000-000000000001'::uuid,
      '7e570013-0827-4000-8000-000000000001'::uuid
    )
  ) then
    raise exception 'TEMP_FIXTURE_CLEANUP_INCOMPLETE';
  end if;
end
$$;

commit;

-- After this SQL commits, run temporary_20260827_delete_test_users.mjs.
