"use client";

import { Trash2 } from "lucide-react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { IconButton } from "@/components/ui/icon-button";
import {
  deleteTestimony,
  type TestimonyMutationResult,
} from "./actions";

const initialState: TestimonyMutationResult = {
  message: "",
  success: false,
};

function DeleteButton() {
  const { pending } = useFormStatus();

  return (
    <IconButton
      type="submit"
      size="compact"
      disabled={pending}
      aria-busy={pending}
      aria-label={pending ? "Excluindo testemunho" : "Excluir testemunho"}
      title="Excluir testemunho"
      className="text-danger hover:border-danger/30 hover:bg-danger-soft"
    >
      <Trash2 aria-hidden="true" className="size-4" />
    </IconButton>
  );
}

export function DeleteTestimonyForm({ testimonyId }: { testimonyId: string }) {
  const action = deleteTestimony.bind(null, testimonyId);
  const [state, formAction] = useActionState(action, initialState);

  return (
    <form
      action={formAction}
      className="shrink-0"
      onSubmit={(event) => {
        if (
          !window.confirm(
            "Excluir este testemunho? As reações também serão removidas e esta ação não poderá ser desfeita.",
          )
        ) {
          event.preventDefault();
        }
      }}
    >
      <DeleteButton />
      {state.message && !state.success ? (
        <p role="alert" className="mt-2 max-w-64 text-sm text-danger">
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
