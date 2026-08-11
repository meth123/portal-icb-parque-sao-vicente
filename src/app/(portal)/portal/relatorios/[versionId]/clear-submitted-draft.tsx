"use client";

import { useEffect } from "react";

export function ClearSubmittedDraft({ draftKey }: { draftKey: string }) {
  useEffect(() => {
    try {
      window.localStorage.removeItem(draftKey);
    } catch {
      // A Ficha já foi salva; falhar ao limpar o armazenamento local não altera o envio.
    }
  }, [draftKey]);

  return null;
}
