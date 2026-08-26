begin;

create or replace function public.can_manage_supervision_attendance()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles
    where profiles.id = (select auth.uid())
      and profiles.is_active = true
      and profiles.must_change_password = false
      and (
        profiles.global_role in ('administrator', 'pastor')
        or profiles.is_supervisor = true
      )
  );
$$;

revoke execute on function public.can_manage_supervision_attendance()
from public, anon;
grant execute on function public.can_manage_supervision_attendance()
to authenticated;

comment on function public.can_manage_supervision_attendance() is
  'Allows supervision attendance access only to active supervisors, pastors, and administrators.';

commit;
