import assert from "node:assert/strict";
import test from "node:test";
import {
  formatChecklistPeriodLabel,
  getLatestClosedChecklistWeek,
  normalizeChecklistNetworkCode,
  normalizeChecklistResultsMonth,
  normalizeChecklistResultsPeriodType,
  normalizeChecklistResultsWeek,
} from "../src/lib/checklist-results.ts";

test("normaliza filtros mensal, semanal e de Rede", () => {
  const referenceDate = new Date("2026-08-24T15:00:00Z");

  assert.equal(normalizeChecklistResultsPeriodType("semanal"), "weekly");
  assert.equal(normalizeChecklistResultsPeriodType("monthly"), "monthly");
  assert.equal(normalizeChecklistResultsPeriodType("invalid"), "monthly");
  assert.equal(normalizeChecklistResultsMonth("2026-08", referenceDate), "2026-08");
  assert.equal(normalizeChecklistResultsMonth("invalid", referenceDate), "2026-08");
  assert.equal(normalizeChecklistResultsWeek("2026-08-03", referenceDate), "2026-08-03");
  assert.equal(normalizeChecklistResultsWeek("2026-08-04", referenceDate), "2026-08-10");
  assert.equal(normalizeChecklistResultsWeek("2026-02-30", referenceDate), "2026-08-10");
  assert.equal(normalizeChecklistNetworkCode("RJ"), "RJ");
  assert.equal(normalizeChecklistNetworkCode("hm"), "H.M");
  assert.equal(normalizeChecklistNetworkCode("H.M"), "H.M");
  assert.equal(normalizeChecklistNetworkCode("outra"), null);
});

test("semana padrão nunca aponta para um Checklist ainda aberto", () => {
  assert.equal(
    getLatestClosedChecklistWeek(new Date("2026-08-24T15:00:00Z")),
    "2026-08-10",
  );
  assert.equal(
    getLatestClosedChecklistWeek(new Date("2026-08-26T23:00:00Z")),
    "2026-08-10",
  );
  assert.equal(
    getLatestClosedChecklistWeek(new Date("2026-08-27T12:00:00Z")),
    "2026-08-17",
  );
});

test("formata os rótulos mensal e semanal", () => {
  assert.equal(
    formatChecklistPeriodLabel("monthly", "2026-08-01", "2026-08-31"),
    "Agosto de 2026",
  );
  assert.equal(
    formatChecklistPeriodLabel("weekly", "2026-08-10", "2026-08-16"),
    "10/08/2026 a 16/08/2026",
  );
});
