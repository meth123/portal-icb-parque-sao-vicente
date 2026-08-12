import assert from "node:assert/strict";
import test from "node:test";
import {
  formatMonthLabel,
  getSaoPauloMonthStart,
} from "../src/lib/dates/sao-paulo.ts";

test("calcula o mês pela data de São Paulo, não pelo UTC", () => {
  assert.equal(
    getSaoPauloMonthStart(new Date("2026-09-01T02:30:00Z")),
    "2026-08-01",
  );
});

test("formata o mês em português", () => {
  assert.equal(formatMonthLabel("2026-08-01"), "Agosto de 2026");
});
