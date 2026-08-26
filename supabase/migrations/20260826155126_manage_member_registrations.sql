begin;

grant update (
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

grant delete on table public.member_registrations to authenticated;

create policy "Pastoral team can update member registrations"
on public.member_registrations
for update
to authenticated
using ((select public.is_administrator()))
with check ((select public.is_administrator()));

create policy "Pastoral team can delete member registrations"
on public.member_registrations
for delete
to authenticated
using ((select public.is_administrator()));

commit;
