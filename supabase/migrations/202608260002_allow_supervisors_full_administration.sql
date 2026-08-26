begin;

create or replace function public.is_administrator()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles
    where id = (select auth.uid())
      and is_active = true
      and must_change_password = false
      and (
        global_role in ('administrator', 'pastor')
        or is_supervisor = true
      )
  );
$$;

create or replace function public.can_manage_cells()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles
    where id = (select auth.uid())
      and is_active = true
      and must_change_password = false
      and (
        global_role in ('administrator', 'pastor')
        or is_supervisor = true
      )
  );
$$;

create or replace function public.can_manage_document_library()
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

do $migration$
declare
  target_function regprocedure;
  original_definition text;
  updated_definition text;
begin
  foreach target_function in array array[
    'public.create_cell_with_relationships(text,uuid,smallint,time without time zone,date,date,uuid,uuid,uuid[])'::regprocedure,
    'public.update_cell_leadership(uuid,text,date,uuid,uuid[])'::regprocedure,
    'public.update_cell_configuration(uuid,text,date,uuid,smallint,time without time zone,uuid,uuid,uuid[])'::regprocedure,
    'public.deactivate_cell(uuid,date)'::regprocedure,
    'public.reactivate_cell(uuid,date,uuid,smallint,time without time zone,uuid,uuid,uuid[])'::regprocedure,
    'public.get_admin_profile_directory()'::regprocedure,
    'public.get_cell_management_profile_directory()'::regprocedure,
    'public.update_admin_profile_access(uuid,text,boolean,boolean,boolean)'::regprocedure,
    'public.finalize_quick_user_registration(uuid,text,date,date,uuid,text,boolean)'::regprocedure
  ]
  loop
    select pg_get_functiondef(target_function::oid)
    into original_definition;

    updated_definition := regexp_replace(
      original_definition,
      $pattern$actor\.global_role = 'administrator'[[:space:]]+or \(actor\.global_role = 'pastor' and actor\.can_manage_cells = true\)$pattern$,
      $replacement$actor.global_role = 'administrator'
        or (actor.global_role = 'pastor' and actor.can_manage_cells = true)
        or actor.is_supervisor = true$replacement$,
      'g'
    );
    updated_definition := regexp_replace(
      updated_definition,
      $pattern$actor\.global_role in \('administrator', 'pastor'\)$pattern$,
      $replacement$(actor.global_role in ('administrator', 'pastor') or actor.is_supervisor = true)$replacement$,
      'g'
    );

    if updated_definition = original_definition then
      raise exception 'SUPERVISOR_ADMIN_GATE_NOT_FOUND: %', target_function;
    end if;

    execute updated_definition;
  end loop;
end;
$migration$;

revoke execute on function public.is_administrator() from public, anon;
grant execute on function public.is_administrator() to authenticated;
revoke execute on function public.can_manage_cells() from public, anon;
grant execute on function public.can_manage_cells() to authenticated;
revoke execute on function public.can_manage_document_library() from public, anon;
grant execute on function public.can_manage_document_library() to authenticated;

comment on function public.is_administrator() is
  'Returns true for active Supervisors, Pastors, and Administrators with a completed first login.';
comment on function public.can_manage_cells() is
  'Allows active Supervisors, Pastors, and Administrators to manage cells.';
comment on function public.can_manage_document_library() is
  'Allows active Supervisors, Pastors, and Administrators to manage document publications.';

commit;
