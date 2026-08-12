import assert from "node:assert/strict";
import test from "node:test";
import {
  calculateCellDashboardMetrics,
  calculateEvangelismHistory,
  calculateMonthlyEvangelismParticipation,
  calculatePersonalEvangelismSummary,
} from "../src/lib/cell-dashboard.ts";
import {
  getMonthRange,
  getMonthSequence,
  normalizeMonth,
} from "../src/lib/dates/sao-paulo.ts";

test("calcula o resumo mensal usando somente as Fichas recebidas", () => {
  const metrics = calculateCellDashboardMetrics([
    { membersCount: 4, guestsCount: 3, firstTimeGuestsCount: 1 },
    { membersCount: 6, guestsCount: 2, firstTimeGuestsCount: 2 },
  ]);

  assert.deepEqual(metrics, {
    reports: 2,
    members: 10,
    guests: 5,
    firstTimeGuests: 3,
    averageAttendance: 7.5,
  });
});

test("retorna indicadores zerados quando o mês não possui Fichas", () => {
  assert.deepEqual(calculateCellDashboardMetrics([]), {
    reports: 0,
    members: 0,
    guests: 0,
    firstTimeGuests: 0,
    averageAttendance: 0,
  });
});

test("valida o mês e calcula corretamente a virada do ano", () => {
  assert.equal(normalizeMonth("2026-12"), "2026-12");
  assert.deepEqual(getMonthRange("2026-12"), {
    month: "2026-12",
    startsOn: "2026-12-01",
    endsBefore: "2027-01-01",
  });
});

test("monta os últimos seis meses em ordem cronológica", () => {
  assert.deepEqual(getMonthSequence("2026-02", 6), [
    "2025-09",
    "2025-10",
    "2025-11",
    "2025-12",
    "2026-01",
    "2026-02",
  ]);
});

test("resume evangelismo por Ficha sem duplicar a mesma liderança", () => {
  assert.deepEqual(
    calculateEvangelismHistory(
      [
        { versionId: "v1", meetingOn: "2026-08-07" },
        { versionId: "v2", meetingOn: "2026-08-14" },
      ],
      [
        { id: "e1", versionId: "v1" },
        { id: "e2", versionId: "v1" },
      ],
      [
        { entryId: "e1", leadershipId: "lider" },
        { entryId: "e1", leadershipId: "vice" },
        { entryId: "e2", leadershipId: "lider" },
      ],
    ),
    [
      {
        versionId: "v2",
        meetingOn: "2026-08-14",
        records: 0,
        leadershipParticipants: 0,
      },
      {
        versionId: "v1",
        meetingOn: "2026-08-07",
        records: 2,
        leadershipParticipants: 2,
      },
    ],
  );
});

test("calcula participação mensal por pessoas distintas, sem inflar relatos", () => {
  assert.deepEqual(
    calculateMonthlyEvangelismParticipation(
      [
        { didEvangelize: true, leadershipId: "lider" },
        { didEvangelize: false, leadershipId: "vice-2" },
      ],
      ["lider", "vice-1", "lider"],
    ),
    {
      accompanied: 3,
      evangelized: 2,
      percentage: 67,
    },
  );
});

test("não inventa porcentagem quando não existem Fichas no mês", () => {
  assert.deepEqual(calculateMonthlyEvangelismParticipation([], []), {
    accompanied: 0,
    evangelized: 0,
    percentage: null,
  });
});

test("resume somente a participação da pessoa autenticada", () => {
  assert.deepEqual(
    calculatePersonalEvangelismSummary(
      "vice-1",
      [
        { id: "e1", versionId: "v1" },
        { id: "e2", versionId: "v1" },
        { id: "e3", versionId: "v2" },
      ],
      [
        { entryId: "e1", leadershipId: "vice-1" },
        { entryId: "e2", leadershipId: "lider" },
        { entryId: "e3", leadershipId: "vice-1" },
      ],
    ),
    { records: 2, reports: 2, didEvangelize: true },
  );
});
