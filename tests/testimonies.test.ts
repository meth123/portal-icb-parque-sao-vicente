import assert from "node:assert/strict";
import test from "node:test";
import {
  countTestimonyCharacters,
  TESTIMONY_MAX_LENGTH,
  validateTestimonyContent,
} from "../src/lib/testimonies.ts";

test("normaliza e valida o conteúdo do testemunho", () => {
  assert.deepEqual(validateTestimonyContent("  Linha 1\r\nLinha 2  "), {
    content: "Linha 1\nLinha 2",
    error: null,
  });
  assert.match(validateTestimonyContent("   ").error ?? "", /escreva/i);
});

test("limita o testemunho a 2.000 caracteres reais", () => {
  const validContent = "🙏".repeat(TESTIMONY_MAX_LENGTH);
  const invalidContent = `${validContent}a`;

  assert.equal(countTestimonyCharacters(validContent), 2_000);
  assert.equal(validateTestimonyContent(validContent).error, null);
  assert.match(validateTestimonyContent(invalidContent).error ?? "", /2\.000/);
});
