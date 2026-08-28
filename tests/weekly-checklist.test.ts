import assert from "node:assert/strict";
import test from "node:test";
import {
  formatWeeklyChecklistRange,
  getWeeklyChecklistPeriod,
} from "../src/lib/weekly-checklist.ts";

test("abre na segunda para a semana encerrada no domingo anterior", () => {
  const period = getWeeklyChecklistPeriod(
    new Date("2026-08-17T12:00:00-03:00"),
  );

  assert.deepEqual(period, {
    weekStartsOn: "2026-08-10",
    weekEndsOn: "2026-08-16",
    opensOn: "2026-08-17",
    closesOn: "2026-08-19",
    isOpen: true,
  });
});

test("permanece aberto até quarta-feira inclusive", () => {
  const period = getWeeklyChecklistPeriod(
    new Date("2026-08-19T23:59:00-03:00"),
  );

  assert.equal(period.isOpen, true);
  assert.equal(period.weekEndsOn, "2026-08-16");
});

test("fecha na quinta-feira sem avançar para uma semana incompleta", () => {
  const period = getWeeklyChecklistPeriod(
    new Date("2026-08-20T09:00:00-03:00"),
  );

  assert.equal(period.isOpen, false);
  assert.equal(period.weekStartsOn, "2026-08-10");
  assert.equal(period.weekEndsOn, "2026-08-16");
});

test("respeita a virada do dia no horário de São Paulo", () => {
  const beforeMidnight = getWeeklyChecklistPeriod(
    new Date("2026-08-20T02:59:00Z"),
  );
  const afterMidnight = getWeeklyChecklistPeriod(
    new Date("2026-08-20T03:01:00Z"),
  );

  assert.equal(beforeMidnight.isOpen, true);
  assert.equal(afterMidnight.isOpen, false);
});

test("formata o período oficial em português", () => {
  const period = getWeeklyChecklistPeriod(
    new Date("2026-08-17T12:00:00-03:00"),
  );

  assert.equal(formatWeeklyChecklistRange(period), "10/08/2026 a 16/08/2026");
});
