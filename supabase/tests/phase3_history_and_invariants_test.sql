-- Testa histórico e invariantes da Fase 3 sem persistir as alterações.
-- Requer a Célula Semente e a Célula Cadastro. O ROLLBACK final desfaz tudo.

begin;

do $$
declare
  seed_cell_id uuid;
  reserved_cell_id uuid;
  current_type_id uuid;
  target_type_id uuid;
  current_neighborhood_id uuid;
  target_neighborhood_id uuid;
  current_leader_id uuid;
  current_vice_id uuid;
  leaderless_cell_id uuid;
begin
  select id into seed_cell_id
  from public.cells
  where name = '[TESTE] Célula Semente';

  select id into reserved_cell_id
  from public.cells
  where name = '[TESTE] Célula Cadastro';

  if seed_cell_id is null or reserved_cell_id is null then
    raise exception 'Prepare primeiro as duas células fictícias da validação final.';
  end if;

  -- Nome de célula é único sem diferenciar maiúsculas e minúsculas.
  begin
    insert into public.cells (name)
    values ('[teste] célula semente');

    raise exception 'FALHA: o banco aceitou nome duplicado de célula.';
  exception
    when unique_violation then
      null;
  end;

  select profile_id into current_leader_id
  from public.cell_leaderships
  where cell_id = seed_cell_id
    and role = 'leader'
    and ends_on is null;

  select profile_id into current_vice_id
  from public.cell_leaderships
  where cell_id = seed_cell_id
    and role = 'vice_leader'
    and ends_on is null
  order by starts_on
  limit 1;

  if current_leader_id is null or current_vice_id is null then
    raise exception 'Os vínculos da Célula Semente estão incompletos.';
  end if;

  -- Uma célula não aceita dois líderes vigentes.
  begin
    insert into public.cell_leaderships (
      cell_id,
      profile_id,
      role,
      starts_on
    )
    values (seed_cell_id, current_vice_id, 'leader', date '2026-08-15');

    raise exception 'FALHA: o banco aceitou dois líderes vigentes.';
  exception
    when unique_violation then
      null;
  end;

  -- Uma pessoa não pode possuir um segundo vínculo vigente em outra célula.
  begin
    insert into public.cell_leaderships (
      cell_id,
      profile_id,
      role,
      starts_on
    )
    values (reserved_cell_id, current_leader_id, 'vice_leader', date '2026-08-15');

    raise exception 'FALHA: o banco aceitou dois vínculos vigentes para a mesma pessoa.';
  exception
    when unique_violation then
      null;
  end;

  -- A célula pode estar ativa e sem líder quando sua configuração própria
  -- está completa. A ausência de liderança não é uma falha de integridade.
  insert into public.cells (name, is_active, started_on)
  values ('[TESTE] Célula Sem Líder', true, date '2026-08-01')
  returning id into leaderless_cell_id;

  insert into public.cell_classifications (cell_id, cell_type_id, starts_on)
  select leaderless_cell_id, cell_type_id, date '2026-08-01'
  from public.cell_classifications
  where cell_id = seed_cell_id and ends_on is null;

  insert into public.cell_schedules (cell_id, weekday, meeting_time, starts_on)
  select leaderless_cell_id, weekday, meeting_time, date '2026-08-01'
  from public.cell_schedules
  where cell_id = seed_cell_id and ends_on is null;

  insert into public.cell_locations (cell_id, neighborhood_id, starts_on)
  select leaderless_cell_id, neighborhood_id, date '2026-08-01'
  from public.cell_locations
  where cell_id = seed_cell_id and ends_on is null;

  perform public.validate_active_cell_requirements(leaderless_cell_id);

  if not exists (
    select 1 from public.cells
    where id = leaderless_cell_id and is_active = true
  ) then
    raise exception 'FALHA: uma célula ativa sem líder foi desativada.';
  end if;

  select cell_type_id into current_type_id
  from public.cell_classifications
  where cell_id = seed_cell_id
    and ends_on is null;

  select cell_types.id into target_type_id
  from public.cell_types
  join public.networks on networks.id = cell_types.network_id
  where networks.code = 'H.M'
    and cell_types.name = 'Homens';

  select neighborhood_id into current_neighborhood_id
  from public.cell_locations
  where cell_id = seed_cell_id
    and ends_on is null;

  select neighborhoods.id into target_neighborhood_id
  from public.neighborhoods
  where neighborhoods.id <> current_neighborhood_id
    and neighborhoods.is_active = true
  order by neighborhoods.created_at
  limit 1;

  if target_type_id is null
    or target_neighborhood_id is null
    or current_leader_id is null
    or current_vice_id is null then
    raise exception 'Os dados necessários ao teste histórico estão incompletos.';
  end if;

  -- Transição RJ/Rapazes -> H.M/Homens preservando a linha anterior.
  update public.cell_classifications
  set ends_on = date '2026-09-01'
  where cell_id = seed_cell_id
    and cell_type_id = current_type_id
    and ends_on is null;

  insert into public.cell_classifications (cell_id, cell_type_id, starts_on)
  values (seed_cell_id, target_type_id, date '2026-09-01');

  -- Mudança de quinta para sexta às 20h.
  update public.cell_schedules
  set ends_on = date '2026-09-01'
  where cell_id = seed_cell_id
    and ends_on is null;

  insert into public.cell_schedules (
    cell_id,
    weekday,
    meeting_time,
    starts_on
  )
  values (seed_cell_id, 5, time '20:00', date '2026-09-01');

  -- Mudança de bairro preservando o local anterior.
  update public.cell_locations
  set ends_on = date '2026-09-01'
  where cell_id = seed_cell_id
    and ends_on is null;

  insert into public.cell_locations (cell_id, neighborhood_id, starts_on)
  values (seed_cell_id, target_neighborhood_id, date '2026-09-01');

  -- Vice-líder assume como líder e ambos os vínculos anteriores são encerrados.
  update public.cell_leaderships
  set ends_on = date '2026-09-01'
  where cell_id = seed_cell_id
    and profile_id in (current_leader_id, current_vice_id)
    and ends_on is null;

  insert into public.cell_leaderships (
    cell_id,
    profile_id,
    role,
    starts_on
  )
  values (seed_cell_id, current_vice_id, 'leader', date '2026-09-01');

  insert into public.cell_multiplications (
    parent_cell_id,
    child_cell_id,
    multiplied_on,
    notes
  )
  values (
    seed_cell_id,
    reserved_cell_id,
    date '2026-09-01',
    'Teste reversível de multiplicação'
  );

  -- Executa a mesma validação usada pelos gatilhos adiados no commit.
  perform public.validate_active_cell_requirements(seed_cell_id);

  if not exists (
    select 1 from public.cell_classifications
    where cell_id = seed_cell_id
      and cell_type_id = current_type_id
      and ends_on = date '2026-09-01'
  ) or not exists (
    select 1 from public.cell_classifications
    where cell_id = seed_cell_id
      and cell_type_id = target_type_id
      and ends_on is null
  ) then
    raise exception 'FALHA: histórico de classificação não foi preservado.';
  end if;

  if not exists (
    select 1 from public.cell_schedules
    where cell_id = seed_cell_id
      and weekday = 5
      and ends_on is null
  ) then
    raise exception 'FALHA: novo horário não se tornou vigente.';
  end if;

  if not exists (
    select 1 from public.cell_locations
    where cell_id = seed_cell_id
      and neighborhood_id = target_neighborhood_id
      and ends_on is null
  ) then
    raise exception 'FALHA: nova localidade não se tornou vigente.';
  end if;

  if not exists (
    select 1 from public.cell_leaderships
    where cell_id = seed_cell_id
      and profile_id = current_vice_id
      and role = 'leader'
      and ends_on is null
  ) then
    raise exception 'FALHA: troca de líder não foi registrada.';
  end if;

  if not exists (
    select 1 from public.cell_multiplications
    where parent_cell_id = seed_cell_id
      and child_cell_id = reserved_cell_id
  ) then
    raise exception 'FALHA: multiplicação não foi registrada.';
  end if;
end
$$;

select
  'PASSOU' as result,
  'Históricos e invariantes validados; alterações serão desfeitas.' as details;

rollback;
