"use client";

import { useEffect } from "react";

type ClearCellReportDraftProps = {
  draftKey: string;
};

export function ClearCellReportDraft({ draftKey }: ClearCellReportDraftProps) {
  useEffect(() => {
    try {
      window.localStorage.removeItem(draftKey);
    } catch {
      // O envio já foi confirmado; falhas locais não alteram o registro salvo.
    }
  }, [draftKey]);

  return null;
}
