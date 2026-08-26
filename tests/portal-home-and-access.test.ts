import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function read(relativePath: string) {
  return readFileSync(new URL(relativePath, import.meta.url), "utf8");
}

const portalHome = read("../src/app/(portal)/portal/page.tsx");
const cellPage = read("../src/app/(portal)/portal/celulas/[id]/page.tsx");
const cellDashboardData = read("../src/lib/data/cell-dashboard.ts");
const reportHistoryData = read("../src/lib/data/cell-report-history.ts");
const currentUser = read("../src/lib/auth/current-user.ts");
const supervisorAdministrationMigration = read(
  "../supabase/migrations/202608260002_allow_supervisors_full_administration.sql",
);

test("testemunho fica no topo da home, compacto e clicável para todos", () => {
  const cardPosition = portalHome.indexOf(
    "<LatestTestimonyCard testimony={latestTestimony} />",
  );
  const dashboardPosition = portalHome.indexOf(
    '<div className="mt-7 grid items-start',
  );

  assert.ok(cardPosition > 0 && cardPosition < dashboardPosition);
  assert.equal(
    portalHome.match(/<LatestTestimonyCard testimony={latestTestimony} \/>/g)
      ?.length,
    1,
  );
  assert.doesNotMatch(portalHome, /Ver todos os testemunhos/);
  assert.match(portalHome, /aria-label={`Abrir Testemunhos/);
  assert.match(portalHome, /line-clamp-2/);
});

test("home não exibe a antiga frase de orientação", () => {
  assert.doesNotMatch(
    portalHome,
    /Veja o que merece sua atenção e continue de onde parou/,
  );
});

test("home não exibe selo roxo de acesso pastoral", () => {
  assert.doesNotMatch(portalHome, /Acesso pastoral/);
  assert.doesNotMatch(portalHome, /Visão Pastoral/);
  assert.doesNotMatch(portalHome, /Visão de Supervisor/);
  assert.doesNotMatch(portalHome, /pastoralViewLabel/);
});

test("página da célula não duplica o histórico individual de Fichas", () => {
  assert.doesNotMatch(cellPage, /dashboard\.evangelismHistory/);
  assert.doesNotMatch(cellPage, />Ver Ficha</);
  assert.doesNotMatch(cellDashboardData, /calculateEvangelismHistory/);
});

test("histórico de Fichas carrega somente um lote recente", () => {
  assert.match(reportHistoryData, /CELL_REPORT_HISTORY_LIMIT = 5/);
  assert.match(reportHistoryData, /\.limit\(CELL_REPORT_HISTORY_LIMIT\)/);
});

test("supervisor recebe administração na aplicação e no banco", () => {
  const administrationStart = currentUser.indexOf(
    "export function canAccessAdministration",
  );
  const cellAdministrationStart = currentUser.indexOf(
    "export function canManageCellAdministration",
  );

  assert.match(
    currentUser.slice(administrationStart, administrationStart + 420),
    /user\.isSupervisor/,
  );
  assert.match(
    currentUser.slice(cellAdministrationStart, cellAdministrationStart + 420),
    /user\.isSupervisor/,
  );
  assert.match(
    supervisorAdministrationMigration,
    /create or replace function public\.is_administrator\(\)/i,
  );
  assert.match(
    supervisorAdministrationMigration,
    /create or replace function public\.can_manage_cells\(\)/i,
  );
  assert.match(
    supervisorAdministrationMigration,
    /create or replace function public\.can_manage_document_library\(\)/i,
  );
  assert.ok(
    (supervisorAdministrationMigration.match(/is_supervisor = true/gi)
      ?.length ?? 0) >= 4,
  );
  for (const routine of [
    "create_cell_with_relationships",
    "update_cell_configuration",
    "deactivate_cell",
    "reactivate_cell",
    "update_admin_profile_access",
    "finalize_quick_user_registration",
  ]) {
    assert.match(supervisorAdministrationMigration, new RegExp(routine, "i"));
  }
});
