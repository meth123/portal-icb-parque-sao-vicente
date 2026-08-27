begin;

-- Temporary production fixture requested on 2026-08-27.
-- Auth users must be created first with temporary_20260827_create_test_users.mjs.
do $$
begin
  if public.current_sao_paulo_week_start() <> date '2026-08-24' then
    raise exception 'TEMP_FIXTURE_OUTSIDE_EXPECTED_WEEK';
  end if;

  if not exists (
    select 1
    from auth.users
    join public.profiles on profiles.id = auth.users.id
    where lower(auth.users.email) = lower('lucas.icb@gmail.com')
      and profiles.id = '2391d8cb-7a0a-4075-a2fd-22597912ac53'::uuid
      and profiles.is_active = true
  ) then
    raise exception 'TEMP_FIXTURE_LUCAS_PROFILE_NOT_FOUND';
  end if;

  if (
    select count(*)
    from auth.users
    where (id, lower(email)) in (
      ('7e570010-0827-4000-8000-000000000001'::uuid, 'mariana.souza.teste@example.com'),
      ('7e570010-0827-4000-8000-000000000002'::uuid, 'rodrigo.almeida.teste@example.com'),
      ('7e570010-0827-4000-8000-000000000003'::uuid, 'maria.oliveira.teste@example.com'),
      ('7e570010-0827-4000-8000-000000000004'::uuid, 'joao.santos.teste@example.com'),
      ('7e570010-0827-4000-8000-000000000005'::uuid, 'ana.costa.teste@example.com')
    )
  ) <> 5 then
    raise exception 'TEMP_FIXTURE_AUTH_USERS_NOT_FOUND';
  end if;
end
$$;

-- Keep Lucas's real current assignment untouched. These two historical rows
-- make him eligible for the checklist currently displayed by the portal.
insert into public.cell_classifications (
  id,
  cell_id,
  cell_type_id,
  starts_on,
  ends_on
)
select
  '7e570001-0827-4000-8000-000000000001'::uuid,
  cell_classifications.cell_id,
  cell_classifications.cell_type_id,
  date '2026-08-17',
  date '2026-08-24'
from public.cell_classifications
where cell_classifications.id = '9d4ee770-192c-483e-83d4-e6b5f9616782'::uuid
on conflict (id) do nothing;

insert into public.cell_leaderships (
  id,
  cell_id,
  profile_id,
  role,
  starts_on,
  ends_on
)
select
  '7e570002-0827-4000-8000-000000000001'::uuid,
  cell_leaderships.cell_id,
  cell_leaderships.profile_id,
  cell_leaderships.role,
  date '2026-08-17',
  date '2026-08-27'
from public.cell_leaderships
where cell_leaderships.id = '2fea735f-c71e-4f19-b02c-2655a822d12d'::uuid
on conflict (id) do nothing;

with profile_values (id, full_name, birth_date) as (
  values
    ('7e570010-0827-4000-8000-000000000001'::uuid, 'Mariana Souza', date '1993-05-14'),
    ('7e570010-0827-4000-8000-000000000002'::uuid, 'Rodrigo Almeida', date '1988-09-22'),
    ('7e570010-0827-4000-8000-000000000003'::uuid, 'Maria Oliveira', date '1995-02-11'),
    ('7e570010-0827-4000-8000-000000000004'::uuid, 'João Pedro Santos', date '1990-12-03'),
    ('7e570010-0827-4000-8000-000000000005'::uuid, 'Ana Clara Costa', date '1997-07-19')
)
update public.profiles
set full_name = profile_values.full_name,
  birth_date = profile_values.birth_date,
  leadership_started_on = date '2026-08-17',
  global_role = 'user',
  is_supervisor = false,
  can_manage_cells = false,
  is_active = true,
  must_change_password = false
from profile_values
where profiles.id = profile_values.id;

-- A mixed type is isolated by deterministic ID and removed with the fixture.
insert into public.cell_types (
  id,
  network_id,
  name,
  is_active
) values (
  '7e570011-0827-4000-8000-000000000001'::uuid,
  '8fed0fd4-2ee6-48ec-a3d0-b8d2ce271676'::uuid,
  'Mista',
  true
)
on conflict (id) do nothing;

insert into public.cells (
  id,
  name,
  is_active,
  started_on
) values (
  '7e570012-0827-4000-8000-000000000001'::uuid,
  'Caminho de Paz',
  true,
  date '2026-08-17'
)
on conflict (id) do nothing;

insert into public.cell_classifications (
  id,
  cell_id,
  cell_type_id,
  starts_on
) values (
  '7e570013-0827-4000-8000-000000000001'::uuid,
  '7e570012-0827-4000-8000-000000000001'::uuid,
  '7e570011-0827-4000-8000-000000000001'::uuid,
  date '2026-08-17'
)
on conflict (id) do nothing;

insert into public.cell_schedules (
  id,
  cell_id,
  weekday,
  meeting_time,
  starts_on
) values (
  '7e570014-0827-4000-8000-000000000001'::uuid,
  '7e570012-0827-4000-8000-000000000001'::uuid,
  5,
  time '20:00',
  date '2026-08-17'
)
on conflict (id) do nothing;

insert into public.cell_locations (
  id,
  cell_id,
  neighborhood_id,
  starts_on
) values (
  '7e570015-0827-4000-8000-000000000001'::uuid,
  '7e570012-0827-4000-8000-000000000001'::uuid,
  '84e93e61-b031-4b0f-8e71-e8574e6fdc97'::uuid,
  date '2026-08-17'
)
on conflict (id) do nothing;

insert into public.cell_leaderships (
  id,
  cell_id,
  profile_id,
  role,
  starts_on
) values
  (
    '7e570016-0827-4000-8000-000000000001'::uuid,
    '7e570012-0827-4000-8000-000000000001'::uuid,
    '7e570010-0827-4000-8000-000000000001'::uuid,
    'leader',
    date '2026-08-17'
  ),
  (
    '7e570016-0827-4000-8000-000000000002'::uuid,
    '7e570012-0827-4000-8000-000000000001'::uuid,
    '7e570010-0827-4000-8000-000000000002'::uuid,
    'vice_leader',
    date '2026-08-17'
  ),
  (
    '7e570016-0827-4000-8000-000000000003'::uuid,
    '7e570012-0827-4000-8000-000000000001'::uuid,
    '7e570010-0827-4000-8000-000000000003'::uuid,
    'vice_leader',
    date '2026-08-17'
  ),
  (
    '7e570016-0827-4000-8000-000000000004'::uuid,
    '7e570012-0827-4000-8000-000000000001'::uuid,
    '7e570010-0827-4000-8000-000000000004'::uuid,
    'vice_leader',
    date '2026-08-17'
  ),
  (
    '7e570016-0827-4000-8000-000000000005'::uuid,
    '7e570012-0827-4000-8000-000000000001'::uuid,
    '7e570010-0827-4000-8000-000000000005'::uuid,
    'vice_leader',
    date '2026-08-17'
  )
on conflict (id) do nothing;

do $$
begin
  if (
    select count(*)
    from public.cell_leaderships
    where cell_id = '7e570012-0827-4000-8000-000000000001'::uuid
      and ends_on is null
  ) <> 5 then
    raise exception 'TEMP_FIXTURE_CELL_LEADERSHIP_INCOMPLETE';
  end if;

  if not exists (
    select 1
    from public.cell_leaderships
    where id = '7e570002-0827-4000-8000-000000000001'::uuid
      and profile_id = '2391d8cb-7a0a-4075-a2fd-22597912ac53'::uuid
  ) then
    raise exception 'TEMP_FIXTURE_LUCAS_LEADERSHIP_NOT_CREATED';
  end if;
end
$$;

-- Temporary late-response exception for Lucas while testing the closed
-- checklist on 2026-08-27 through 2026-08-30. Remove with the cleanup script.
do $outer$
declare
  definition text;
  replacement text;
begin
  select pg_get_functiondef(
    'public.submit_weekly_leadership_checkin(boolean, boolean)'::regprocedure
  )
  into definition;

  if position('TEMP_FIXTURE_LUCAS_LATE_RESPONSE' in definition) = 0 then
    replacement :=
      '  -- TEMP_FIXTURE_LUCAS_LATE_RESPONSE' || chr(10) ||
      '  if current_iso_weekday not between 1 and 3' || chr(10) ||
      '    and not (' || chr(10) ||
      '      current_profile_id = ''2391d8cb-7a0a-4075-a2fd-22597912ac53''::uuid' || chr(10) ||
      '      and current_local_date between date ''2026-08-27'' and date ''2026-08-30''' || chr(10) ||
      '    ) then';
    definition := replace(
      definition,
      '  if current_iso_weekday not between 1 and 3 then',
      replacement
    );
    if definition = pg_get_functiondef(
      'public.submit_weekly_leadership_checkin(boolean, boolean)'::regprocedure
    ) then
      raise exception 'TEMP_FIXTURE_SUBMIT_FUNCTION_PATTERN_NOT_FOUND';
    end if;
    execute definition;
  end if;

  select pg_get_functiondef(
    'public.protect_closed_weekly_leadership_checkin()'::regprocedure
  )
  into definition;

  if position('TEMP_FIXTURE_LUCAS_LATE_RESPONSE' in definition) = 0 then
    replacement :=
      '  -- TEMP_FIXTURE_LUCAS_LATE_RESPONSE' || chr(10) ||
      '  if statement_timestamp() >= target_closes_at' || chr(10) ||
      '    and not (' || chr(10) ||
      '      auth.uid() = ''2391d8cb-7a0a-4075-a2fd-22597912ac53''::uuid' || chr(10) ||
      '      and (now() at time zone ''America/Sao_Paulo'')::date between date ''2026-08-27'' and date ''2026-08-30''' || chr(10) ||
      '    ) then';
    definition := replace(
      definition,
      '  if statement_timestamp() >= target_closes_at then',
      replacement
    );
    if definition = pg_get_functiondef(
      'public.protect_closed_weekly_leadership_checkin()'::regprocedure
    ) then
      raise exception 'TEMP_FIXTURE_TRIGGER_FUNCTION_PATTERN_NOT_FOUND';
    end if;
    execute definition;
  end if;
end
$outer$;

-- Five temporary testimonies authored by the test accounts.
insert into public.testimonies
  (id, author_id, content, week_start, month_start, created_at)
values
  (
    '7e570020-0827-4000-8000-000000000001'::uuid,
    '7e570010-0827-4000-8000-000000000001'::uuid,
    'Esta semana percebi Deus fortalecendo minha fé nas pequenas decisões do dia a dia.',
    date '2026-08-24', date '2026-08-01', timestamptz '2026-08-27 09:10:00-03'
  ),
  (
    '7e570020-0827-4000-8000-000000000002'::uuid,
    '7e570010-0827-4000-8000-000000000002'::uuid,
    'Sou grato pela comunhão da célula e por cada palavra de encorajamento recebida nesta semana.',
    date '2026-08-24', date '2026-08-01', timestamptz '2026-08-27 09:20:00-03'
  ),
  (
    '7e570020-0827-4000-8000-000000000003'::uuid,
    '7e570010-0827-4000-8000-000000000003'::uuid,
    'Em oração, encontrei paz para entregar a Deus uma preocupação que vinha carregando.',
    date '2026-08-24', date '2026-08-01', timestamptz '2026-08-27 09:30:00-03'
  ),
  (
    '7e570020-0827-4000-8000-000000000004'::uuid,
    '7e570010-0827-4000-8000-000000000004'::uuid,
    'A leitura bíblica desta semana me ajudou a enxergar novas oportunidades de servir com alegria.',
    date '2026-08-24', date '2026-08-01', timestamptz '2026-08-27 09:40:00-03'
  ),
  (
    '7e570020-0827-4000-8000-000000000005'::uuid,
    '7e570010-0827-4000-8000-000000000005'::uuid,
    'Foi uma semana de aprendizado e gratidão; senti cuidado de Deus por meio da minha família e da igreja.',
    date '2026-08-24', date '2026-08-01', timestamptz '2026-08-27 09:50:00-03'
  )
on conflict (id) do update
set author_id = excluded.author_id,
    content = excluded.content,
    week_start = excluded.week_start,
    month_start = excluded.month_start,
    created_at = excluded.created_at;

-- One temporary Ficha with 48 first-time guests for the test cell.
-- The Ficha is for the scheduled meeting on 2026-08-21.
select set_config(
  'request.jwt.claims',
  '{"sub":"7e570010-0827-4000-8000-000000000001","role":"authenticated"}',
  true
);
set local role authenticated;
with guest_payload as (
  select jsonb_agg(
    jsonb_build_object(
      'name', format('Convidado %s', lpad(number::text, 2, '0')),
      'responsibleName', case
        when number <= 12 then 'Mariana Souza'
        when number <= 24 then 'Rodrigo Almeida'
        when number <= 36 then 'Maria Oliveira'
        when number <= 42 then 'João Pedro Santos'
        else 'Ana Clara Costa'
      end,
      'isFirstTime', true
    ) order by number
  ) as guests
  from generate_series(1, 48) as series(number)
), evangelism_payload as (
  select jsonb_build_array(
    jsonb_build_object(
      'leadershipId', '7e570016-0827-4000-8000-000000000001',
      'didEvangelize', false,
      'comments', 'Sem registro de evangelismo nesta Ficha de teste.',
      'participants', '[]'::jsonb
    ),
    jsonb_build_object(
      'leadershipId', '7e570016-0827-4000-8000-000000000002',
      'didEvangelize', false,
      'comments', 'Sem registro de evangelismo nesta Ficha de teste.',
      'participants', '[]'::jsonb
    ),
    jsonb_build_object(
      'leadershipId', '7e570016-0827-4000-8000-000000000003',
      'didEvangelize', false,
      'comments', 'Sem registro de evangelismo nesta Ficha de teste.',
      'participants', '[]'::jsonb
    ),
    jsonb_build_object(
      'leadershipId', '7e570016-0827-4000-8000-000000000004',
      'didEvangelize', false,
      'comments', 'Sem registro de evangelismo nesta Ficha de teste.',
      'participants', '[]'::jsonb
    ),
    jsonb_build_object(
      'leadershipId', '7e570016-0827-4000-8000-000000000005',
      'didEvangelize', false,
      'comments', 'Sem registro de evangelismo nesta Ficha de teste.',
      'participants', '[]'::jsonb
    )
  ) as entries
)
select public.submit_cell_report(
  '7e570012-0827-4000-8000-000000000001'::uuid,
  date '2026-08-21',
  'in_person',
  true,
  false,
  array[
    '7e570016-0827-4000-8000-000000000002'::uuid,
    '7e570016-0827-4000-8000-000000000003'::uuid,
    '7e570016-0827-4000-8000-000000000004'::uuid,
    '7e570016-0827-4000-8000-000000000005'::uuid
  ],
  '[]'::jsonb,
  guest_payload.guests,
  evangelism_payload.entries
)
from guest_payload, evangelism_payload;
reset role;

commit;
