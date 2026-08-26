create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  user_agent text,
  is_active boolean not null default true,
  failure_count integer not null default 0,
  last_success_at timestamptz,
  last_failure_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint push_subscriptions_endpoint_unique unique (endpoint),
  constraint push_subscriptions_endpoint_length
    check (char_length(endpoint) between 1 and 4096),
  constraint push_subscriptions_p256dh_length
    check (char_length(p256dh) between 1 and 512),
  constraint push_subscriptions_auth_length
    check (char_length(auth) between 1 and 512),
  constraint push_subscriptions_user_agent_length
    check (user_agent is null or char_length(user_agent) <= 512),
  constraint push_subscriptions_failure_count_nonnegative
    check (failure_count >= 0)
);

create index push_subscriptions_active_user_idx
on public.push_subscriptions (user_id, updated_at desc)
where is_active = true;

create trigger set_push_subscriptions_updated_at
before update on public.push_subscriptions
for each row execute procedure public.set_updated_at();

alter table public.push_subscriptions enable row level security;

revoke all on table public.push_subscriptions from public, anon;
grant select, insert, update, delete on table public.push_subscriptions to authenticated;
grant all on table public.push_subscriptions to service_role;

create policy "Users can read their own push subscriptions"
on public.push_subscriptions
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "Active users can create their own push subscriptions"
on public.push_subscriptions
for insert
to authenticated
with check (
  (select auth.uid()) = user_id
  and (select public.is_active_user())
);

create policy "Active users can update their own push subscriptions"
on public.push_subscriptions
for update
to authenticated
using ((select auth.uid()) = user_id)
with check (
  (select auth.uid()) = user_id
  and (select public.is_active_user())
);

create policy "Users can delete their own push subscriptions"
on public.push_subscriptions
for delete
to authenticated
using ((select auth.uid()) = user_id);
