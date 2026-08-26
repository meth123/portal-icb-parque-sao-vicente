create table public.push_notification_events (
  event_key text primary key,
  event_type text not null,
  event_date date not null,
  week_ends_on date not null,
  title text not null,
  message text not null,
  destination text not null,
  status text not null default 'processing',
  sent_count integer not null default 0,
  failed_count integer not null default 0,
  invalid_count integer not null default 0,
  last_error text,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint push_notification_events_type_check
    check (event_type in (
      'weekly-form-last-day',
      'checklist-open',
      'checklist-last-day'
    )),
  constraint push_notification_events_status_check
    check (status in ('processing', 'completed', 'failed')),
  constraint push_notification_events_key_length
    check (char_length(event_key) between 1 and 80),
  constraint push_notification_events_destination_internal
    check (destination like '/portal%'),
  constraint push_notification_events_counts_nonnegative
    check (sent_count >= 0 and failed_count >= 0 and invalid_count >= 0)
);

create index push_notification_events_date_idx
on public.push_notification_events (event_date desc, status);

create trigger set_push_notification_events_updated_at
before update on public.push_notification_events
for each row execute procedure public.set_updated_at();

alter table public.push_notification_events enable row level security;

revoke all on table public.push_notification_events from public, anon, authenticated;
grant all on table public.push_notification_events to service_role;
