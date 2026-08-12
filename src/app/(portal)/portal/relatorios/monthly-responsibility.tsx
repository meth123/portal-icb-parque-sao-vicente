"use client";

import { useActionState } from "react";
import {
  assignMonthlyReportResponsibility,
  type MonthlyResponsibilityState,
} from "./actions";

type MonthlyResponsibilityProps = {
  cellId: string;
  monthLabel: string;
  currentUserRole: "leader" | "vice_leader";
  leadership: Array<{
    leadershipId: string;
    name: string;
    role: "leader" | "vice_leader";
  }>;
  responsibleLeadershipId: string | null;
  responsibleName: string | null;
  hasError: boolean;
};

const initialState: MonthlyResponsibilityState = {
  message: "",
  success: false,
};

export function MonthlyResponsibility({
  cellId,
  monthLabel,
  currentUserRole,
  leadership,
  responsibleLeadershipId,
  hasError,
}: MonthlyResponsibilityProps) {
  const action = assignMonthlyReportResponsibility.bind(null, cellId);
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <section
      aria-labelledby="monthly-responsibility-heading"
      className="mt-8 rounded-2xl border border-zinc-200 bg-zinc-50 p-5 sm:p-6"
    >
      <p className="text-sm font-semibold text-zinc-600">{monthLabel}</p>
      <h2
        id="monthly-responsibility-heading"
        className="mt-1 text-xl font-semibold text-zinc-950"
      >
        Responsável do mês
      </h2>
      {currentUserRole === "leader" ? (
        leadership.length > 0 ? (
          <form action={formAction} className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="w-full sm:max-w-md">
              <select
                key={responsibleLeadershipId ?? "none"}
                name="responsibleLeadershipId"
                aria-label="Responsável do mês"
                defaultValue={responsibleLeadershipId ?? ""}
                disabled={pending || hasError}
                className="min-h-12 w-full rounded-xl border border-zinc-300 bg-white px-4 text-zinc-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 disabled:opacity-60"
              >
                <option value="">Selecionar responsável</option>
                {leadership.map((person) => (
                  <option
                    key={person.leadershipId}
                    value={person.leadershipId}
                  >
                    {person.name} — {person.role === "leader" ? "Líder" : "Vice-líder"}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="submit"
              disabled={pending || hasError}
              className="min-h-12 rounded-xl bg-zinc-950 px-5 font-semibold text-white hover:bg-zinc-800 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-zinc-900 disabled:cursor-wait disabled:opacity-60"
            >
              {pending ? "Salvando…" : "Salvar"}
            </button>
          </form>
        ) : (
          <p className="mt-4 text-sm text-zinc-600">
            A célula ainda não possui liderança disponível para essa indicação.
          </p>
        )
      ) : null}

      {state.message ? (
        <p
          role={state.success ? "status" : "alert"}
          className={`mt-4 rounded-xl px-4 py-3 text-sm ${
            state.success
              ? "border border-green-200 bg-green-50 text-green-800"
              : "border border-red-200 bg-red-50 text-red-800"
          }`}
        >
          {state.message}
        </p>
      ) : null}
    </section>
  );
}
