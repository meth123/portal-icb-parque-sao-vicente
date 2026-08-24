import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const migration = readFileSync(
  new URL(
    "../supabase/migrations/202608240006_create_first_time_guests_history.sql",
    import.meta.url,
  ),
  "utf8",
).toLowerCase();
const dataModule = readFileSync(
  new URL("../src/lib/data/first-time-guests.ts", import.meta.url),
  "utf8",
);
const counter = readFileSync(
  new URL(
    "../src/app/(portal)/portal/animated-number.tsx",
    import.meta.url,
  ),
  "utf8",
);

test("histórico reutiliza somente os totais das versões atuais das Fichas", () => {
  assert.match(migration, /sum\(versions\.first_time_guests_count\)/);
  assert.match(migration, /versions\.is_current = true/);
  assert.doesNotMatch(migration, /cell_report_guest_entries/);
});

test("RPC agrega meses e acumulado no banco em uma chamada", () => {
  assert.match(migration, /monthly_totals as materialized/);
  assert.match(migration, /group by date_trunc\('month'/);
  assert.match(migration, /jsonb_agg\(/);
  assert.match(migration, /generate_series\(/);
  assert.match(
    dataModule,
    /\.rpc\(\s*"get_institution_first_time_guests_history"/,
  );
  assert.doesNotMatch(dataModule, /\.from\(/);
});

test("RPC exige conta autenticada ativa e reutiliza o índice existente", () => {
  assert.match(migration, /profiles\.is_active = true/);
  assert.match(migration, /revoke execute[\s\S]*from public, anon, authenticated/);
  assert.match(migration, /grant execute[\s\S]*to authenticated/);
  assert.doesNotMatch(migration, /create index/);
});

test("contador é local, usa animation frame e respeita movimento reduzido", () => {
  assert.match(counter, /prefers-reduced-motion: reduce/);
  assert.match(counter, /requestAnimationFrame/);
  assert.doesNotMatch(counter, /fetch\(|createClient|supabase/);
});
