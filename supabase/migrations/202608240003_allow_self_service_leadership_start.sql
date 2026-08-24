begin;

-- The general leadership start is personal historical information. Users may
-- correct their own date, while cell assignments and their dates remain under
-- the existing administrative policies.
grant update (leadership_started_on)
on table public.profiles
to authenticated;

comment on column public.profiles.leadership_started_on is
  'Optional date when the person first began any leadership activity; editable by the profile owner and independent of cell assignments.';

commit;
