"use client";

import { useActionState, useState } from "react";
import type {
  CellFormOption,
  CellLeaderOption,
  ManagedCellDetail,
} from "@/lib/data/cell-administration";
import { updateCellLeadership, type UpdateCellState } from "./actions";

const initialState: UpdateCellState = { message: "" };

type EditCellLeadershipFormProps = {
  cell: ManagedCellDetail;
  cellTypes: CellFormOption[];
  neighborhoods: CellFormOption[];
  leaders: CellLeaderOption[];
  defaultDate: string;
};

export function EditCellLeadershipForm({
  cell,
  cellTypes,
  neighborhoods,
  leaders,
  defaultDate,
}: EditCellLeadershipFormProps) {
  const [state, formAction, pending] = useActionState(
    updateCellLeadership,
    initialState,
  );
  const [leaderProfileId, setLeaderProfileId] = useState(
    cell.leaderProfileId,
  );
  const [viceProfileIds, setViceProfileIds] = useState(
    new Set(cell.viceProfileIds),
  );
  const fieldClassName =
    "mt-2 min-h-12 w-full rounded-xl border border-zinc-300 bg-white px-4 text-base text-zinc-950 outline-none focus:border-zinc-700 focus:ring-2 focus:ring-zinc-200";

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
      className="mt-8 space-y-7"
      onSubmit={(event) => {
        if (!window.confirm("Confirmar as alterações desta célula?")) {
          event.preventDefault();
        }
      }}
    >
      <input type="hidden" name="cellId" value={cell.id} />

      {state.message ? (
        <p
          role="alert"
          aria-live="polite"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-4 text-red-800"
        >
          {state.message}
        </p>
      ) : null}

      <div className="grid gap-6 sm:grid-cols-[1fr_14rem]">
        <div>
          <label htmlFor="name" className="font-semibold text-zinc-950">
            Nome da célula
          </label>
          <input
            id="name"
            name="name"
            type="text"
            defaultValue={cell.name}
            minLength={2}
            maxLength={120}
            required
            className={fieldClassName}
          />
        </div>

        <div>
          <label
            htmlFor="effectiveOn"
            className="font-semibold text-zinc-950"
          >
            Início da alteração
          </label>
          <input
            id="effectiveOn"
            name="effectiveOn"
            type="date"
            defaultValue={defaultDate}
            min={cell.startedOn ?? undefined}
            max={defaultDate}
            required
            className={fieldClassName}
          />
        </div>
      </div>

      <fieldset>
        <legend className="text-lg font-semibold text-zinc-950">
          Organização e encontro
        </legend>
        <div className="mt-4 grid gap-6 sm:grid-cols-2">
          <div>
            <label htmlFor="cellTypeId" className="font-semibold text-zinc-950">
              Rede e tipo
            </label>
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
          </div>

          <div>
            <label
              htmlFor="neighborhoodId"
              className="font-semibold text-zinc-950"
            >
              Bairro e cidade
            </label>
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
          </div>

          <div>
            <label htmlFor="weekday" className="font-semibold text-zinc-950">
              Dia da reunião
            </label>
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
          </div>

          <div>
            <label
              htmlFor="meetingTime"
              className="font-semibold text-zinc-950"
            >
              Horário
            </label>
            <input
              id="meetingTime"
              name="meetingTime"
              type="time"
              defaultValue={cell.meetingTime}
              required
              className={fieldClassName}
            />
          </div>
        </div>
      </fieldset>

      <div>
        <label
          htmlFor="leaderProfileId"
          className="font-semibold text-zinc-950"
        >
          Líder
        </label>
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
      </div>

      <fieldset>
        <legend className="font-semibold text-zinc-950">
          Vice-líderes{" "}
          <span className="font-normal text-zinc-600">(opcional)</span>
        </legend>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {leaders
            .filter((leader) => leader.value !== leaderProfileId)
            .map((leader) => (
              <label
                key={leader.value}
                className="flex min-h-14 cursor-pointer items-start gap-3 rounded-xl border border-zinc-300 p-4 hover:bg-zinc-50"
              >
                <input
                  type="checkbox"
                  name="viceProfileIds"
                  value={leader.value}
                  checked={viceProfileIds.has(leader.value)}
                  onChange={(event) =>
                    changeVice(leader.value, event.target.checked)
                  }
                  className="mt-1 h-5 w-5 shrink-0 accent-zinc-950"
                />
                <span>
                  <span className="block font-medium text-zinc-950">
                    {leader.label}
                  </span>
                  <span className="mt-1 block break-all text-sm text-zinc-600">
                    {leader.description}
                  </span>
                </span>
              </label>
            ))}
        </div>
      </fieldset>

      <p className="rounded-xl bg-zinc-100 px-4 py-3 text-sm leading-6 text-zinc-700">
        As mudanças estruturais ficam registradas no histórico a partir da data
        informada. Ao retirar um Vice, a conta continuará ativa.
      </p>

      <button
        type="submit"
        disabled={pending}
        className="min-h-12 w-full rounded-xl bg-zinc-950 px-5 font-semibold text-white hover:bg-zinc-800 disabled:cursor-wait disabled:bg-zinc-500"
      >
        {pending ? "Salvando..." : "Salvar alterações"}
      </button>
    </form>
  );
}
