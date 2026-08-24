"use client";

import { AlertTriangle, ChevronDown } from "lucide-react";
import { useActionState } from "react";
import { Alert } from "@/components/ui/alert";
import { BrazilianDateInput } from "@/components/ui/brazilian-date-input";
import { Button } from "@/components/ui/button";
import { dangerControlClassName } from "@/components/ui/control-styles";
import { deactivateCell, type DeactivateCellState } from "./actions";

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
    <details className="group mt-6 overflow-hidden rounded-2xl border border-danger/20 bg-danger-soft">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 font-semibold text-danger focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-focus">
        <span className="flex items-center gap-3">
          <AlertTriangle aria-hidden="true" className="size-5" />
          Desativar célula
        </span>
        <ChevronDown
          aria-hidden="true"
          className="size-5 transition-transform group-open:rotate-180"
        />
      </summary>
      <form
        action={formAction}
        className="border-t border-danger/20 bg-surface p-5"
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

        <p className="max-w-2xl text-sm leading-6 text-app-secondary">
          A célula deixará de aparecer como ativa. Fichas, vínculos e históricos
          serão preservados.
        </p>

        <label className="mt-5 block max-w-xs">
          <span className="font-semibold text-app-foreground">
            Data de encerramento
          </span>
          <BrazilianDateInput
            id="endedOn"
            name="endedOn"
            defaultValue={defaultDate}
            min={minimumDate}
            max={defaultDate}
            required
            className={`mt-2 ${dangerControlClassName}`}
          />
        </label>

        {state.message ? (
          <Alert tone="danger" className="mt-4">
            {state.message}
          </Alert>
        ) : null}

        <Button
          type="submit"
          variant="danger"
          disabled={pending}
          aria-busy={pending}
          className="mt-5 w-full sm:w-auto"
        >
          {pending ? "Desativando..." : "Confirmar desativação"}
        </Button>
      </form>
    </details>
  );
}
