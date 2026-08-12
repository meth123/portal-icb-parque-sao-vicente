"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import {
  deleteDocumentPublication,
  type DeleteDocumentPublicationState,
} from "./actions";

const initialState: DeleteDocumentPublicationState = {
  message: "",
  success: false,
};

function DeleteButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="flex min-h-12 w-full items-center justify-center rounded-xl border border-red-200 bg-white px-5 font-semibold text-red-800 transition-colors hover:bg-red-50 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-red-800 disabled:cursor-wait disabled:opacity-60"
    >
      {pending ? "Excluindo…" : "Excluir documento"}
    </button>
  );
}

export function DeleteDocumentForm({ publicationId }: { publicationId: string }) {
  const action = deleteDocumentPublication.bind(null, publicationId);
  const [state, formAction] = useActionState(action, initialState);

  return (
    <form
      action={formAction}
      className="mt-3"
      onSubmit={(event) => {
        if (
          !window.confirm(
            "Excluir este documento e seu arquivo PDF? Esta ação não poderá ser desfeita.",
          )
        ) {
          event.preventDefault();
        }
      }}
    >
      <DeleteButton />
      {state.message ? (
        <p
          role={state.success ? "status" : "alert"}
          className={`mt-3 rounded-xl px-3 py-2 text-sm ${
            state.success
              ? "bg-green-50 text-green-800"
              : "bg-red-50 text-red-800"
          }`}
        >
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
