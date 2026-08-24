begin;

create or replace function public.get_institution_first_time_guests_history()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with
  viewer as (
    select profiles.id
    from public.profiles
    where profiles.id = (select auth.uid())
      and profiles.is_active = true
  ),
  current_versions as materialized (
    select
      versions.id,
      versions.report_id,
      versions.meeting_on,
      versions.first_time_guests_count
    from public.cell_report_versions as versions
    where versions.is_current = true
      and exists (select 1 from viewer)
  ),
  monthly_totals as materialized (
    select
      date_trunc('month', current_versions.meeting_on)::date as month_start,
      sum(current_versions.first_time_guests_count)::bigint as monthly_total
    from current_versions
    group by date_trunc('month', current_versions.meeting_on)::date
  ),
  calendar_months as (
    select generate_series(
      (select min(monthly_totals.month_start) from monthly_totals),
      greatest(
        (select max(monthly_totals.month_start) from monthly_totals),
        date_trunc(
          'month',
          timezone('America/Sao_Paulo', statement_timestamp())
        )::date
      ),
      interval '1 month'
    )::date as month_start
  ),
  monthly_history as (
    select
      calendar_months.month_start,
      coalesce(monthly_totals.monthly_total, 0)::bigint as monthly_total
    from calendar_months
    left join monthly_totals
      on monthly_totals.month_start = calendar_months.month_start
  ),
  report_networks as materialized (
    select
      current_versions.id as version_id,
      current_versions.first_time_guests_count,
      networks.id as network_id,
      networks.name as network_name,
      networks.code as network_code
    from current_versions
    join public.cell_reports as reports
      on reports.id = current_versions.report_id
    join lateral (
      select classifications.cell_type_id
      from public.cell_classifications as classifications
      where classifications.cell_id = reports.cell_id
        and classifications.starts_on <= current_versions.meeting_on
        and (
          classifications.ends_on is null
          or classifications.ends_on >= current_versions.meeting_on
        )
      order by classifications.starts_on desc
      limit 1
    ) as classification_at_meeting on true
    join public.cell_types as cell_types
      on cell_types.id = classification_at_meeting.cell_type_id
    join public.networks as networks
      on networks.id = cell_types.network_id
  ),
  network_totals as (
    select
      networks.id as network_id,
      networks.name as network_name,
      networks.code as network_code,
      coalesce(sum(report_networks.first_time_guests_count), 0)::bigint as total
    from public.networks as networks
    left join report_networks
      on report_networks.network_id = networks.id
    where networks.code in ('RJ', 'H.M')
    group by networks.id, networks.name, networks.code
  ),
  history as (
    select
      coalesce(
        (select sum(monthly_totals.monthly_total) from monthly_totals),
        0
      )::bigint as accumulated_total,
      coalesce(
        jsonb_agg(
          jsonb_build_object(
            'monthStart', monthly_history.month_start,
            'total', monthly_history.monthly_total
          )
          order by monthly_history.month_start desc
        ) filter (where monthly_history.month_start is not null),
        '[]'::jsonb
      ) as months
    from monthly_history
  )
  select case
    when not exists (select 1 from viewer) then null
    else jsonb_build_object(
      'accumulatedTotal', history.accumulated_total,
      'months', history.months,
      'networkTotals', coalesce(
        (
          select jsonb_agg(
            jsonb_build_object(
              'networkId', network_totals.network_id,
              'networkName', network_totals.network_name,
              'networkCode', network_totals.network_code,
              'total', network_totals.total
            )
            order by case network_totals.network_code
              when 'RJ' then 1
              when 'H.M' then 2
              else 3
            end
          )
          from network_totals
        ),
        '[]'::jsonb
      )
    )
  end
  from history;
$$;

revoke execute on function public.get_institution_first_time_guests_history()
from public, anon, authenticated;

grant execute on function public.get_institution_first_time_guests_history()
to authenticated;

comment on function public.get_institution_first_time_guests_history() is
  'Returns institution-wide monthly, accumulated, and RJ/H.M first-time guest totals from current report versions to active authenticated accounts.';

commit;
