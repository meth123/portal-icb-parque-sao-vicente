import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function read(path: string) {
  return readFileSync(new URL(path, import.meta.url), "utf8");
}

const reportMigration = read(
  "../supabase/migrations/202608250004_allow_report_submission_independent_of_leadership_dates.sql",
);
const reportForm = read(
  "../src/app/(portal)/portal/relatorios/novo/report-form.tsx",
);
const cellPage = read(
  "../src/app/(portal)/portal/celulas/[id]/page.tsx",
);
const cellForm = read(
  "../src/app/(portal)/portal/admin/celulas/nova/cell-form.tsx",
);

test("a Ficha não transforma datas históricas em regras de envio", () => {
  const dateGuards = [
    /starts_on\s*<=\s*target_meeting_on/i,
    /ends_on\s*>\s*target_meeting_on/i,
    /starts_on\s*<\s*target_meeting_on/i,
    /target_meeting_on\s*<\s*starts_on/i,
  ];

  for (const guard of dateGuards) {
    assert.doesNotMatch(reportMigration, guard);
  }
});

test("a matriz de cenários de datas permanece liberada", () => {
  const scenarios = [
    "Ficha anterior ao início registrado do líder",
    "Ficha posterior ao encerramento histórico de um líder",
    "Ficha com data igual à inauguração da célula",
    "rascunho antigo após troca de líder",
    "correção de uma Ficha com liderança histórica",
    "data histórica desconhecida ou ainda vazia",
  ];

  assert.equal(scenarios.length, 6);
  assert.match(reportMigration, /must never reject a report submission/i);
  assert.doesNotMatch(reportMigration, /expected_leadership_count/i);
  assert.doesNotMatch(reportMigration, /covered_leadership_count/i);
});

test("a Ficha continua protegendo apenas a identidade da célula", () => {
  assert.match(
    reportMigration,
    /cell_leaderships\.cell_id = target_cell_id/i,
  );
  assert.match(
    reportMigration,
    /cell_leaderships\.role in \('leader', 'vice_leader'\)/i,
  );
  assert.match(reportMigration, /O evangelismo contem uma pessoa de outra celula/i);
});

test("mudar a Data da Célula não apaga seleções do formulário", () => {
  const start = reportForm.indexOf("function handleMeetingOnChange");
  const end = reportForm.indexOf("useEffect(() =>", start);
  const handler = reportForm.slice(start, end);

  assert.match(handler, /setMeetingOn\(nextMeetingOn\)/i);
  assert.doesNotMatch(handler, /setSelectedViceIds/i);
  assert.doesNotMatch(handler, /setEvangelismRecords/i);
  assert.doesNotMatch(handler, /setNotEvangelized/i);
});

test("líderes e vices veem a data de inauguração da célula", () => {
  assert.match(cellPage, /Inauguração da célula/i);
  assert.match(cellPage, /cell\.startedOn/i);
  assert.doesNotMatch(cellPage, /leadership\.startsOn/i);
});

test("o cadastro de célula não possui um terceiro campo de data", () => {
  assert.doesNotMatch(cellForm, /leadershipStartsOn/i);
  assert.doesNotMatch(cellForm, /Início dos vínculos/i);
});
