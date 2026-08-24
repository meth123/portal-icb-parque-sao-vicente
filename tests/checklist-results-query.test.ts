import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const migration = readFileSync(
  new URL(
    "../supabase/migrations/202608240005_create_checklist_results_reports.sql",
    import.meta.url,
  ),
  "utf8",
).toLowerCase();
const historicalMigration = readFileSync(
  new URL(
    "../supabase/migrations/202608240004_freeze_closed_checklist_history.sql",
    import.meta.url,
  ),
  "utf8",
).toLowerCase();

test("RPC restringe acesso aos três papéis pastorais", () => {
  assert.match(migration, /global_role in \('administrator', 'pastor'\)/);
  assert.match(migration, /is_supervisor = true/);
  assert.match(migration, /profiles\.is_active = true/);
  assert.match(migration, /revoke execute[\s\S]*from public, anon, authenticated/);
  assert.match(migration, /grant execute[\s\S]*to authenticated/);
});

test("Todas e o filtro de Rede são resolvidos dentro da RPC", () => {
  assert.match(migration, /authorized_networks as materialized/);
  assert.match(migration, /valid_request\.network_code is null/);
  assert.match(migration, /authorized_networks\.code = valid_request\.network_code/);
  assert.match(migration, /join classifications_at_week_end/);
});

test("mensal só usa semanas fechadas e versões congeladas", () => {
  assert.match(migration, /generate_series/);
  assert.match(migration, /bool_and\(statement_timestamp\(\) >= weekly_periods\.closes_at\)/);
  assert.match(migration, /versions\.submitted_at < weekly_periods\.closes_at/);
  assert.match(migration, /versions\.replaced_at >= weekly_periods\.closes_at/);
  assert.match(migration, /checkins\.submitted_at < eligible_leadership\.closes_at/);
});

test("consulta agrega no banco em uma chamada e possui os acessos indexados", () => {
  assert.doesNotMatch(migration, /get_weekly_leadership_checklist\s*\(/);
  assert.match(migration, /count\(\*\)::integer as eligible_checklists/);
  assert.match(migration, /report_versions_at_close as materialized/);
  assert.match(historicalMigration, /cell_report_versions_checklist_history_idx/);
  assert.match(migration, /cell_classifications_cell_started_idx/);
});
