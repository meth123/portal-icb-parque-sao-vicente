"use client";

import { useActionState } from "react";
import type {
  CellFormOption,
  CellLeaderOption,
} from "@/lib/data/cell-administration";
import { createCell, type CreateCellState } from "./actions";

const initialState: CreateCellState = { message: "" };

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
  const fieldClassName =
    "mt-2 min-h-12 w-full rounded-xl border border-zinc-300 bg-white px-4 text-base text-zinc-950 outline-none transition focus:border-zinc-700 focus:ring-2 focus:ring-zinc-200";

  return (
    <form action={formAction} className="mt-8 space-y-7">
      {state.message ? (
        <p
          role="alert"
          aria-live="polite"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-4 text-red-800"
        >
          {state.message}
        </p>
      ) : null}

      <div>
        <label htmlFor="name" className="font-semibold text-zinc-950">
          Nome da célula
        </label>
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
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <div>
          <label htmlFor="cellTypeId" className="font-semibold text-zinc-950">
            Rede e tipo
          </label>
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
        </div>

        <div>
          <label htmlFor="neighborhoodId" className="font-semibold text-zinc-950">
            Cidade e bairro
          </label>
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
        </div>
      </div>

      <div className="grid gap-6 sm:grid-cols-3">
        <div>
          <label htmlFor="weekday" className="font-semibold text-zinc-950">
            Dia
          </label>
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
        </div>

        <div>
          <label htmlFor="meetingTime" className="font-semibold text-zinc-950">
            Horário
          </label>
          <input
            id="meetingTime"
            name="meetingTime"
            type="time"
            defaultValue="20:00"
            required
            className={fieldClassName}
          />
        </div>

        <div>
          <label htmlFor="startedOn" className="font-semibold text-zinc-950">
            Data de início
          </label>
          <input
            id="startedOn"
            name="startedOn"
            type="date"
            defaultValue={defaultDate}
            required
            className={fieldClassName}
          />
        </div>
      </div>

      <div>
        <label htmlFor="leaderProfileId" className="font-semibold text-zinc-950">
          Líder
        </label>
        <select
          id="leaderProfileId"
          name="leaderProfileId"
          required
          defaultValue=""
          className={fieldClassName}
        >
          <option value="" disabled>
            Selecione uma conta ativa
          </option>
          {leaders.map((leader) => (
            <option key={leader.value} value={leader.value}>
              {leader.label} — {leader.description}
            </option>
          ))}
        </select>
      </div>

      <fieldset>
        <legend className="font-semibold text-zinc-950">
          Vice-líderes <span className="font-normal text-zinc-600">(opcional)</span>
        </legend>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {leaders.map((leader) => (
            <label
              key={leader.value}
              className="flex min-h-14 cursor-pointer items-start gap-3 rounded-xl border border-zinc-300 bg-white p-4 hover:bg-zinc-50"
            >
              <input
                type="checkbox"
                name="viceProfileIds"
                value={leader.value}
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

      <button
        type="submit"
        disabled={pending}
        className="min-h-12 w-full rounded-xl bg-zinc-950 px-5 text-base font-semibold text-white transition-colors hover:bg-zinc-800 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-zinc-900 disabled:cursor-wait disabled:bg-zinc-500"
      >
        {pending ? "Cadastrando..." : "Cadastrar célula"}
      </button>
    </form>
  );
}
