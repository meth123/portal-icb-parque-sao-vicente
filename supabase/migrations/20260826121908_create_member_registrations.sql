begin;

create table public.member_registrations (
  id uuid primary key default gen_random_uuid(),
  submitted_by uuid not null default auth.uid()
    references public.profiles (id) on delete restrict,
  full_name text not null,
  photo_bucket_id text not null default 'member-photos'
    check (photo_bucket_id = 'member-photos'),
  photo_object_path text not null unique,
  birth_date date not null,
  rg text not null,
  address_street text not null,
  address_number text not null,
  neighborhood text not null,
  city text not null,
  postal_code text not null,
  baptism_date date not null,
  network text not null,
  discipler_name text not null,
  whatsapp text not null,
  created_at timestamptz not null default statement_timestamp(),
  constraint member_registrations_full_name_check check (
    full_name = btrim(full_name)
    and char_length(full_name) between 2 and 160
  ),
  constraint member_registrations_photo_path_check check (
    photo_object_path ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(jpg|jpeg|png|webp)$'
  ),
  constraint member_registrations_birth_date_check check (
    birth_date between date '1900-01-01' and current_date
  ),
  constraint member_registrations_rg_check check (
    rg = btrim(rg) and char_length(rg) between 4 and 30
  ),
  constraint member_registrations_address_street_check check (
    address_street = btrim(address_street)
    and char_length(address_street) between 2 and 180
  ),
  constraint member_registrations_address_number_check check (
    address_number = btrim(address_number)
    and char_length(address_number) between 1 and 30
  ),
  constraint member_registrations_neighborhood_check check (
    neighborhood = btrim(neighborhood)
    and char_length(neighborhood) between 2 and 100
  ),
  constraint member_registrations_city_check check (
    city = btrim(city) and char_length(city) between 2 and 100
  ),
  constraint member_registrations_postal_code_check check (
    postal_code ~ '^[0-9]{8}$'
  ),
  constraint member_registrations_baptism_date_check check (
    baptism_date between date '1900-01-01' and current_date
  ),
  constraint member_registrations_network_check check (
    network in ('homens', 'mulheres', 'rapazes', 'mocas')
  ),
  constraint member_registrations_discipler_name_check check (
    discipler_name = btrim(discipler_name)
    and char_length(discipler_name) between 2 and 160
  ),
  constraint member_registrations_whatsapp_check check (
    whatsapp ~ '^[0-9]{10,13}$'
  )
);

create index member_registrations_created_at_idx
on public.member_registrations (created_at desc, id desc);

create index member_registrations_full_name_idx
on public.member_registrations (lower(full_name));

alter table public.member_registrations enable row level security;

revoke all on table public.member_registrations from anon, authenticated;
grant select on table public.member_registrations to authenticated;
grant insert (
  full_name,
  photo_object_path,
  birth_date,
  rg,
  address_street,
  address_number,
  neighborhood,
  city,
  postal_code,
  baptism_date,
  network,
  discipler_name,
  whatsapp
) on table public.member_registrations to authenticated;

create policy "Pastoral team can read member registrations"
on public.member_registrations
for select
to authenticated
using ((select public.is_administrator()));

create policy "Active users can submit member registrations"
on public.member_registrations
for insert
to authenticated
with check (
  (select public.is_active_user())
  and submitted_by = (select auth.uid())
  and split_part(photo_object_path, '/', 1) = (select auth.uid()::text)
);

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'member-photos',
  'member-photos',
  false,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp']::text[]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "Active users can upload member photos"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'member-photos'
  and (select public.is_active_user())
  and (storage.foldername(name))[1] = (select auth.uid()::text)
  and name ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(jpg|jpeg|png|webp)$'
);

create policy "Pastoral team can read member photos"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'member-photos'
  and (select public.is_administrator())
  and exists (
    select 1
    from public.member_registrations
    where member_registrations.photo_bucket_id = storage.objects.bucket_id
      and member_registrations.photo_object_path = storage.objects.name
  )
);

comment on table public.member_registrations is
  'Private membership forms submitted by authenticated active portal users and visible only to Supervisors, Pastors, and Administrators.';

commit;
