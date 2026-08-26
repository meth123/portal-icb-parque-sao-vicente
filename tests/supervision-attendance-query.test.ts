import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const migration = readFileSync(
  new URL(
    "../supabase/migrations/202608240008_create_supervision_attendance.sql",
    import.meta.url,
  ),
  "utf8",
);
const authorizationMigration = readFileSync(
  new URL(
    "../supabase/migrations/202608260001_restrict_supervision_attendance_access.sql",
    import.meta.url,
  ),
  "utf8",
);

test("migration cria sessões e roster sem duplicar chamadas ou perfis", () => {
  assert.match(migration, /create table public\.supervision_attendance_sessions/i);
  assert.match(migration, /unique \(network_id, session_on\)/i);
  assert.match(migration, /create table public\.supervision_attendance_entries/i);
  assert.match(migration, /unique \(session_id, profile_id\)/i);
  assert.match(migration, /profile_id uuid not null references public\.profiles/i);
});

test("RLS e RPCs exigem perfil autorizado no servidor", () => {
  assert.match(migration, /enable row level security/i);
  assert.match(migration, /grant select on table public\.supervision_attendance_sessions to authenticated/i);
  assert.doesNotMatch(migration, /grant (?:insert|update|delete).*supervision_attendance_sessions/i);
  assert.match(authorizationMigration, /create or replace function public\.can_manage_supervision_attendance/i);
  assert.match(authorizationMigration, /profiles\.global_role in \('administrator', 'pastor'\)/i);
  assert.match(authorizationMigration, /profiles\.is_supervisor = true/i);
  assert.doesNotMatch(authorizationMigration, /cell_leaderships|role = 'leader'/i);
  assert.ok(
    (migration.match(/can_manage_supervision_attendance\(\)/gi)?.length ?? 0) >= 8,
  );
});

test("rascunho mantém não marcados e finalização registra ausências", () => {
  assert.match(migration, /set present = null\s+where session_id = target_session_id/i);
  assert.match(migration, /set present = false\s+where session_id = target_session_id/i);
  assert.match(migration, /set present = true[\s\S]*profile_id = any/i);
  assert.doesNotMatch(migration, /alter table public\.weekly_leadership_checkins/i);
});
