begin;

-- An active cell still requires its own current classification, schedule and
-- location, but leadership is an optional, independent relationship.
create or replace function public.validate_active_cell_requirements(target_cell_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_is_active boolean;
begin
  select is_active
  into target_is_active
  from public.cells
  where id = target_cell_id;

  if target_is_active is distinct from true then
    return;
  end if;

  if (
    select count(*)
    from public.cell_classifications
    where cell_id = target_cell_id and ends_on is null
  ) <> 1 then
    raise exception 'An active cell must have exactly one current classification.';
  end if;

  if (
    select count(*)
    from public.cell_schedules
    where cell_id = target_cell_id and ends_on is null
  ) <> 1 then
    raise exception 'An active cell must have exactly one current schedule.';
  end if;

  if (
    select count(*)
    from public.cell_locations
    where cell_id = target_cell_id and ends_on is null
  ) <> 1 then
    raise exception 'An active cell must have exactly one current location.';
  end if;
end;
$$;

comment on function public.validate_active_cell_requirements(uuid) is
  'Validates the current intrinsic configuration of an active cell; leadership is optional.';

-- Keep the invariant explicit in this migration. A partial unique index is
-- concurrency-safe: PostgreSQL serializes conflicting inserts even when they
-- arrive in separate transactions.
create unique index if not exists cell_leaderships_one_current_leader_idx
on public.cell_leaderships (cell_id)
where role = 'leader' and ends_on is null;

comment on index public.cell_leaderships_one_current_leader_idx is
  'Allows zero or one current Leader per cell; current means ends_on is null.';

-- Internal primitive shared by cell creation, editing and reactivation. It
-- closes changed links and inserts new rows, never overwriting or deleting
-- historical assignments.
create or replace function public.replace_current_cell_leadership(
  target_cell_id uuid,
  target_effective_on date,
  target_leader_profile_id uuid,
  target_vice_profile_ids uuid[]
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  normalized_vice_ids uuid[];
  selected_profile_ids uuid[];
  current_leader_profile_id uuid;
  current_vice_profile_ids uuid[];
  leadership_changed boolean;
begin
  if target_cell_id is null or target_effective_on is null then
    raise exception 'CELL_MANAGEMENT_INVALID';
  end if;

  -- Serialize all leadership mutations for one cell. The unique index remains
  -- the final database guard for direct/concurrent writes outside these RPCs.
  perform 1 from public.cells where id = target_cell_id for update;
  if not found then
    raise exception 'CELL_NOT_FOUND';
  end if;

  normalized_vice_ids := coalesce(
    array(
      select distinct vice_profile_id
      from unnest(coalesce(target_vice_profile_ids, '{}'::uuid[]))
        as vice_profile_id
      order by vice_profile_id
    ),
    '{}'::uuid[]
  );

  if array_position(normalized_vice_ids, null) is not null then
    raise exception 'CELL_VICE_INVALID';
  end if;

  if target_leader_profile_id is not null
    and target_leader_profile_id = any(normalized_vice_ids)
  then
    raise exception 'CELL_LEADER_IS_VICE';
  end if;

  selected_profile_ids := normalized_vice_ids;
  if target_leader_profile_id is not null then
    selected_profile_ids := array_prepend(
      target_leader_profile_id,
      selected_profile_ids
    );
  end if;

  if (
    select count(*)
    from public.profiles
    where profiles.id = any(selected_profile_ids)
      and profiles.is_active = true
      and profiles.global_role = 'user'
  ) <> cardinality(selected_profile_ids)
  then
    raise exception 'CELL_LEADERSHIP_REQUIRES_ACTIVE_USER';
  end if;

  if exists (
    select 1
    from public.cell_leaderships
    where cell_leaderships.profile_id = any(selected_profile_ids)
      and cell_leaderships.ends_on is null
      and cell_leaderships.cell_id <> target_cell_id
  ) then
    raise exception 'CELL_PROFILE_ASSIGNED_ELSEWHERE';
  end if;

  select profile_id
  into current_leader_profile_id
  from public.cell_leaderships
  where cell_id = target_cell_id
    and role = 'leader'
    and ends_on is null;

  select coalesce(array_agg(profile_id order by profile_id), '{}'::uuid[])
  into current_vice_profile_ids
  from public.cell_leaderships
  where cell_id = target_cell_id
    and role = 'vice_leader'
    and ends_on is null;

  leadership_changed :=
    current_leader_profile_id is distinct from target_leader_profile_id
    or current_vice_profile_ids is distinct from normalized_vice_ids;

  if leadership_changed and exists (
    select 1
    from public.cell_leaderships
    where cell_id = target_cell_id
      and ends_on is null
      and (
        (role = 'leader'
          and profile_id is distinct from target_leader_profile_id)
        or (role = 'vice_leader'
          and not (profile_id = any(normalized_vice_ids)))
        or (role = 'vice_leader'
          and profile_id = target_leader_profile_id)
      )
      -- The history constraint requires ends_on > starts_on. A replacement
      -- on the same day as an existing assignment cannot be represented as a
      -- non-empty historical interval, so reject it explicitly instead of
      -- surfacing a raw check-constraint violation.
      and target_effective_on <= starts_on
  ) then
    raise exception 'CELL_EFFECTIVE_DATE_TOO_EARLY';
  end if;

  if leadership_changed then
    update public.cell_leaderships
    set ends_on = target_effective_on
    where cell_id = target_cell_id
      and ends_on is null
      and (
        (role = 'leader'
          and profile_id is distinct from target_leader_profile_id)
        or (role = 'vice_leader'
          and not (profile_id = any(normalized_vice_ids)))
        or (role = 'vice_leader'
          and profile_id = target_leader_profile_id)
      );

    if target_leader_profile_id is not null
      and current_leader_profile_id is distinct from target_leader_profile_id
    then
      insert into public.cell_leaderships (
        cell_id, profile_id, role, starts_on
      ) values (
        target_cell_id, target_leader_profile_id, 'leader', target_effective_on
      );
    end if;

    insert into public.cell_leaderships (
      cell_id, profile_id, role, starts_on
    )
    select target_cell_id, selected_vice_profile_id, 'vice_leader',
      target_effective_on
    from unnest(normalized_vice_ids) as selected_vice_profile_id
    where not exists (
      select 1
      from public.cell_leaderships as current_vice
      where current_vice.cell_id = target_cell_id
        and current_vice.profile_id = selected_vice_profile_id
        and current_vice.role = 'vice_leader'
        and current_vice.ends_on is null
    );
  end if;

  return jsonb_build_object(
    'changed', leadership_changed,
    'previous_leader_profile_id', current_leader_profile_id,
    'current_leader_profile_id', target_leader_profile_id,
    'previous_vice_profile_ids', current_vice_profile_ids,
    'current_vice_profile_ids', normalized_vice_ids
  );
end;
$$;

revoke execute on function public.replace_current_cell_leadership(
  uuid, date, uuid, uuid[]
) from public, anon, authenticated;

drop function if exists public.create_cell_with_relationships(
  text, uuid, smallint, time without time zone, date, uuid, uuid, uuid[]
);

create function public.create_cell_with_relationships(
  target_name text,
  target_cell_type_id uuid,
  target_weekday smallint,
  target_meeting_time time without time zone,
  target_started_on date,
  target_leadership_starts_on date,
  target_neighborhood_id uuid,
  target_leader_profile_id uuid,
  target_vice_profile_ids uuid[]
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  created_cell_id uuid;
  normalized_name text := btrim(target_name);
  actor_profile_id uuid := (select auth.uid());
  current_local_date date := (now() at time zone 'America/Sao_Paulo')::date;
  has_initial_leadership boolean :=
    target_leader_profile_id is not null
    or coalesce(cardinality(target_vice_profile_ids), 0) > 0;
begin
  if not exists (
    select 1 from public.profiles as actor
    where actor.id = actor_profile_id
      and actor.is_active = true
      and actor.must_change_password = false
      and (
        actor.global_role = 'administrator'
        or (actor.global_role = 'pastor' and actor.can_manage_cells = true)
      )
  ) then
    raise exception 'A conta não possui permissão para cadastrar células.'
      using errcode = '42501';
  end if;

  if normalized_name is null or char_length(normalized_name) not between 2 and 120 then
    raise exception 'Informe um nome de célula entre 2 e 120 caracteres.';
  end if;
  if target_started_on is null then
    raise exception 'Informe a data de início da célula.';
  end if;
  if has_initial_leadership and (
    target_leadership_starts_on is null
    or target_leadership_starts_on < target_started_on
    or target_leadership_starts_on > current_local_date
  ) then
    raise exception 'Informe uma data válida para o início dos vínculos de liderança.';
  end if;
  if target_weekday is null or target_weekday not in (4, 5, 6) then
    raise exception 'Informe um dia da semana válido.';
  end if;
  if target_meeting_time is null then
    raise exception 'Informe o horário do encontro.';
  end if;
  if not exists (
    select 1 from public.cell_types
    join public.networks on networks.id = cell_types.network_id
    where cell_types.id = target_cell_type_id
      and cell_types.is_active = true and networks.is_active = true
  ) then
    raise exception 'A Rede ou o tipo de célula está inativo ou não existe.';
  end if;
  if not exists (
    select 1 from public.neighborhoods
    join public.cities on cities.id = neighborhoods.city_id
    where neighborhoods.id = target_neighborhood_id
      and neighborhoods.is_active = true and cities.is_active = true
  ) then
    raise exception 'A cidade ou o bairro está inativo ou não existe.';
  end if;

  insert into public.cells (name, is_active, started_on)
  values (normalized_name, false, target_started_on)
  returning id into created_cell_id;

  insert into public.cell_classifications (cell_id, cell_type_id, starts_on)
  values (created_cell_id, target_cell_type_id, target_started_on);
  insert into public.cell_schedules (cell_id, weekday, meeting_time, starts_on)
  values (created_cell_id, target_weekday, target_meeting_time, target_started_on);
  insert into public.cell_locations (cell_id, neighborhood_id, starts_on)
  values (created_cell_id, target_neighborhood_id, target_started_on);

  if has_initial_leadership then
    perform public.replace_current_cell_leadership(
      created_cell_id, target_leadership_starts_on, target_leader_profile_id,
      target_vice_profile_ids
    );
  end if;

  update public.cells set is_active = true where id = created_cell_id;

  insert into public.admin_operation_audits (
    actor_profile_id, action, target_type, target_id, metadata
  ) values (
    actor_profile_id, 'cell.create', 'cell', created_cell_id,
    jsonb_build_object(
      'cell_name', normalized_name,
      'leadership_starts_on', target_leadership_starts_on,
      'leader_profile_id', target_leader_profile_id,
      'vice_profile_ids', coalesce(target_vice_profile_ids, '{}'::uuid[])
    )
  );

  return created_cell_id;
end;
$$;

revoke execute on function public.create_cell_with_relationships(
  text, uuid, smallint, time without time zone, date, date, uuid, uuid, uuid[]
) from public, anon;
grant execute on function public.create_cell_with_relationships(
  text, uuid, smallint, time without time zone, date, date, uuid, uuid, uuid[]
) to authenticated;

comment on function public.create_cell_with_relationships(
  text, uuid, smallint, time without time zone, date, date, uuid, uuid, uuid[]
) is
  'Atomically creates an active cell with an independent optional leadership effective date.';

create or replace function public.update_cell_leadership(
  target_cell_id uuid,
  target_name text,
  target_effective_on date,
  target_leader_profile_id uuid,
  target_vice_profile_ids uuid[]
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_profile_id uuid := (select auth.uid());
  normalized_name text := btrim(target_name);
  previous_name text;
  cell_started_on date;
  leadership_result jsonb;
  current_local_date date := (now() at time zone 'America/Sao_Paulo')::date;
begin
  if actor_profile_id is null or not exists (
    select 1 from public.profiles as actor
    where actor.id = actor_profile_id and actor.is_active = true
      and actor.must_change_password = false
      and (
        actor.global_role = 'administrator'
        or (actor.global_role = 'pastor' and actor.can_manage_cells = true)
      )
  ) then
    raise exception 'CELL_MANAGEMENT_FORBIDDEN' using errcode = '42501';
  end if;
  if target_cell_id is null or target_effective_on is null then
    raise exception 'CELL_MANAGEMENT_INVALID';
  end if;
  if normalized_name is null or char_length(normalized_name) not between 2 and 120 then
    raise exception 'CELL_NAME_INVALID';
  end if;

  select cells.name, cells.started_on
  into previous_name, cell_started_on
  from public.cells
  where cells.id = target_cell_id and cells.is_active = true
  for update;
  if not found then raise exception 'CELL_NOT_ACTIVE'; end if;

  if target_effective_on > current_local_date
    or (cell_started_on is not null and target_effective_on < cell_started_on)
  then
    raise exception 'CELL_EFFECTIVE_DATE_INVALID';
  end if;

  leadership_result := public.replace_current_cell_leadership(
    target_cell_id, target_effective_on, target_leader_profile_id,
    target_vice_profile_ids
  );

  if previous_name = normalized_name
    and not (leadership_result ->> 'changed')::boolean
  then
    raise exception 'CELL_NO_CHANGES';
  end if;

  update public.cells set name = normalized_name
  where id = target_cell_id and name is distinct from normalized_name;

  insert into public.admin_operation_audits (
    actor_profile_id, action, target_type, target_id, metadata
  ) values (
    actor_profile_id, 'cell.leadership.update', 'cell', target_cell_id,
    jsonb_build_object(
      'effective_on', target_effective_on,
      'previous_name', previous_name,
      'current_name', normalized_name
    ) || leadership_result - 'changed'
  );
end;
$$;

comment on function public.update_cell_leadership(
  uuid, text, date, uuid, uuid[]
) is
  'Replaces or clears the optional current Leader and Vice-leaders while preserving history.';

create or replace function public.update_cell_configuration(
  target_cell_id uuid,
  target_name text,
  target_effective_on date,
  target_cell_type_id uuid,
  target_weekday smallint,
  target_meeting_time time without time zone,
  target_neighborhood_id uuid,
  target_leader_profile_id uuid,
  target_vice_profile_ids uuid[]
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_profile_id uuid := (select auth.uid());
  normalized_name text := btrim(target_name);
  previous_name text;
  cell_started_on date;
  current_local_date date := (now() at time zone 'America/Sao_Paulo')::date;
  current_classification_id uuid;
  current_cell_type_id uuid;
  current_classification_starts_on date;
  current_schedule_id uuid;
  current_weekday smallint;
  current_meeting_time time without time zone;
  current_schedule_starts_on date;
  current_location_id uuid;
  current_neighborhood_id uuid;
  current_location_starts_on date;
  classification_changed boolean;
  schedule_changed boolean;
  location_changed boolean;
  leadership_result jsonb;
begin
  if actor_profile_id is null or not exists (
    select 1 from public.profiles as actor
    where actor.id = actor_profile_id and actor.is_active = true
      and actor.must_change_password = false
      and actor.global_role in ('administrator', 'pastor')
  ) then
    raise exception 'CELL_MANAGEMENT_FORBIDDEN' using errcode = '42501';
  end if;

  if target_cell_id is null or target_effective_on is null
    or target_cell_type_id is null or target_weekday is null
    or target_meeting_time is null or target_neighborhood_id is null
  then
    raise exception 'CELL_MANAGEMENT_INVALID';
  end if;
  if normalized_name is null or char_length(normalized_name) not between 2 and 120 then
    raise exception 'CELL_NAME_INVALID';
  end if;
  if target_weekday not in (4, 5, 6) then
    raise exception 'CELL_SCHEDULE_INVALID';
  end if;

  select cells.name, cells.started_on
  into previous_name, cell_started_on
  from public.cells
  where cells.id = target_cell_id and cells.is_active = true
  for update;
  if not found then raise exception 'CELL_NOT_ACTIVE'; end if;

  if target_effective_on > current_local_date
    or (cell_started_on is not null and target_effective_on < cell_started_on)
  then
    raise exception 'CELL_EFFECTIVE_DATE_INVALID';
  end if;

  if not exists (
    select 1 from public.cell_types
    join public.networks on networks.id = cell_types.network_id
    where cell_types.id = target_cell_type_id
      and cell_types.is_active = true and networks.is_active = true
  ) then raise exception 'CELL_TYPE_INVALID'; end if;

  if not exists (
    select 1 from public.neighborhoods
    join public.cities on cities.id = neighborhoods.city_id
    where neighborhoods.id = target_neighborhood_id
      and neighborhoods.is_active = true and cities.is_active = true
  ) then raise exception 'CELL_LOCATION_INVALID'; end if;

  select id, cell_type_id, starts_on
  into current_classification_id, current_cell_type_id,
    current_classification_starts_on
  from public.cell_classifications
  where cell_id = target_cell_id and ends_on is null
  for update;
  if not found then raise exception 'CELL_CURRENT_CLASSIFICATION_MISSING'; end if;

  select id, weekday, meeting_time, starts_on
  into current_schedule_id, current_weekday, current_meeting_time,
    current_schedule_starts_on
  from public.cell_schedules
  where cell_id = target_cell_id and ends_on is null
  for update;
  if not found then raise exception 'CELL_CURRENT_SCHEDULE_MISSING'; end if;

  select id, neighborhood_id, starts_on
  into current_location_id, current_neighborhood_id,
    current_location_starts_on
  from public.cell_locations
  where cell_id = target_cell_id and ends_on is null
  for update;
  if not found then raise exception 'CELL_CURRENT_LOCATION_MISSING'; end if;

  classification_changed := current_cell_type_id is distinct from target_cell_type_id;
  schedule_changed := current_weekday is distinct from target_weekday
    or current_meeting_time is distinct from target_meeting_time;
  location_changed := current_neighborhood_id is distinct from target_neighborhood_id;

  if (classification_changed and target_effective_on <= current_classification_starts_on)
    or (schedule_changed and target_effective_on <= current_schedule_starts_on)
    or (location_changed and target_effective_on <= current_location_starts_on)
  then
    raise exception 'CELL_EFFECTIVE_DATE_TOO_EARLY';
  end if;

  leadership_result := public.replace_current_cell_leadership(
    target_cell_id, target_effective_on, target_leader_profile_id,
    target_vice_profile_ids
  );

  if previous_name = normalized_name and not classification_changed
    and not schedule_changed and not location_changed
    and not (leadership_result ->> 'changed')::boolean
  then
    raise exception 'CELL_NO_CHANGES';
  end if;

  update public.cells set name = normalized_name
  where id = target_cell_id and name is distinct from normalized_name;

  if classification_changed then
    update public.cell_classifications set ends_on = target_effective_on
    where id = current_classification_id;
    insert into public.cell_classifications (cell_id, cell_type_id, starts_on)
    values (target_cell_id, target_cell_type_id, target_effective_on);
  end if;
  if schedule_changed then
    update public.cell_schedules set ends_on = target_effective_on
    where id = current_schedule_id;
    insert into public.cell_schedules (cell_id, weekday, meeting_time, starts_on)
    values (target_cell_id, target_weekday, target_meeting_time, target_effective_on);
  end if;
  if location_changed then
    update public.cell_locations set ends_on = target_effective_on
    where id = current_location_id;
    insert into public.cell_locations (cell_id, neighborhood_id, starts_on)
    values (target_cell_id, target_neighborhood_id, target_effective_on);
  end if;

  insert into public.admin_operation_audits (
    actor_profile_id, action, target_type, target_id, metadata
  ) values (
    actor_profile_id, 'cell.configuration.update', 'cell', target_cell_id,
    jsonb_build_object(
      'effective_on', target_effective_on,
      'previous', jsonb_build_object(
        'name', previous_name,
        'cell_type_id', current_cell_type_id,
        'weekday', current_weekday,
        'meeting_time', current_meeting_time,
        'neighborhood_id', current_neighborhood_id,
        'leader_profile_id', leadership_result -> 'previous_leader_profile_id',
        'vice_profile_ids', leadership_result -> 'previous_vice_profile_ids'
      ),
      'current', jsonb_build_object(
        'name', normalized_name,
        'cell_type_id', target_cell_type_id,
        'weekday', target_weekday,
        'meeting_time', target_meeting_time,
        'neighborhood_id', target_neighborhood_id,
        'leader_profile_id', leadership_result -> 'current_leader_profile_id',
        'vice_profile_ids', leadership_result -> 'current_vice_profile_ids'
      )
    )
  );
end;
$$;

comment on function public.update_cell_configuration(
  uuid, text, date, uuid, smallint, time without time zone, uuid, uuid, uuid[]
) is
  'Updates an active cell configuration with optional leadership and preserved history.';

create or replace function public.reactivate_cell(
  target_cell_id uuid,
  target_reactivated_on date,
  target_cell_type_id uuid,
  target_weekday smallint,
  target_meeting_time time without time zone,
  target_neighborhood_id uuid,
  target_leader_profile_id uuid,
  target_vice_profile_ids uuid[]
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_profile_id uuid := (select auth.uid());
  current_local_date date := (now() at time zone 'America/Sao_Paulo')::date;
  previous_ended_on date;
  previous_name text;
  leadership_result jsonb;
begin
  if actor_profile_id is null or not exists (
    select 1 from public.profiles as actor
    where actor.id = actor_profile_id and actor.is_active = true
      and actor.must_change_password = false
      and actor.global_role in ('administrator', 'pastor')
  ) then
    raise exception 'CELL_MANAGEMENT_FORBIDDEN' using errcode = '42501';
  end if;
  if target_cell_id is null or target_reactivated_on is null
    or target_cell_type_id is null or target_weekday is null
    or target_meeting_time is null or target_neighborhood_id is null
  then raise exception 'CELL_REACTIVATION_INVALID'; end if;
  if target_weekday not in (4, 5, 6) then raise exception 'CELL_SCHEDULE_INVALID'; end if;

  select cells.name, cells.ended_on
  into previous_name, previous_ended_on
  from public.cells
  where cells.id = target_cell_id
    and cells.is_active = false and cells.ended_on is not null
  for update;
  if not found then raise exception 'CELL_NOT_INACTIVE'; end if;
  if target_reactivated_on > current_local_date
    or target_reactivated_on <= previous_ended_on
  then raise exception 'CELL_REACTIVATION_DATE_INVALID'; end if;

  if not exists (
    select 1 from public.cell_types
    join public.networks on networks.id = cell_types.network_id
    where cell_types.id = target_cell_type_id
      and cell_types.is_active = true and networks.is_active = true
  ) then raise exception 'CELL_TYPE_INVALID'; end if;
  if not exists (
    select 1 from public.neighborhoods
    join public.cities on cities.id = neighborhoods.city_id
    where neighborhoods.id = target_neighborhood_id
      and neighborhoods.is_active = true and cities.is_active = true
  ) then raise exception 'CELL_LOCATION_INVALID'; end if;

  insert into public.cell_classifications (cell_id, cell_type_id, starts_on)
  values (target_cell_id, target_cell_type_id, target_reactivated_on);
  insert into public.cell_schedules (cell_id, weekday, meeting_time, starts_on)
  values (target_cell_id, target_weekday, target_meeting_time, target_reactivated_on);
  insert into public.cell_locations (cell_id, neighborhood_id, starts_on)
  values (target_cell_id, target_neighborhood_id, target_reactivated_on);

  leadership_result := public.replace_current_cell_leadership(
    target_cell_id, target_reactivated_on, target_leader_profile_id,
    target_vice_profile_ids
  );

  update public.cells set is_active = true, ended_on = null
  where id = target_cell_id;

  insert into public.admin_operation_audits (
    actor_profile_id, action, target_type, target_id, metadata
  ) values (
    actor_profile_id, 'cell.reactivate', 'cell', target_cell_id,
    jsonb_build_object(
      'name', previous_name,
      'previous_ended_on', previous_ended_on,
      'reactivated_on', target_reactivated_on,
      'cell_type_id', target_cell_type_id,
      'weekday', target_weekday,
      'meeting_time', target_meeting_time,
      'neighborhood_id', target_neighborhood_id,
      'leader_profile_id', target_leader_profile_id,
      'vice_profile_ids', leadership_result -> 'current_vice_profile_ids'
    )
  );
end;
$$;

comment on function public.reactivate_cell(
  uuid, date, uuid, smallint, time without time zone, uuid, uuid, uuid[]
) is
  'Reactivates a cell with complete intrinsic configuration and optional leadership.';

commit;
