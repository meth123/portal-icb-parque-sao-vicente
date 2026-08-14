"use client";

import { useActionState } from "react";
import {
  deactivateCell,
  type DeactivateCellState,
} from "./actions";

const initialState: DeactivateCellState = { message: "" };

type DeactivateCellFormProps = {
  cellId: string;
  cellName: string;
  defaultDate: string;
  minimumDate?: string;
};

export function DeactivateCellForm({
  cellId,
  cellName,
  defaultDate,
  minimumDate,
}: DeactivateCellFormProps) {
  const [state, formAction, pending] = useActionState(
    deactivateCell,
    initialState,
  );

  return (
    <details className="mt-8 rounded-2xl border border-red-200 bg-red-50">
      <summary className="cursor-pointer px-5 py-4 font-semibold text-red-900">
        Desativar célula
      </summary>
      <form
        action={formAction}
        className="border-t border-red-200 p-5"
        onSubmit={(event) => {
          const confirmation = window.prompt(
            `Digite o nome da célula para confirmar: ${cellName}`,
          );

          if (confirmation?.trim() !== cellName) {
            event.preventDefault();
            window.alert("O nome informado não corresponde à célula.");
          }
        }}
      >
        <input type="hidden" name="cellId" value={cellId} />

        <p className="text-sm leading-6 text-red-900">
          A célula deixará de aparecer como ativa. Fichas e históricos serão
          preservados.
        </p>

        <div className="mt-4 max-w-xs">
          <label htmlFor="endedOn" className="font-semibold text-red-950">
            Data de encerramento
          </label>
          <input
            id="endedOn"
            name="endedOn"
            type="date"
            defaultValue={defaultDate}
            min={minimumDate}
            max={defaultDate}
            required
            className="mt-2 min-h-12 w-full rounded-xl border border-red-300 bg-white px-4 text-zinc-950 outline-none focus:border-red-700 focus:ring-2 focus:ring-red-200"
          />
        </div>

        {state.message ? (
          <p
            role="alert"
            className="mt-4 rounded-xl border border-red-300 bg-white px-4 py-3 text-sm text-red-800"
          >
            {state.message}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={pending}
          className="mt-5 min-h-12 rounded-xl bg-red-700 px-5 font-semibold text-white hover:bg-red-800 disabled:cursor-wait disabled:bg-red-400"
        >
          {pending ? "Desativando..." : "Confirmar desativação"}
        </button>
      </form>
    </details>
  );
}
