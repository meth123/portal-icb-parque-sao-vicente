begin;

create index member_registrations_submitted_by_idx
on public.member_registrations (submitted_by);

commit;
