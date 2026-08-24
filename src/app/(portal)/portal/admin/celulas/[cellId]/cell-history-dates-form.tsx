"use client";

import { useActionState } from "react";
import { Alert } from "@/components/ui/alert";
import { BrazilianDateInput } from "@/components/ui/brazilian-date-input";
import { Button } from "@/components/ui/button";
import { controlClassName as fieldClassName } from "@/components/ui/control-styles";
import { FormField } from "@/components/ui/form-field";
import { FormSection } from "@/components/ui/form-section";
import {
  updateCellHistoryDates,
  type UpdateCellHistoryDatesState,
} from "./actions";

const initialState: UpdateCellHistoryDatesState = { message: "" };
type CellHistoryDatesFormProps = {
  cellId: string;
  startedOn: string;
  reportingStartsOn: string;
  maximumDate: string;
};

export function CellHistoryDatesForm({
  cellId,
  startedOn,
  reportingStartsOn,
  maximumDate,
}: CellHistoryDatesFormProps) {
  const [state, formAction, pending] = useActionState(
    updateCellHistoryDates,
    initialState,
  );

  return (
    <form action={formAction}>
      <input type="hidden" name="cellId" value={cellId} />

      <FormSection
        title="Datas da célula"
        description="Separe a história da célula do início da cobrança de Fichas no portal."
      >
        {state.message ? (
          <Alert tone={state.success ? "success" : "danger"} className="mb-5">
            {state.message}
          </Alert>
        ) : null}

        <div className="grid gap-5 sm:grid-cols-2">
          <FormField
            id="startedOn"
            label="Início da célula"
            hint="Data em que a célula foi criada de verdade."
            required
          >
            <BrazilianDateInput
              id="startedOn"
              name="startedOn"
              defaultValue={startedOn}
              max={maximumDate}
              required
              className={fieldClassName}
            />
          </FormField>

          <FormField
            id="reportingStartsOn"
            label="Acompanhar Fichas a partir de"
            hint="Semanas anteriores não serão marcadas como pendentes."
            required
          >
            <BrazilianDateInput
              id="reportingStartsOn"
              name="reportingStartsOn"
              defaultValue={reportingStartsOn}
              max={maximumDate}
              required
              className={fieldClassName}
            />
          </FormField>
        </div>

        <Button
          type="submit"
          disabled={pending}
          aria-busy={pending}
          className="mt-5 w-full sm:w-auto"
        >
          {pending ? "Salvando datas..." : "Salvar datas"}
        </Button>
      </FormSection>
    </form>
  );
}
