import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const migration = readFileSync(
  new URL(
    "../supabase/migrations/202608250002_lock_leadership_start_dates.sql",
    import.meta.url,
  ),
  "utf8",
);
const cellMigration = readFileSync(
  new URL(
    "../supabase/migrations/202608250003_derive_cell_leadership_history_from_profiles.sql",
    import.meta.url,
  ),
  "utf8",
);
const reportMigration = readFileSync(
  new URL(
    "../supabase/migrations/202608250004_allow_report_submission_independent_of_leadership_dates.sql",
    import.meta.url,
  ),
  "utf8",
);
const informationalDatesMigration = readFileSync(
  new URL(
    "../supabase/migrations/202608250005_allow_informational_date_edits.sql",
    import.meta.url,
  ),
  "utf8",
);
const inaugurationPermissionMigration = readFileSync(
  new URL(
    "../supabase/migrations/20260825195958_restrict_cell_inauguration_date_editing.sql",
    import.meta.url,
  ),
  "utf8",
);
const cellPage = readFileSync(
  new URL("../src/app/(portal)/portal/celulas/[id]/page.tsx", import.meta.url),
  "utf8",
);
const cellActions = readFileSync(
  new URL("../src/app/(portal)/portal/celulas/[id]/actions.ts", import.meta.url),
  "utf8",
);

test("cadastro de pessoa preserva a data informativa sem travar o vínculo", () => {
  assert.match(
    migration,
    /target_leadership_started_on\s*date[\s\S]*relationship_starts_on/i,
  );
  assert.doesNotMatch(
    migration,
    /QUICK_REGISTRATION_CELL_LEADERSHIP_DATE_INVALID/i,
  );
});

test("cadastro de célula deriva o histórico sem pedir uma terceira data", () => {
  assert.match(
    cellMigration,
    /leadership_dates_derived_from_profiles[\s\S]*true/i,
  );
  assert.match(
    cellMigration,
    /coalesce\(profiles\.leadership_started_on, target_started_on\)/i,
  );
  assert.doesNotMatch(
    cellMigration,
    /CELL_LEADERSHIP_START_DATE_REQUIRED/i,
  );
});

test("datas e identidade dos vínculos históricos são imutáveis", () => {
  assert.match(migration, /new\.starts_on is distinct from old\.starts_on/i);
  assert.match(
    migration,
    /protect_cell_leadership_history_identity[\s\S]*before update on public\.cell_leaderships/i,
  );
  assert.match(
    migration,
    /revoke update \(leadership_started_on\)[\s\S]*from authenticated/i,
  );
});

test("envio da Ficha não usa datas históricas como bloqueio", () => {
  assert.match(
    reportMigration,
    /must never reject a report submission/i,
  );
  assert.doesNotMatch(reportMigration, /starts_on\s*<=\s*target_meeting_on/i);
  assert.doesNotMatch(reportMigration, /ends_on\s*> target_meeting_on/i);
});

test("lideres editam somente as proprias datas informativas", () => {
  assert.match(
    informationalDatesMigration,
    /update_own_leadership_started_on[\s\S]*profile\.id = actor_profile_id/i,
  );
  assert.match(
    informationalDatesMigration,
    /leadership\.ends_on is null[\s\S]*leadership\.role in \('leader', 'vice_leader'\)/i,
  );
  assert.match(
    informationalDatesMigration,
    /update public\.profiles[\s\S]*where id = actor_profile_id/i,
  );
  assert.match(
    informationalDatesMigration,
    /update_own_cell_started_on[\s\S]*leadership\.cell_id = cell\.id/i,
  );
  assert.match(
    informationalDatesMigration,
    /profile\.id = actor_profile_id[\s\S]*leadership\.ends_on is null/i,
  );
  assert.match(
    informationalDatesMigration,
    /drop constraint if exists cells_reporting_starts_after_foundation_check/i,
  );
  assert.doesNotMatch(informationalDatesMigration, /earliest_related_on/i);
});

test("vice não altera inauguração; líder e acesso pastoral alteram", () => {
  assert.match(
    inaugurationPermissionMigration,
    /profile\.global_role in \('administrator', 'pastor'\)/i,
  );
  assert.match(
    inaugurationPermissionMigration,
    /profile\.is_supervisor = true/i,
  );
  assert.match(
    inaugurationPermissionMigration,
    /leadership\.role = 'leader'/i,
  );
  assert.doesNotMatch(
    inaugurationPermissionMigration,
    /leadership\.role\s*=\s*'vice_leader'/i,
  );
  assert.match(cellPage, /canAccessPastoralDashboard\(user\)/);
  assert.match(cellPage, /user\.currentLeadershipRole === "leader"/);
  assert.doesNotMatch(
    cellPage,
    /user\.currentLeadershipRole === "vice_leader"/,
  );
  assert.match(cellActions, /canAccessPastoralDashboard\(user\)/);
  assert.match(cellActions, /user\.currentLeadershipRole !== "leader"/);
  assert.doesNotMatch(
    cellActions,
    /user\.currentLeadershipRole !== "vice_leader"/,
  );
});
