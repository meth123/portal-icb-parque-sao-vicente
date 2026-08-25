begin;

with ranked_reactions as (
  select
    testimony_reactions.ctid,
    row_number() over (
      partition by
        testimony_reactions.testimony_id,
        testimony_reactions.user_id
      order by
        testimony_reactions.created_at desc,
        testimony_reactions.reaction_type,
        testimony_reactions.ctid desc
    ) as reaction_position
  from public.testimony_reactions
)
delete from public.testimony_reactions
using ranked_reactions
where testimony_reactions.ctid = ranked_reactions.ctid
  and ranked_reactions.reaction_position > 1;

alter table public.testimony_reactions
  drop constraint testimony_reactions_unique;

alter table public.testimony_reactions
  add constraint testimony_reactions_unique
  unique (testimony_id, user_id);

create or replace function public.toggle_testimony_reaction(
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
  on conflict (testimony_id, user_id) do update
  set
    reaction_type = excluded.reaction_type,
    created_at = statement_timestamp();

  return true;
end;
$function$;

revoke execute on function public.toggle_testimony_reaction(uuid, text)
from public, anon;
grant execute on function public.toggle_testimony_reaction(uuid, text)
to authenticated;

comment on table public.testimony_reactions is
  'Exclusive Amen or like reaction, limited to one reaction per user and testimony.';

comment on function public.toggle_testimony_reaction(uuid, text) is
  'Atomically adds, switches or removes the authenticated active user reaction.';

commit;
