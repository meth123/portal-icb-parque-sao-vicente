"use client";

import { useActionState } from "react";
import { Alert } from "@/components/ui/alert";
import { BrazilianDateInput } from "@/components/ui/brazilian-date-input";
import { Button } from "@/components/ui/button";
import { controlClassName } from "@/components/ui/control-styles";
import type { SupervisionAttendanceNetwork } from "@/lib/data/supervision-attendance";
import { supervisionNetworkLabel } from "@/lib/supervision-attendance";
import {
  createSupervisionAttendance,
  type SupervisionAttendanceActionState,
} from "./actions";

const initialState: SupervisionAttendanceActionState = {
  message: "",
  success: false,
};

export function NewCallForm({
  networks,
  today,
}: {
  networks: SupervisionAttendanceNetwork[];
  today: string;
}) {
  const [state, action, pending] = useActionState(
    createSupervisionAttendance,
    initialState,
  );

  return (
    <form action={action} className="space-y-4">
      {state.message ? <Alert tone="danger">{state.message}</Alert> : null}
      <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-end">
        <label>
          <span className="text-sm font-semibold text-app-foreground">Rede</span>
          <select
            name="networkCode"
            defaultValue={networks[0]?.code ?? ""}
            required
            className={`mt-2 ${controlClassName}`}
          >
            {networks.map((network) => (
              <option key={network.id} value={network.code}>
                {supervisionNetworkLabel(network.code)} — {network.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="text-sm font-semibold text-app-foreground">Data</span>
          <BrazilianDateInput
            id="sessionOn"
            name="sessionOn"
            defaultValue={today}
            max={today}
            required
            className={`mt-2 ${controlClassName}`}
          />
        </label>
        <Button
          type="submit"
          disabled={pending || networks.length === 0}
          aria-busy={pending}
          className="w-full sm:w-auto"
        >
          {pending ? "Abrindo..." : "Iniciar chamada"}
        </Button>
      </div>
    </form>
  );
}
