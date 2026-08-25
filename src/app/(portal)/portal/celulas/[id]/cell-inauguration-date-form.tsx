"use client";

import { useActionState } from "react";
import { Alert } from "@/components/ui/alert";
import { BrazilianDateInput } from "@/components/ui/brazilian-date-input";
import { Button } from "@/components/ui/button";
import { controlClassName } from "@/components/ui/control-styles";
import { FormField } from "@/components/ui/form-field";
import {
  updateOwnCellInauguration,
  type UpdateCellInaugurationState,
} from "./actions";

const initialState: UpdateCellInaugurationState = { message: "" };

type CellInaugurationDateFormProps = {
  cellId: string;
  startedOn: string;
  maximumDate: string;
};

export function CellInaugurationDateForm({
  cellId,
  startedOn,
  maximumDate,
}: CellInaugurationDateFormProps) {
  const [state, formAction, pending] = useActionState(
    updateOwnCellInauguration,
    initialState,
  );

  return (
    <form action={formAction} className="mt-5 border-t border-app-border pt-5">
      <input type="hidden" name="cellId" value={cellId} />
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <FormField
          id="cellInaugurationDate"
          label="Corrigir data de inauguração"
          hint="Informação histórica. Não altera o acompanhamento nem o envio de Fichas."
        >
          <BrazilianDateInput
            id="cellInaugurationDate"
            name="startedOn"
            defaultValue={startedOn}
            max={maximumDate}
            disabled={pending}
            className={controlClassName}
          />
        </FormField>
        <Button
          type="submit"
          disabled={pending}
          aria-busy={pending}
          className="w-full sm:w-auto"
        >
          {pending ? "Salvando..." : "Salvar data"}
        </Button>
      </div>
      {state.message ? (
        <Alert tone={state.success ? "success" : "danger"} className="mt-4">
          {state.message}
        </Alert>
      ) : null}
    </form>
  );
}
