export const TESTIMONY_MAX_LENGTH = 400;

export type TestimonyReactionType = "amen" | "like";

export type TestimonyReactionState = {
  amenCount: number;
  likeCount: number;
  viewerAmen: boolean;
  viewerLike: boolean;
};

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

export function applyOptimisticTestimonyReaction(
  current: TestimonyReactionState,
  reactionType: TestimonyReactionType,
): TestimonyReactionState {
  if (reactionType === "amen") {
    if (current.viewerAmen) {
      return {
        ...current,
        amenCount: Math.max(0, current.amenCount - 1),
        viewerAmen: false,
      };
    }

    return {
      ...current,
      amenCount: current.amenCount + 1,
      viewerAmen: true,
      likeCount: current.viewerLike
        ? Math.max(0, current.likeCount - 1)
        : current.likeCount,
      viewerLike: false,
    };
  }

  if (current.viewerLike) {
    return {
      ...current,
      likeCount: Math.max(0, current.likeCount - 1),
      viewerLike: false,
    };
  }

  return {
    ...current,
    amenCount: current.viewerAmen
      ? Math.max(0, current.amenCount - 1)
      : current.amenCount,
    viewerAmen: false,
    likeCount: current.likeCount + 1,
    viewerLike: true,
  };
}

export function summarizeTestimony(content: string, maximumLength = 180) {
  const normalizedContent = content.replace(/\s+/g, " ").trim();
  if (countTestimonyCharacters(normalizedContent) <= maximumLength) {
    return normalizedContent;
  }

  const availableContent = Array.from(normalizedContent)
    .slice(0, Math.max(1, maximumLength - 3))
    .join("");
  const lastCompleteWord = availableContent.replace(/\s+\S*$/, "").trimEnd();

  return `${lastCompleteWord || availableContent.trimEnd()}...`;
}
