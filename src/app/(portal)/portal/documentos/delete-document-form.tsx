"use client";

import { Trash2 } from "lucide-react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { IconButton } from "@/components/ui/icon-button";
import { deleteDocumentPublication, type DeleteDocumentPublicationState } from "./actions";

const initialState: DeleteDocumentPublicationState = { message: "", success: false };

function DeleteButton() {
  const { pending } = useFormStatus();
  return (
    <IconButton
      type="submit"
      size="compact"
      disabled={pending}
      aria-label={pending ? "Excluindo documento" : "Excluir documento"}
      title="Excluir documento"
      className="text-danger hover:border-danger/30 hover:bg-danger-soft"
    >
      <Trash2 aria-hidden="true" className="size-4" />
    </IconButton>
  );
}

export function DeleteDocumentForm({ publicationId }: { publicationId: string }) {
  const action = deleteDocumentPublication.bind(null, publicationId);
  const [state, formAction] = useActionState(action, initialState);

  return (
    <form
      action={formAction}
      className="shrink-0"
      onSubmit={(event) => {
        if (!window.confirm("Excluir este documento e seu arquivo PDF? Esta ação não poderá ser desfeita.")) {
          event.preventDefault();
        }
      }}
    >
      <DeleteButton />
      {state.message ? (
        <p role={state.success ? "status" : "alert"} className={state.success ? "mt-2 text-sm text-success" : "mt-2 text-sm text-danger"}>
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
