import assert from "node:assert/strict";
import test from "node:test";
import { createSupervisionAttendancePdf } from "../src/lib/pdf/supervision-attendance-pdf.ts";
import type { SupervisionAttendanceSession } from "../src/lib/data/supervision-attendance.ts";

test("gera relatório PDF da chamada com resumo, responsável e listas", () => {
  const session: SupervisionAttendanceSession = {
    id: "00000000-0000-4000-8000-000000000001",
    sessionOn: "2026-08-24",
    status: "finalized",
    networkId: "00000000-0000-4000-8000-000000000002",
    networkName: "Rede de Jovens",
    networkCode: "RJ",
    total: 2,
    present: 1,
    absent: 1,
    unmarked: 0,
    percentage: 50,
    createdAt: "2026-08-24T20:00:00Z",
    finalizedAt: "2026-08-24T21:00:00Z",
    responsibleName: "Maria Responsável",
    finalizedByName: "Maria Responsável",
    people: [
      {
        profileId: "00000000-0000-4000-8000-000000000003",
        fullName: "Pessoa Presente",
        present: true,
        cellName: "Célula Um",
        leadershipRole: "leader",
      },
      {
        profileId: "00000000-0000-4000-8000-000000000004",
        fullName: "Pessoa Ausente",
        present: false,
        cellName: "Célula Dois",
        leadershipRole: "vice_leader",
      },
    ],
  };

  const pdf = createSupervisionAttendancePdf(session);
  const content = Buffer.from(pdf).toString("latin1");

  assert.equal(content.startsWith("%PDF-1.4"), true);
  assert.match(content, /Total: 2/);
  assert.match(content, /Presentes: 1/);
  assert.match(content, /Ausentes: 1/);
  assert.match(content, /Maria Responsável/);
  assert.match(content, /Pessoa Presente/);
  assert.match(content, /Pessoa Ausente/);
});
