import assert from "node:assert/strict";
import test from "node:test";
import type { ChecklistResultsReport } from "../src/lib/data/checklist-results.ts";
import { createChecklistResultsPdf } from "../src/lib/pdf/checklist-results-pdf.ts";

function sampleReport(peopleCount = 2): ChecklistResultsReport {
  const people = Array.from({ length: peopleCount }, (_, index) => ({
    profileId: `profile-${index}`,
    fullName: `Pessoa ${index + 1}`,
    cellId: `cell-${Math.floor(index / 8)}`,
    cellName: `Célula ${Math.floor(index / 8) + 1}`,
    leadershipRole: index % 3 === 0 ? ("leader" as const) : ("vice_leader" as const),
    networkId: index % 2 === 0 ? "network-rj" : "network-hm",
    networkName: index % 2 === 0 ? "Rede de Jovens" : "Rede H.M",
    networkCode: index % 2 === 0 ? "RJ" : "H.M",
    eligibleChecklists: index === 0 ? 3 : 5,
    prayedCount: index === 0 ? 2 : 4,
    fastedCount: index === 0 ? 3 : 4,
    evangelizedCount: index === 0 ? 1 : 5,
    pendingCount: index === 0 ? 1 : 0,
  }));

  return {
    periodType: "monthly",
    periodStart: "2026-08-01",
    periodEnd: "2026-08-31",
    isComplete: true,
    availableAt: "2026-09-03T03:00:00Z",
    selectedNetworkCode: null,
    availableNetworks: [
      { id: "network-rj", name: "Rede de Jovens", code: "RJ" },
      { id: "network-hm", name: "Rede H.M", code: "H.M" },
    ],
    weeks: Array.from({ length: 5 }, (_, index) => ({
      startsOn: `2026-08-${String(3 + index * 7).padStart(2, "0")}`,
      endsOn: `2026-08-${String(9 + index * 7).padStart(2, "0")}`,
      closesAt: "2026-09-03T03:00:00Z",
    })),
    summary: {
      leadershipsConsidered: peopleCount,
      eligibleChecklists: peopleCount * 5,
      prayedCount: peopleCount * 4,
      fastedCount: peopleCount * 4,
      evangelizedCount: peopleCount * 3,
      pendingCount: 1,
    },
    networkSummaries: [
      {
        networkId: "network-rj",
        networkName: "Rede de Jovens",
        networkCode: "RJ",
        leadershipsConsidered: Math.ceil(peopleCount / 2),
        eligibleChecklists: Math.ceil(peopleCount / 2) * 5,
        prayedCount: 4,
        fastedCount: 4,
        evangelizedCount: 3,
        pendingCount: 1,
      },
      {
        networkId: "network-hm",
        networkName: "Rede H.M",
        networkCode: "H.M",
        leadershipsConsidered: Math.floor(peopleCount / 2),
        eligibleChecklists: Math.floor(peopleCount / 2) * 5,
        prayedCount: 4,
        fastedCount: 4,
        evangelizedCount: 3,
        pendingCount: 0,
      },
    ],
    people,
  };
}

test("gera PDF mensal com resumo, Redes e denominador variável", () => {
  const pdf = createChecklistResultsPdf(sampleReport());
  const content = Buffer.from(pdf).toString("latin1");

  assert.equal(content.startsWith("%PDF-1.4"), true);
  assert.equal(content.endsWith("%%EOF\n"), true);
  assert.equal(content.includes("RESUMO GERAL - AGOSTO DE 2026"), true);
  assert.equal(content.includes(String.raw`Rede de Jovens \(RJ\)`), true);
  assert.equal(content.includes(String.raw`Rede H.M \(H.M\)`), true);
  assert.equal(content.includes("Oração"), true);
  assert.equal(content.includes("Evangelismo"), true);
  assert.equal(content.includes("Pendências"), true);
  assert.equal(content.includes("(2/3)"), true);
  assert.equal(content.includes("(5/5)"), true);
  assert.equal(content.includes("(1/3)"), true);
  assert.equal(content.includes("0.353 0.090 0.408 rg"), true);
  assert.equal(content.includes("DETALHAMENTO POR REDE E CÉLULA"), true);
  assert.equal(pdf.byteLength < 60_000, true);
});

test("gera PDF semanal com o mesmo agrupamento e denominador do período", () => {
  const pdf = createChecklistResultsPdf({
    ...sampleReport(),
    periodType: "weekly",
    periodStart: "2026-08-10",
    periodEnd: "2026-08-16",
    weeks: [sampleReport().weeks[1]],
  });
  const content = Buffer.from(pdf).toString("latin1");

  assert.equal(content.includes("10/08/2026 a 16/08/2026"), true);
  assert.equal(content.includes("Oração"), true);
  assert.equal(content.includes("(2/3)"), true);
  assert.equal(content.includes(String.raw`Rede de Jovens \(RJ\)`), true);
  assert.equal(content.startsWith("%PDF-1.4"), true);
});

test("pagina corretamente um relatório mensal extenso", () => {
  const pdf = createChecklistResultsPdf(sampleReport(120));
  const content = Buffer.from(pdf).toString("latin1");
  const pageCount = Number(content.match(/\/Type \/Pages .*\/Count (\d+)/)?.[1]);

  assert.equal(pageCount > 5, true);
  assert.equal(content.includes(`Página ${pageCount} de ${pageCount}`), true);
  assert.equal(pdf.byteLength < 300_000, true);
});

test("recusa PDF de período ainda incompleto", () => {
  assert.throws(
    () => createChecklistResultsPdf({ ...sampleReport(), isComplete: false }),
    /CHECKLIST_RESULTS_PERIOD_INCOMPLETE/,
  );
});
