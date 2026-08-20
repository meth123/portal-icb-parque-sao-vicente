"use client";

import { ClipboardCheck } from "lucide-react";
import { useActionState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
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
  responsibleName,
  hasError,
}: MonthlyResponsibilityProps) {
  const action = assignMonthlyReportResponsibility.bind(null, cellId);
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <section
      aria-labelledby="monthly-responsibility-heading"
      className="rounded-2xl border border-theme-primary-border bg-theme-primary-subtle p-5 sm:p-6"
    >
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-surface text-theme-primary-active">
          <ClipboardCheck aria-hidden="true" className="size-5" />
        </span>
        <div>
          <p className="text-sm font-semibold text-theme-primary-active">{monthLabel}</p>
          <h2
            id="monthly-responsibility-heading"
            className="mt-0.5 text-lg font-semibold text-app-foreground"
          >
            Responsável pela Ficha do mês
          </h2>
          <p className="mt-1 text-sm text-app-secondary">
            {responsibleName ?? "Ainda não definido"}
          </p>
        </div>
      </div>
      {currentUserRole === "leader" || currentUserRole === "vice_leader" ? (
        leadership.length > 0 ? (
          <form action={formAction} className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="w-full sm:max-w-md">
              <select
                key={responsibleLeadershipId ?? "none"}
                name="responsibleLeadershipId"
                aria-label="Responsável do mês"
                defaultValue={responsibleLeadershipId ?? ""}
                disabled={pending || hasError}
                className="min-h-12 w-full rounded-xl border border-app-border bg-surface px-4 text-base text-app-foreground outline-none focus:border-theme-primary focus:ring-2 focus:ring-theme-primary-soft disabled:opacity-60"
              >
                <option value="">Selecionar responsável</option>
                {leadership.map((person) => (
                  <option
                    key={person.leadershipId}
                    value={person.leadershipId}
                  >
                    {person.name}
                  </option>
                ))}
              </select>
            </div>
            <Button
              type="submit"
              disabled={pending || hasError}
              className="sm:min-w-28"
            >
              {pending ? "Salvando…" : "Salvar"}
            </Button>
          </form>
        ) : (
          <p className="mt-4 text-sm text-app-secondary">
            A célula ainda não possui liderança disponível para essa indicação.
          </p>
        )
      ) : null}

      {state.message ? (
        <Alert tone={state.success ? "success" : "danger"} className="mt-4">
          {state.message}
        </Alert>
      ) : null}
    </section>
  );
}
