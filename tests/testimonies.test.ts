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

test("acomoda o texto de referência dentro do limite de 400 caracteres", () => {
  const referenceContent =
    "Durante muito tempo, eu pensei que precisava ter todas as respostas antes de confiar em Deus. Tentava controlar cada detalhe da minha vida, planejava todos os caminhos e ficava frustrado quando as coisas não aconteciam como eu esperava. Por fora, parecia que estava tudo bem, mas por dentro eu carregava medo, ansiedade e um cansaço que não sabia explicar.";

  assert.equal(countTestimonyCharacters(referenceContent), 356);
  assert.equal(validateTestimonyContent(referenceContent).error, null);
});

test("limita o testemunho a 400 caracteres reais", () => {
  const validContent = "🙏".repeat(TESTIMONY_MAX_LENGTH);
  const invalidContent = `${validContent}a`;

  assert.equal(countTestimonyCharacters(validContent), 400);
  assert.equal(validateTestimonyContent(validContent).error, null);
  assert.match(validateTestimonyContent(invalidContent).error ?? "", /400/);
});
