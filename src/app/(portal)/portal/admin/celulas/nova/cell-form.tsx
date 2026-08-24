"use client";

import { useActionState } from "react";
import { Alert } from "@/components/ui/alert";
import { BrazilianDateInput } from "@/components/ui/brazilian-date-input";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { FormSection } from "@/components/ui/form-section";
import type {
  CellFormOption,
  CellLeaderOption,
} from "@/lib/data/cell-administration";
import { createCell, type CreateCellState } from "./actions";

const initialState: CreateCellState = { message: "" };
const fieldClassName =
  "min-h-12 w-full rounded-xl border border-app-border bg-surface px-4 text-base text-app-foreground outline-none focus:border-theme-primary focus:ring-2 focus:ring-theme-primary-subtle";

const weekdays = [
  { value: "4", label: "Quinta-feira" },
  { value: "5", label: "Sexta-feira" },
  { value: "6", label: "Sábado" },
];

type CellFormProps = {
  cellTypes: CellFormOption[];
  neighborhoods: CellFormOption[];
  leaders: CellLeaderOption[];
  defaultDate: string;
};

export function CellForm({
  cellTypes,
  neighborhoods,
  leaders,
  defaultDate,
}: CellFormProps) {
  const [state, formAction, pending] = useActionState(createCell, initialState);

  return (
    <form action={formAction} className="space-y-7">
      {state.message ? <Alert tone="danger">{state.message}</Alert> : null}

      <FormSection
        title="Identificação"
        description="Informações que identificam a célula na organização."
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <FormField
            id="name"
            label="Nome da célula"
            required
            className="sm:col-span-2"
          >
            <input
              id="name"
              name="name"
              type="text"
              minLength={2}
              maxLength={120}
              autoComplete="off"
              required
              className={fieldClassName}
            />
          </FormField>

          <FormField id="cellTypeId" label="Rede e tipo" required>
            <select
              id="cellTypeId"
              name="cellTypeId"
              required
              defaultValue=""
              className={fieldClassName}
            >
              <option value="" disabled>
                Selecione
              </option>
              {cellTypes.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </FormField>

          <FormField id="neighborhoodId" label="Cidade e bairro" required>
            <select
              id="neighborhoodId"
              name="neighborhoodId"
              required
              defaultValue=""
              className={fieldClassName}
            >
              <option value="" disabled>
                Selecione
              </option>
              {neighborhoods.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </FormField>
        </div>
      </FormSection>

      <FormSection
        title="Encontro"
        description="Dia, horário e data histórica em que a célula foi criada."
      >
        <div className="grid gap-5 sm:grid-cols-3">
          <FormField id="weekday" label="Dia" required>
            <select
              id="weekday"
              name="weekday"
              defaultValue="4"
              required
              className={fieldClassName}
            >
              {weekdays.map((weekday) => (
                <option key={weekday.value} value={weekday.value}>
                  {weekday.label}
                </option>
              ))}
            </select>
          </FormField>

          <FormField id="meetingTime" label="Horário" required>
            <input
              id="meetingTime"
              name="meetingTime"
              type="time"
              defaultValue="20:00"
              required
              className={fieldClassName}
            />
          </FormField>

          <FormField
            id="startedOn"
            label="Início da célula"
            hint="Informe quando a célula foi criada de verdade. As Fichas serão acompanhadas a partir da semana do cadastro no portal."
            required
          >
            <BrazilianDateInput
              id="startedOn"
              name="startedOn"
              defaultValue={defaultDate}
              max={defaultDate}
              required
              className={fieldClassName}
            />
          </FormField>
        </div>
      </FormSection>

      <FormSection
        title="Liderança"
        description="Líder e Vice-líderes são opcionais e podem ser definidos depois."
      >
        <FormField
          id="leadershipStartsOn"
          label="Início dos vínculos"
          hint="Se selecionar alguém abaixo, informe quando essa pessoa assumiu a função nesta célula. Esta data é independente do início da célula."
        >
          <BrazilianDateInput
            id="leadershipStartsOn"
            name="leadershipStartsOn"
            defaultValue={defaultDate}
            max={defaultDate}
            className={fieldClassName}
          />
        </FormField>

        <FormField id="leaderProfileId" label="Líder">
          <select
            id="leaderProfileId"
            name="leaderProfileId"
            defaultValue=""
            className={fieldClassName}
          >
            <option value="">
              Não definido
            </option>
            {leaders.map((leader) => (
              <option key={leader.value} value={leader.value}>
                {leader.label} — {leader.description}
              </option>
            ))}
          </select>
        </FormField>

        <fieldset className="mt-6">
          <legend className="font-semibold text-app-foreground">
            Vice-líderes{" "}
            <span className="font-normal text-app-secondary">(opcional)</span>
          </legend>
          <div className="mt-3 grid max-h-80 gap-3 overflow-y-auto pr-1 sm:grid-cols-2">
            {leaders.map((leader) => (
              <label
                key={leader.value}
                className="flex min-h-14 cursor-pointer items-start gap-3 rounded-xl border border-app-border bg-surface p-4 hover:border-theme-primary-border hover:bg-theme-primary-subtle"
              >
                <input
                  type="checkbox"
                  name="viceProfileIds"
                  value={leader.value}
                  className="mt-1 size-5 shrink-0 accent-theme-primary"
                />
                <span className="min-w-0">
                  <span className="block font-medium text-app-foreground">
                    {leader.label}
                  </span>
                  <span className="mt-1 block break-words text-sm text-app-secondary">
                    {leader.description}
                  </span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>
      </FormSection>

      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Cadastrando..." : "Cadastrar célula"}
      </Button>
    </form>
  );
}
