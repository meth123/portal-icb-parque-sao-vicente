import assert from "node:assert/strict";
import test from "node:test";
import type { CellReportVersionDetail } from "../src/lib/data/cell-report-detail.ts";
import { createCellReportPdf } from "../src/lib/pdf/cell-report-pdf.ts";

export const sampleCellReportDetail: CellReportVersionDetail = {
  id: "11111111-1111-4111-8111-111111111111",
  reportId: "22222222-2222-4222-8222-222222222222",
  cellId: "33333333-3333-4333-8333-333333333333",
  cellName: "[TESTE] Relatórios",
  meetingOn: "2026-08-11",
  versionNumber: 2,
  meetingFormat: "in_person",
  leaderWasPresent: false,
  leaderLeadershipId: "66666666-6666-4666-8666-666666666666",
  leaderName: "Usuário de Teste",
  noViceLeaderWasPresent: false,
  presentViceLeadershipIds: [
    "77777777-7777-4777-8777-777777777777",
    "88888888-8888-4888-8888-888888888888",
  ],
  presentViceLeaderNames: ["Júnior", "Roberto"],
  membersCount: 4,
  guestsCount: 3,
  firstTimeGuestsCount: 1,
  submittedByName: "Usuário de Teste",
  submittedAt: "2026-08-11T18:36:23.932971+00:00",
  isCurrent: true,
  leadership: [
    {
      leadershipId: "66666666-6666-4666-8666-666666666666",
      name: "Usuário de Teste",
      role: "leader",
    },
    {
      leadershipId: "77777777-7777-4777-8777-777777777777",
      name: "Júnior",
      role: "vice_leader",
    },
    {
      leadershipId: "88888888-8888-4888-8888-888888888888",
      name: "Roberto",
      role: "vice_leader",
    },
  ],
  members: [
    { position: 1, name: "João" },
    { position: 2, name: "André" },
    { position: 3, name: "Maria" },
    { position: 4, name: "Lúcia" },
  ],
  guests: [
    {
      position: 1,
      name: "Mateus",
      responsibleName: "Eugênio",
      isFirstTime: true,
    },
    {
      position: 2,
      name: "Marcos",
      responsibleName: "Eugênio",
      isFirstTime: false,
    },
    {
      position: 3,
      name: "Rafael",
      responsibleName: "Júnior",
      isFirstTime: false,
    },
  ],
  evangelismEntries: [
    {
      id: "44444444-4444-4444-8444-444444444444",
      registeredByLeadershipId: "66666666-6666-4666-8666-666666666666",
      registeredByName: "Usuário de Teste",
      didEvangelize: true,
      leadershipIds: [
        "66666666-6666-4666-8666-666666666666",
        "77777777-7777-4777-8777-777777777777",
      ],
      leadershipNames: ["Usuário de Teste", "Júnior"],
      evangelismOn: "2026-08-10",
      durationText: "2h",
      comments:
        "A liderança realizou o evangelismo em conjunto e registrou o resumo da semana.",
      participantNames: ["Anderson", "José"],
    },
    {
      id: "55555555-5555-4555-8555-555555555555",
      registeredByLeadershipId: "88888888-8888-4888-8888-888888888888",
      registeredByName: "Roberto",
      didEvangelize: false,
      leadershipIds: [],
      leadershipNames: [],
      evangelismOn: null,
      durationText: null,
      comments: "Não conseguiu participar nesta semana.",
      participantNames: [],
    },
  ],
};

test("gera um PDF leve e estruturalmente completo", () => {
  const pdf = createCellReportPdf(sampleCellReportDetail);
  const content = Buffer.from(pdf).toString("latin1");

  assert.equal(content.startsWith("%PDF-1.4"), true);
  assert.equal(content.endsWith("%%EOF\n"), true);
  assert.equal(content.includes("/Type /Catalog"), true);
  assert.equal(content.includes("/BaseFont /Helvetica"), true);
  assert.equal(content.includes("Ficha de Organização"), true);
  assert.equal(content.includes("Não evangelizou"), true);
  assert.equal(pdf.byteLength < 50_000, true);
});

test("pagina automaticamente uma Ficha extensa sem aumentar demais o arquivo", () => {
  const pdf = createCellReportPdf({
    ...sampleCellReportDetail,
    membersCount: 180,
    members: Array.from({ length: 180 }, (_, index) => ({
      position: index + 1,
      name: `Membro de teste ${index + 1}`,
    })),
  });
  const content = Buffer.from(pdf).toString("latin1");
  const pageCount = Number(content.match(/\/Type \/Pages .*\/Count (\d+)/)?.[1]);

  assert.equal(pageCount > 1, true);
  assert.equal(pdf.byteLength < 150_000, true);
});
