export const TESTIMONY_MAX_LENGTH = 2_000;

export type TestimonyReactionType = "amen" | "like";

export type TestimonyContentValidation =
  | { content: string; error: null }
  | { content: ""; error: string };

export function countTestimonyCharacters(content: string) {
  return Array.from(content).length;
}

export function validateTestimonyContent(
  value: FormDataEntryValue | string | null,
): TestimonyContentValidation {
  if (typeof value !== "string") {
    return { content: "", error: "Escreva seu testemunho antes de enviar." };
  }

  const content = value.replace(/\r\n?/g, "\n").trim();
  const length = countTestimonyCharacters(content);

  if (length === 0) {
    return { content: "", error: "Escreva seu testemunho antes de enviar." };
  }

  if (length > TESTIMONY_MAX_LENGTH) {
    return {
      content: "",
      error: `O testemunho deve ter no máximo ${TESTIMONY_MAX_LENGTH.toLocaleString("pt-BR")} caracteres.`,
    };
  }

  return { content, error: null };
}

export function isTestimonyReactionType(
  value: string,
): value is TestimonyReactionType {
  return value === "amen" || value === "like";
}
