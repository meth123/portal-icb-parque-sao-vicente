import assert from "node:assert/strict";
import test from "node:test";
import {
  calculateOverdueCellWeeks,
  calculateCellDashboardMetrics,
  calculateEvangelismHistory,
  calculateMonthlyEvangelismParticipation,
  calculatePastoralDashboardMetrics,
  calculatePastoralCellSummaries,
  calculatePastoralFirstTimeHistory,
  calculatePastoralEvangelismHistory,
  calculatePersonalEvangelismSummary,
  normalizePastoralHistoryMonths,
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

test("calcula médias pastorais por reunião em vez de exibir totais isolados", () => {
  assert.deepEqual(
    calculatePastoralDashboardMetrics([
      { membersCount: 3, guestsCount: 2, firstTimeGuestsCount: 1 },
      { membersCount: 2, guestsCount: 1, firstTimeGuestsCount: 0 },
    ]),
    {
      reports: 2,
      members: 5,
      guests: 3,
      firstTimeGuests: 1,
      averageAttendance: 4,
      averageMembers: 2.5,
      averageGuests: 1.5,
    },
  );
});

test("resume cada célula e preserva as que ainda não enviaram Ficha", () => {
  assert.deepEqual(
    calculatePastoralCellSummaries(
      [
        {
          id: "celula-a",
          name: "Ágape",
          networkName: "Rede de Jovens",
          cellTypeName: "Rapazes",
        },
        {
          id: "celula-b",
          name: "Graça",
          networkName: "Rede H.M",
          cellTypeName: "Mulheres",
        },
      ],
      [
        {
          cellId: "celula-a",
          membersCount: 4,
          guestsCount: 2,
          firstTimeGuestsCount: 1,
        },
        {
          cellId: "celula-a",
          membersCount: 2,
          guestsCount: 0,
          firstTimeGuestsCount: 0,
        },
      ],
    ),
    [
      {
        id: "celula-a",
        name: "Ágape",
        networkName: "Rede de Jovens",
        cellTypeName: "Rapazes",
        metrics: {
          reports: 2,
          members: 6,
          guests: 2,
          firstTimeGuests: 1,
          averageAttendance: 4,
          averageMembers: 3,
          averageGuests: 1,
        },
      },
      {
        id: "celula-b",
        name: "Graça",
        networkName: "Rede H.M",
        cellTypeName: "Mulheres",
        metrics: {
          reports: 0,
          members: 0,
          guests: 0,
          firstTimeGuests: 0,
          averageAttendance: 0,
          averageMembers: 0,
          averageGuests: 0,
        },
      },
    ],
  );
});

test("monta o histórico pastoral de primeira vez sem contar versões antigas", () => {
  assert.deepEqual(
    calculatePastoralFirstTimeHistory(
      ["2026-06", "2026-07", "2026-08"],
      [
        {
          meetingOn: "2026-07-10",
          membersCount: 3,
          guestsCount: 2,
          firstTimeGuestsCount: 1,
        },
        {
          meetingOn: "2026-08-07",
          membersCount: 4,
          guestsCount: 3,
          firstTimeGuestsCount: 2,
        },
        {
          meetingOn: "2026-08-14",
          membersCount: 4,
          guestsCount: 1,
          firstTimeGuestsCount: 1,
        },
      ],
    ),
    [
      { month: "2026-06", firstTimeGuests: 0 },
      { month: "2026-07", firstTimeGuests: 1 },
      { month: "2026-08", firstTimeGuests: 3 },
    ],
  );
});

test("aceita somente os períodos pastorais de 3, 6 ou 12 meses", () => {
  assert.equal(normalizePastoralHistoryMonths("3"), 3);
  assert.equal(normalizePastoralHistoryMonths("6"), 6);
  assert.equal(normalizePastoralHistoryMonths("12"), 12);
  assert.equal(normalizePastoralHistoryMonths("24"), 3);
  assert.equal(normalizePastoralHistoryMonths(undefined), 3);
});

test("considera a Ficha atrasada somente depois do domingo", () => {
  const cells = [
    { id: "cell-a", reportingStartsOn: "2026-08-03" },
    { id: "cell-b", reportingStartsOn: "2026-08-03" },
  ];
  const reports = [
    {
      cellId: "cell-a",
      meetingOn: "2026-08-06",
      submittedOn: "2026-08-09",
    },
  ];

  assert.deepEqual(
    calculateOverdueCellWeeks(cells, reports, "2026-08", "2026-08-09"),
    [],
  );
  assert.deepEqual(
    calculateOverdueCellWeeks(cells, reports, "2026-08", "2026-08-10"),
    [
      {
        cellId: "cell-b",
        weekStartsOn: "2026-08-03",
        weekEndsOn: "2026-08-09",
        status: "pending",
        submittedOn: null,
      },
    ],
  );
});

test("uma Ficha na semana satisfaz o prazo mesmo com reuniões extras", () => {
  const overdue = calculateOverdueCellWeeks(
    [{ id: "cell-a", reportingStartsOn: "2026-08-03" }],
    [
      {
        cellId: "cell-a",
        meetingOn: "2026-08-06",
        submittedOn: "2026-08-09",
      },
      {
        cellId: "cell-a",
        meetingOn: "2026-08-08",
        submittedOn: "2026-08-09",
      },
    ],
    "2026-08",
    "2026-08-10",
  );

  assert.deepEqual(overdue, []);
});

test("não cria pendências anteriores ao início do acompanhamento no portal", () => {
  assert.deepEqual(
    calculateOverdueCellWeeks(
      [{ id: "cell-antiga", reportingStartsOn: "2026-08-17" }],
      [],
      "2026-08",
      "2026-08-20",
    ),
    [],
  );
});

test("preserva como atrasada a Ficha enviada depois do domingo", () => {
  const overdue = calculateOverdueCellWeeks(
    [{ id: "cell-a", reportingStartsOn: "2026-08-10" }],
    [
      {
        cellId: "cell-a",
        meetingOn: "2026-08-13",
        submittedOn: "2026-08-17",
      },
    ],
    "2026-08",
    "2026-08-18",
  );

  assert.deepEqual(overdue, [
    {
      cellId: "cell-a",
      weekStartsOn: "2026-08-10",
      weekEndsOn: "2026-08-16",
      status: "submitted_late",
      submittedOn: "2026-08-17",
    },
  ]);
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

test("calcula a evolução mensal do evangelismo sem contar a mesma pessoa duas vezes", () => {
  assert.deepEqual(
    calculatePastoralEvangelismHistory(
      ["2026-07", "2026-08"],
      [
        {
          id: "julho-1",
          meetingOn: "2026-07-10",
          didEvangelize: false,
          leadershipId: "lider",
        },
        {
          id: "agosto-1",
          meetingOn: "2026-08-07",
          didEvangelize: true,
          leadershipId: "lider",
        },
        {
          id: "agosto-2",
          meetingOn: "2026-08-14",
          didEvangelize: true,
          leadershipId: "lider",
        },
        {
          id: "agosto-3",
          meetingOn: "2026-08-14",
          didEvangelize: false,
          leadershipId: "vice",
        },
      ],
      [
        { entryId: "agosto-1", leadershipId: "lider" },
        { entryId: "agosto-2", leadershipId: "lider" },
      ],
    ),
    [
      {
        month: "2026-07",
        accompanied: 1,
        evangelized: 0,
        percentage: 0,
      },
      {
        month: "2026-08",
        accompanied: 2,
        evangelized: 1,
        percentage: 50,
      },
    ],
  );
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
