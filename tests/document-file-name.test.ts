import assert from "node:assert/strict";
import test from "node:test";
import { createSafePdfFileName } from "../src/lib/documents/file-name.ts";

test("remove acentos e símbolos problemáticos do nome do PDF", () => {
  assert.equal(
    createSafePdfFileName("Oração de Confissão — 12/08 #1.pdf"),
    "Oracao-de-Confissao-12-08-1.pdf",
  );
});

test("preserva nomes simples e garante a extensão PDF", () => {
  assert.equal(
    createSafePdfFileName("Mensagem Celula 10.pdf"),
    "Mensagem-Celula-10.pdf",
  );
});

test("usa nome neutro quando não existe texto seguro", () => {
  assert.equal(createSafePdfFileName("⚡✨.pdf"), "documento.pdf");
  assert.equal(createSafePdfFileName("CON.pdf"), "documento.pdf");
});
