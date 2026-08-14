"use client";

import { useActionState, useState } from "react";
import type { AdministrationProfile } from "@/lib/data/cell-administration";
import {
  updateAccountAccess,
  type AccountAccessState,
} from "./actions";

const initialState: AccountAccessState = { message: "", success: false };

function roleLabel(role: string) {
  if (role === "administrator") return "Administrador";
  if (role === "pastor") return "Pastor";
  return "Usuário";
}

function cellRoleLabel(role: string | null) {
  if (role === "leader") return "Líder";
  if (role === "vice_leader") return "Vice-líder";
  return null;
}

type AccountAccessFormProps = {
  profile: AdministrationProfile;
  isOwnAccount: boolean;
};

export function AccountAccessForm({
  profile,
  isOwnAccount,
}: AccountAccessFormProps) {
  const [state, formAction, pending] = useActionState(
    updateAccountAccess,
    initialState,
  );
  const [role, setRole] = useState(profile.global_role);
  const [isActive, setIsActive] = useState(profile.is_active);
  const [isSupervisor, setIsSupervisor] = useState(profile.is_supervisor);
  const currentCellRoleLabel = cellRoleLabel(profile.current_cell_role);
  const supervisorEligible =
    isActive && role === "user" && profile.current_cell_role === "leader";
  const fieldClassName =
    "mt-2 min-h-12 w-full rounded-xl border border-zinc-300 bg-white px-4 text-base text-zinc-950 outline-none focus:border-zinc-700 focus:ring-2 focus:ring-zinc-200 disabled:bg-zinc-100 disabled:text-zinc-500";

  function changeRole(nextRole: string) {
    setRole(nextRole);

    if (nextRole !== "user") {
      setIsSupervisor(false);
    }

  }

  function changeStatus(nextStatus: string) {
    const nextIsActive = nextStatus === "active";
    setIsActive(nextIsActive);

    if (!nextIsActive) {
      setIsSupervisor(false);
    }
  }

  return (
    <details className="group rounded-2xl border border-zinc-200 bg-white">
      <summary className="cursor-pointer list-none px-4 py-4 sm:px-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="font-semibold text-zinc-950">
              {profile.full_name ?? "Nome não informado"}
              {isOwnAccount ? " · Você" : ""}
            </p>
            <p className="mt-1 break-all text-sm text-zinc-600">
              {profile.email}
            </p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs font-semibold">
            <span
              className={`rounded-full px-3 py-1 ${
                profile.is_active
                  ? "bg-emerald-50 text-emerald-800"
                  : "bg-zinc-200 text-zinc-700"
              }`}
            >
              {profile.is_active ? "Ativa" : "Inativa"}
            </span>
            <span className="rounded-full bg-zinc-100 px-3 py-1 text-zinc-700">
              {roleLabel(profile.global_role)}
            </span>
            {profile.is_supervisor ? (
              <span className="rounded-full bg-amber-50 px-3 py-1 text-amber-800">
                Supervisor
              </span>
            ) : null}
            {profile.can_manage_cells ? (
              <span className="rounded-full bg-blue-50 px-3 py-1 text-blue-800">
                Acesso administrativo
              </span>
            ) : null}
          </div>
        </div>
      </summary>

      <div className="border-t border-zinc-200 px-4 py-5 sm:px-5">
        {currentCellRoleLabel && profile.current_cell_name ? (
          <p className="rounded-xl bg-zinc-100 px-4 py-3 text-sm text-zinc-700">
            <strong className="text-zinc-950">Vínculo atual:</strong>{" "}
            {currentCellRoleLabel} · {profile.current_cell_name}
          </p>
        ) : null}

        {isOwnAccount ? (
          <p className="mt-3 text-sm leading-6 text-zinc-600">
            Sua própria conta não pode ser alterada nesta tela.
          </p>
        ) : (
          <form
            action={formAction}
            className="mt-4 space-y-5"
            onSubmit={(event) => {
              if (!window.confirm("Confirmar a alteração de acesso desta conta?")) {
                event.preventDefault();
              }
            }}
          >
            <input type="hidden" name="profileId" value={profile.profile_id} />

            {state.message ? (
              <p
                role={state.success ? "status" : "alert"}
                aria-live="polite"
                className={`rounded-xl border px-4 py-3 text-sm ${
                  state.success
                    ? "border-green-200 bg-green-50 text-green-900"
                    : "border-red-200 bg-red-50 text-red-800"
                }`}
              >
                {state.message}
              </p>
            ) : null}

            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label
                  htmlFor={`globalRole-${profile.profile_id}`}
                  className="font-semibold text-zinc-950"
                >
                  Papel
                </label>
                <select
                  id={`globalRole-${profile.profile_id}`}
                  name="globalRole"
                  value={role}
                  disabled={pending}
                  onChange={(event) => changeRole(event.target.value)}
                  className={fieldClassName}
                >
                  <option value="user">Usuário</option>
                  <option value="pastor">Pastor</option>
                  <option value="administrator">Administrador</option>
                </select>
              </div>

              <div>
                <label
                  htmlFor={`status-${profile.profile_id}`}
                  className="font-semibold text-zinc-950"
                >
                  Status
                </label>
                <select
                  id={`status-${profile.profile_id}`}
                  name="status"
                  value={isActive ? "active" : "inactive"}
                  disabled={pending}
                  onChange={(event) => changeStatus(event.target.value)}
                  className={fieldClassName}
                >
                  <option value="active">Ativa</option>
                  <option value="inactive">Inativa</option>
                </select>
              </div>
            </div>

            {supervisorEligible ? (
              <label className="flex min-h-14 cursor-pointer items-start gap-3 rounded-xl border border-zinc-300 p-4">
                <input
                  type="checkbox"
                  name="isSupervisor"
                  checked={isSupervisor}
                  disabled={pending}
                  onChange={(event) => setIsSupervisor(event.target.checked)}
                  className="mt-1 h-5 w-5 shrink-0 accent-zinc-950"
                />
                <span>
                  <span className="block font-semibold text-zinc-950">
                    Supervisor
                  </span>
                  <span className="mt-1 block text-sm text-zinc-600">
                    Permissão adicional disponível somente para Líder.
                  </span>
                </span>
              </label>
            ) : null}

            <button
              type="submit"
              disabled={pending}
              className="min-h-12 w-full rounded-xl bg-zinc-950 px-5 font-semibold text-white hover:bg-zinc-800 disabled:cursor-wait disabled:bg-zinc-500 sm:w-auto sm:min-w-48"
            >
              {pending ? "Salvando..." : "Salvar acesso"}
            </button>
          </form>
        )}
      </div>
    </details>
  );
}
