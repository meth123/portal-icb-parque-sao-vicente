"use client";

import { useActionState, useState } from "react";
import { Alert } from "@/components/ui/alert";
import { BrazilianDateInput } from "@/components/ui/brazilian-date-input";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { FormSection } from "@/components/ui/form-section";
import type {
  CellFormOption,
  CellLeaderOption,
  ManagedCellDetail,
} from "@/lib/data/cell-administration";
import {
  reactivateCell,
  updateCellLeadership,
  type UpdateCellState,
} from "./actions";

const initialState: UpdateCellState = { message: "" };
const fieldClassName =
  "min-h-12 w-full rounded-xl border border-app-border bg-surface px-4 text-base text-app-foreground outline-none focus:border-theme-primary focus:ring-2 focus:ring-theme-primary-subtle read-only:bg-surface-muted read-only:text-app-secondary";

type EditCellLeadershipFormProps = {
  cell: ManagedCellDetail;
  cellTypes: CellFormOption[];
  neighborhoods: CellFormOption[];
  leaders: CellLeaderOption[];
  defaultDate: string;
  minimumDate: string;
};

export function EditCellLeadershipForm({
  cell,
  cellTypes,
  neighborhoods,
  leaders,
  defaultDate,
  minimumDate,
}: EditCellLeadershipFormProps) {
  const initialLeaderProfileId = leaders.some(
    (leader) => leader.value === cell.leaderProfileId,
  )
    ? cell.leaderProfileId
    : (leaders[0]?.value ?? "");
  const [state, formAction, pending] = useActionState(
    cell.isActive ? updateCellLeadership : reactivateCell,
    initialState,
  );
  const [leaderProfileId, setLeaderProfileId] = useState(
    initialLeaderProfileId,
  );
  const [viceProfileIds, setViceProfileIds] = useState(
    new Set(
      cell.viceProfileIds.filter((profileId) =>
        leaders.some((leader) => leader.value === profileId),
      ),
    ),
  );

  function changeLeader(nextLeaderProfileId: string) {
    setLeaderProfileId(nextLeaderProfileId);
    setViceProfileIds((current) => {
      const next = new Set(current);
      next.delete(nextLeaderProfileId);
      return next;
    });
  }

  function changeVice(profileId: string, checked: boolean) {
    setViceProfileIds((current) => {
      const next = new Set(current);
      if (checked) next.add(profileId);
      else next.delete(profileId);
      return next;
    });
  }

  return (
    <form
      action={formAction}
      className="space-y-7"
      onSubmit={(event) => {
        const confirmation = cell.isActive
          ? "Confirmar as alterações desta célula?"
          : "Confirmar a reativação desta célula?";
        if (!window.confirm(confirmation)) event.preventDefault();
      }}
    >
      <input type="hidden" name="cellId" value={cell.id} />

      {state.message ? <Alert tone="danger">{state.message}</Alert> : null}

      <FormSection
        title="Identificação"
        description={
          cell.isActive
            ? "Atualize o nome e informe quando esta configuração passa a valer."
            : "Confirme a célula e defina a data do novo período."
        }
      >
        <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_20rem]">
          <FormField id="name" label="Nome da célula" required>
            <input
              id="name"
              name="name"
              type="text"
              defaultValue={cell.name}
              readOnly={!cell.isActive}
              minLength={2}
              maxLength={120}
              required
              className={fieldClassName}
            />
          </FormField>

          <FormField
            id="effectiveOn"
            label={
              cell.isActive
                ? "Alteração válida a partir de"
                : "Data da reativação"
            }
            required
          >
            <BrazilianDateInput
              id="effectiveOn"
              name="effectiveOn"
              defaultValue={defaultDate}
              min={minimumDate}
              max={defaultDate}
              required
              className={fieldClassName}
            />
          </FormField>
        </div>
      </FormSection>

      <FormSection
        title="Organização e encontro"
        description="Rede, localidade e horário vigentes neste período."
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <FormField id="cellTypeId" label="Rede e tipo" required>
            <select
              id="cellTypeId"
              name="cellTypeId"
              defaultValue={cell.cellTypeId}
              required
              className={fieldClassName}
            >
              {cellTypes.map((cellType) => (
                <option key={cellType.value} value={cellType.value}>
                  {cellType.label}
                </option>
              ))}
            </select>
          </FormField>

          <FormField id="neighborhoodId" label="Bairro e cidade" required>
            <select
              id="neighborhoodId"
              name="neighborhoodId"
              defaultValue={cell.neighborhoodId}
              required
              className={fieldClassName}
            >
              {neighborhoods.map((neighborhood) => (
                <option key={neighborhood.value} value={neighborhood.value}>
                  {neighborhood.label}
                </option>
              ))}
            </select>
          </FormField>

          <FormField id="weekday" label="Dia da reunião" required>
            <select
              id="weekday"
              name="weekday"
              defaultValue={cell.weekday}
              required
              className={fieldClassName}
            >
              <option value={4}>Quinta-feira</option>
              <option value={5}>Sexta-feira</option>
              <option value={6}>Sábado</option>
            </select>
          </FormField>

          <FormField id="meetingTime" label="Horário" required>
            <input
              id="meetingTime"
              name="meetingTime"
              type="time"
              defaultValue={cell.meetingTime}
              required
              className={fieldClassName}
            />
          </FormField>
        </div>
      </FormSection>

      <FormSection
        title="Liderança"
        description="A célula deve permanecer com um Líder; Vice-líderes são opcionais."
      >
        <FormField id="leaderProfileId" label="Líder" required>
          <select
            id="leaderProfileId"
            name="leaderProfileId"
            value={leaderProfileId}
            required
            onChange={(event) => changeLeader(event.target.value)}
            className={fieldClassName}
          >
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
            {leaders
              .filter((leader) => leader.value !== leaderProfileId)
              .map((leader) => (
                <label
                  key={leader.value}
                  className="flex min-h-14 cursor-pointer items-start gap-3 rounded-xl border border-app-border p-4 hover:border-theme-primary-border hover:bg-theme-primary-subtle"
                >
                  <input
                    type="checkbox"
                    name="viceProfileIds"
                    value={leader.value}
                    checked={viceProfileIds.has(leader.value)}
                    onChange={(event) =>
                      changeVice(leader.value, event.target.checked)
                    }
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

        <Alert className="mt-5">
          {cell.isActive
            ? "As funções anteriores permanecem no histórico após a alteração."
            : "A reativação inicia um novo período e preserva o histórico anterior."}
        </Alert>
      </FormSection>

      <Button type="submit" disabled={pending} className="w-full">
        {pending
          ? "Salvando..."
          : cell.isActive
            ? "Salvar alterações"
            : "Reativar célula"}
      </Button>
    </form>
  );
}
