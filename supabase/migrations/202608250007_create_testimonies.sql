begin;

create function public.current_sao_paulo_week_start(
  reference_time timestamptz default statement_timestamp()
)
returns date
language sql
stable
set search_path = ''
as $function$
  select (
    (reference_time at time zone 'America/Sao_Paulo')::date
    - (
        extract(
          isodow from reference_time at time zone 'America/Sao_Paulo'
        )::integer - 1
      )
  )::date;
$function$;

revoke execute on function public.current_sao_paulo_week_start(timestamptz)
from public, anon;
grant execute on function public.current_sao_paulo_week_start(timestamptz)
to authenticated;

create function public.can_moderate_testimonies()
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
  select exists (
    select 1
    from public.profiles
    where profiles.id = (select auth.uid())
      and profiles.is_active = true
      and (
        profiles.global_role = 'administrator'
        or profiles.is_supervisor = true
      )
  );
$function$;

revoke execute on function public.can_moderate_testimonies()
from public, anon;
grant execute on function public.can_moderate_testimonies()
to authenticated;

create table public.testimonies (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null default auth.uid()
    references public.profiles (id) on delete cascade,
  content text not null,
  week_start date not null default public.current_sao_paulo_week_start(),
  created_at timestamptz not null default statement_timestamp(),
  constraint testimonies_content_check check (
    content = btrim(content)
    and char_length(content) between 1 and 2000
  ),
  constraint testimonies_author_week_unique unique (author_id, week_start)
);

create index testimonies_feed_idx
on public.testimonies (created_at desc, id desc);

create table public.testimony_reactions (
  testimony_id uuid not null
    references public.testimonies (id) on delete cascade,
  user_id uuid not null default auth.uid()
    references public.profiles (id) on delete cascade,
  reaction_type text not null
    check (reaction_type in ('amen', 'like')),
  created_at timestamptz not null default statement_timestamp(),
  constraint testimony_reactions_unique
    unique (testimony_id, user_id, reaction_type)
);

create index testimony_reactions_counts_idx
on public.testimony_reactions (testimony_id, reaction_type);

alter table public.testimonies enable row level security;
alter table public.testimony_reactions enable row level security;

revoke all on table public.testimonies from anon, authenticated;
revoke all on table public.testimony_reactions from anon, authenticated;

grant select, delete on table public.testimonies to authenticated;
grant insert (content) on table public.testimonies to authenticated;
grant select, delete on table public.testimony_reactions to authenticated;
grant insert (testimony_id, reaction_type)
on table public.testimony_reactions to authenticated;

create policy "Active users can read testimonies"
on public.testimonies
for select
to authenticated
using ((select public.is_active_user()));

create policy "Active users can publish one testimony in the current week"
on public.testimonies
for insert
to authenticated
with check (
  (select public.is_active_user())
  and author_id = (select auth.uid())
  and week_start = (select public.current_sao_paulo_week_start())
);

create policy "Supervisors and administrators can delete testimonies"
on public.testimonies
for delete
to authenticated
using ((select public.can_moderate_testimonies()));

create policy "Active users can read testimony reactions"
on public.testimony_reactions
for select
to authenticated
using ((select public.is_active_user()));

create policy "Active users can add their own testimony reactions"
on public.testimony_reactions
for insert
to authenticated
with check (
  (select public.is_active_user())
  and user_id = (select auth.uid())
);

create policy "Active users can remove their own testimony reactions"
on public.testimony_reactions
for delete
to authenticated
using (
  (select public.is_active_user())
  and user_id = (select auth.uid())
);

create function public.toggle_testimony_reaction(
  target_testimony_id uuid,
  target_reaction_type text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $function$
declare
  reaction_removed boolean;
begin
  if not (select public.is_active_user()) then
    raise exception 'TESTIMONY_REACTION_FORBIDDEN' using errcode = '42501';
  end if;

  if target_reaction_type not in ('amen', 'like') then
    raise exception 'TESTIMONY_REACTION_INVALID' using errcode = '22023';
  end if;

  if not exists (
    select 1
    from public.testimonies
    where testimonies.id = target_testimony_id
  ) then
    raise exception 'TESTIMONY_NOT_FOUND' using errcode = 'P0002';
  end if;

  delete from public.testimony_reactions
  where testimony_reactions.testimony_id = target_testimony_id
    and testimony_reactions.user_id = (select auth.uid())
    and testimony_reactions.reaction_type = target_reaction_type;

  reaction_removed := found;

  if reaction_removed then
    return false;
  end if;

  insert into public.testimony_reactions (
    testimony_id,
    user_id,
    reaction_type
  )
  values (
    target_testimony_id,
    (select auth.uid()),
    target_reaction_type
  )
  on conflict (testimony_id, user_id, reaction_type) do nothing;

  return true;
end;
$function$;

revoke execute on function public.toggle_testimony_reaction(uuid, text)
from public, anon;
grant execute on function public.toggle_testimony_reaction(uuid, text)
to authenticated;

create function public.get_testimonies_feed(
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
  scoped_rows as materialized (
    select testimonies.*
    from public.testimonies
    cross join viewer
    where
      target_cursor_created_at is null
      or target_cursor_id is null
      or (testimonies.created_at, testimonies.id)
        < (target_cursor_created_at, target_cursor_id)
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
        where testimonies.author_id = (select id from viewer)
          and testimonies.week_start = public.current_sao_paulo_week_start()
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

comment on table public.testimonies is
  'Simple weekly testimony records. Author identity and current organization are read through relations.';
comment on table public.testimony_reactions is
  'Independent Amen and like reactions, limited to one of each type per user and testimony.';
comment on function public.get_testimonies_feed(timestamptz, uuid, integer) is
  'Returns one cursor-paginated testimony page with relational author context, aggregate counts and viewer reactions.';
comment on function public.toggle_testimony_reaction(uuid, text) is
  'Atomically adds or removes the authenticated active user reaction.';

commit;
