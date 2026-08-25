import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  applyOptimisticTestimonyReaction,
  countTestimonyCharacters,
  summarizeTestimony,
  TESTIMONY_MAX_LENGTH,
  validateTestimonyContent,
} from "../src/lib/testimonies.ts";

const composerSource = readFileSync(
  new URL(
    "../src/app/(portal)/portal/testemunhos/testimony-composer.tsx",
    import.meta.url,
  ),
  "utf8",
);
const portalHomeSource = readFileSync(
  new URL("../src/app/(portal)/portal/page.tsx", import.meta.url),
  "utf8",
);

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

test("resume o testemunho mais recente sem cortar no meio da palavra", () => {
  const summary = summarizeTestimony(
    "  Deus tem feito algo muito especial em nossa célula e somos gratos por cada pessoa alcançada.  ",
    60,
  );

  assert.equal(summary, "Deus tem feito algo muito especial em nossa célula e...");
  assert.ok(countTestimonyCharacters(summary) <= 60);
});

test("Amém e Curtir são mutuamente exclusivos na atualização otimista", () => {
  const initialState = {
    amenCount: 4,
    likeCount: 3,
    viewerAmen: true,
    viewerLike: false,
  };
  const switchedToLike = applyOptimisticTestimonyReaction(
    initialState,
    "like",
  );

  assert.deepEqual(switchedToLike, {
    amenCount: 3,
    likeCount: 4,
    viewerAmen: false,
    viewerLike: true,
  });
  assert.deepEqual(applyOptimisticTestimonyReaction(switchedToLike, "like"), {
    amenCount: 3,
    likeCount: 3,
    viewerAmen: false,
    viewerLike: false,
  });
});

test("envio confirma a regra semanal e a home mostra o último testemunho", () => {
  assert.match(
    composerSource,
    /Compartilhe o que sua célula tem vivenciado/,
  );
  assert.match(composerSource, /label="Testemunho"/);
  assert.match(composerSource, /hideLabel/);
  assert.match(composerSource, /placeholder="Escreva aqui\.\.\."/);
  assert.match(composerSource, /window\.confirm/);
  assert.match(composerSource, /apenas um testemunho nesta semana/);
  assert.match(portalHomeSource, /getLatestTestimonyPreview/);
  assert.match(portalHomeSource, /Testemunho mais recente/);
  assert.match(portalHomeSource, /summarizeTestimony/);
  const testimonyPreviewPosition = portalHomeSource.indexOf(
    "<LatestTestimonyCard",
  );
  const checklistPosition = portalHomeSource.indexOf(
    "{checklistIsVisible && weeklyChecklist ?",
  );
  assert.ok(testimonyPreviewPosition > -1);
  assert.ok(testimonyPreviewPosition < checklistPosition);
});
