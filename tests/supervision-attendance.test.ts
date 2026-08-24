import assert from "node:assert/strict";
import test from "node:test";
import {
  attendancePercentage,
  formatSupervisionDate,
  isValidSupervisionDate,
  normalizeSupervisionNetworkCode,
  supervisionNetworkLabel,
} from "../src/lib/supervision-attendance.ts";

test("normaliza somente as Redes permitidas na chamada", () => {
  assert.equal(normalizeSupervisionNetworkCode("rj"), "RJ");
  assert.equal(normalizeSupervisionNetworkCode("H.M"), "H.M");
  assert.equal(normalizeSupervisionNetworkCode("hm"), "H.M");
  assert.equal(normalizeSupervisionNetworkCode("outra"), null);
  assert.equal(supervisionNetworkLabel("H.M"), "HM");
});

test("valida e formata a data da chamada sem trocar o fuso", () => {
  assert.equal(isValidSupervisionDate("2026-08-24"), true);
  assert.equal(isValidSupervisionDate("2026-02-30"), false);
  assert.equal(isValidSupervisionDate("24/08/2026"), false);
  assert.equal(formatSupervisionDate("2026-08-24"), "24/08/2026");
});

test("calcula a porcentagem de presença", () => {
  assert.equal(attendancePercentage(38, 50), 76);
  assert.equal(attendancePercentage(0, 0), 0);
});
