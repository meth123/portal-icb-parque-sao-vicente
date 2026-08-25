begin;

alter table public.testimonies
  drop constraint if exists testimonies_author_week_unique;

alter table public.testimonies
  add column if not exists month_start date;

update public.testimonies
set month_start = date_trunc(
  'month',
  created_at at time zone 'America/Sao_Paulo'
)::date
where month_start is null;

alter table public.testimonies
  alter column month_start set default date_trunc(
    'month',
    statement_timestamp() at time zone 'America/Sao_Paulo'
  )::date,
  alter column month_start set not null;

alter table public.testimonies
  drop constraint if exists testimonies_month_start_check,
  drop constraint if exists testimonies_author_week_month_unique,
  add constraint testimonies_month_start_check
    check (extract(day from month_start) = 1),
  add constraint testimonies_author_week_month_unique
    unique (author_id, week_start, month_start);

create or replace function public.get_testimonies_feed(
  target_cursor_created_at timestamptz default null,
  target_cursor_id uuid default null,
  target_page_size integer default 12
)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $function$
  with
  viewer as materialized (
    select
      profiles.id,
      profiles.global_role,
      profiles.is_supervisor
    from public.profiles
    where profiles.id = (select auth.uid())
      and profiles.is_active = true
  ),
  bounds as (
    select least(greatest(coalesce(target_page_size, 12), 1), 15) as page_size
  ),
  month_bounds as materialized (
    select
      date_trunc(
        'month',
        statement_timestamp() at time zone 'America/Sao_Paulo'
      )::date as starts_on,
      date_trunc(
        'month',
        statement_timestamp() at time zone 'America/Sao_Paulo'
      ) at time zone 'America/Sao_Paulo' as starts_at,
      (
        date_trunc(
          'month',
          statement_timestamp() at time zone 'America/Sao_Paulo'
        ) + interval '1 month'
      ) at time zone 'America/Sao_Paulo' as ends_before
  ),
  scoped_rows as materialized (
    select testimonies.*
    from public.testimonies
    cross join viewer
    cross join month_bounds
    where testimonies.created_at >= month_bounds.starts_at
      and testimonies.created_at < month_bounds.ends_before
      and (
        target_cursor_created_at is null
        or target_cursor_id is null
        or (testimonies.created_at, testimonies.id)
          < (target_cursor_created_at, target_cursor_id)
      )
    order by testimonies.created_at desc, testimonies.id desc
    limit (select page_size + 1 from bounds)
  ),
  page_rows as materialized (
    select scoped_rows.*
    from scoped_rows
    order by scoped_rows.created_at desc, scoped_rows.id desc
    limit (select page_size from bounds)
  ),
  reaction_summary as materialized (
    select
      reactions.testimony_id,
      count(*) filter (
        where reactions.reaction_type = 'amen'
      )::integer as amen_count,
      count(*) filter (
        where reactions.reaction_type = 'like'
      )::integer as like_count,
      bool_or(
        reactions.user_id = (select auth.uid())
        and reactions.reaction_type = 'amen'
      ) as viewer_amen,
      bool_or(
        reactions.user_id = (select auth.uid())
        and reactions.reaction_type = 'like'
      ) as viewer_like
    from public.testimony_reactions as reactions
    join page_rows on page_rows.id = reactions.testimony_id
    group by reactions.testimony_id
  ),
  feed_items as materialized (
    select
      page_rows.id,
      page_rows.content,
      page_rows.created_at,
      coalesce(profiles.full_name, 'Usuário') as author_name,
      case
        when profiles.global_role = 'administrator' then 'Administrador'
        when profiles.global_role = 'pastor' then 'Pastor'
        when profiles.is_supervisor = true then 'Supervisor'
        when current_assignment.role = 'leader' then 'Líder'
        when current_assignment.role = 'vice_leader' then 'Vice-líder'
        else 'Membro'
      end as author_role_label,
      current_assignment.cell_name as author_cell_name,
      coalesce(reaction_summary.amen_count, 0) as amen_count,
      coalesce(reaction_summary.like_count, 0) as like_count,
      coalesce(reaction_summary.viewer_amen, false) as viewer_amen,
      coalesce(reaction_summary.viewer_like, false) as viewer_like
    from page_rows
    join public.profiles on profiles.id = page_rows.author_id
    left join lateral (
      select leaderships.role, cells.name as cell_name
      from public.cell_leaderships as leaderships
      join public.cells on cells.id = leaderships.cell_id
      where leaderships.profile_id = page_rows.author_id
        and leaderships.ends_on is null
      order by leaderships.starts_on desc, leaderships.id desc
      limit 1
    ) as current_assignment on true
    left join reaction_summary
      on reaction_summary.testimony_id = page_rows.id
  )
  select case
    when not exists (select 1 from viewer) then null
    else jsonb_build_object(
      'items', coalesce((
        select jsonb_agg(
          jsonb_build_object(
            'id', feed_items.id,
            'content', feed_items.content,
            'createdAt', feed_items.created_at,
            'authorName', feed_items.author_name,
            'authorRoleLabel', feed_items.author_role_label,
            'authorCellName', feed_items.author_cell_name,
            'amenCount', feed_items.amen_count,
            'likeCount', feed_items.like_count,
            'viewerAmen', feed_items.viewer_amen,
            'viewerLike', feed_items.viewer_like
          )
          order by feed_items.created_at desc, feed_items.id desc
        )
        from feed_items
      ), '[]'::jsonb),
      'canPublish', not exists (
        select 1
        from public.testimonies
        cross join month_bounds
        where testimonies.author_id = (select id from viewer)
          and testimonies.week_start = public.current_sao_paulo_week_start()
          and testimonies.month_start = month_bounds.starts_on
      ),
      'canModerate', (
        select
          viewer.global_role = 'administrator'
          or viewer.is_supervisor = true
        from viewer
      ),
      'currentWeekStart', public.current_sao_paulo_week_start(),
      'hasMore', (
        select count(*) > (select page_size from bounds)
        from scoped_rows
      ),
      'nextCursorCreatedAt', case
        when (
          select count(*) > (select page_size from bounds)
          from scoped_rows
        ) then (
          select page_rows.created_at
          from page_rows
          order by page_rows.created_at, page_rows.id
          limit 1
        )
        else null
      end,
      'nextCursorId', case
        when (
          select count(*) > (select page_size from bounds)
          from scoped_rows
        ) then (
          select page_rows.id
          from page_rows
          order by page_rows.created_at, page_rows.id
          limit 1
        )
        else null
      end
    )
  end;
$function$;

revoke execute on function public.get_testimonies_feed(
  timestamptz, uuid, integer
)
from public, anon;
grant execute on function public.get_testimonies_feed(
  timestamptz, uuid, integer
)
to authenticated;

comment on function public.get_testimonies_feed(timestamptz, uuid, integer) is
  'Returns only the current Sao Paulo calendar month, so the visible testimony feed resets automatically at each month boundary.';

commit;
