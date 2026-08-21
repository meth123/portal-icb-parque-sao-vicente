"use client";

import { ChevronDown, Copy, ShieldCheck } from "lucide-react";
import { useActionState, useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { Surface } from "@/components/ui/surface";
import { UserAvatar } from "@/components/ui/user-avatar";
import type { AdministrationProfile } from "@/lib/data/cell-administration";
import {
  generatePendingAccessLink,
  updateAccountAccess,
  type AccountAccessState,
} from "./actions";

const initialState: AccountAccessState = { message: "", success: false };
const fieldClassName =
  "mt-2 min-h-12 w-full rounded-xl border border-app-border bg-surface px-4 text-base text-app-foreground outline-none focus:border-theme-primary focus:ring-2 focus:ring-theme-primary-subtle disabled:bg-surface-muted disabled:text-app-secondary";

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
  const [linkState, linkFormAction, linkPending] = useActionState(
    generatePendingAccessLink,
    initialState,
  );
  const [role, setRole] = useState(profile.global_role);
  const [isActive, setIsActive] = useState(profile.is_active);
  const [isSupervisor, setIsSupervisor] = useState(profile.is_supervisor);
  const currentCellRoleLabel = cellRoleLabel(profile.current_cell_role);
  const supervisorEligible =
    isActive && role === "user" && profile.current_cell_role === "leader";
  const isPendingFirstAccess = profile.is_active && !profile.full_name;
  const displayName = profile.full_name ?? "Nome não informado";

  function changeRole(nextRole: string) {
    setRole(nextRole);
    if (nextRole !== "user") setIsSupervisor(false);
  }

  function changeStatus(nextStatus: string) {
    const nextIsActive = nextStatus === "active";
    setIsActive(nextIsActive);
    if (!nextIsActive) setIsSupervisor(false);
  }

  return (
    <details className="group overflow-hidden rounded-2xl border border-app-border bg-surface">
      <summary className="cursor-pointer list-none px-4 py-4 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-focus sm:px-5">
        <div className="flex items-start gap-3">
          <UserAvatar name={displayName} size="small" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <p className="font-semibold text-app-foreground">
                  {displayName}
                  {isOwnAccount ? " · Você" : ""}
                </p>
                <p className="mt-1 break-words text-sm text-app-secondary">
                  {profile.email}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <StatusBadge tone={profile.is_active ? "success" : "neutral"}>
                  {profile.is_active ? "Ativa" : "Inativa"}
                </StatusBadge>
                <StatusBadge tone="neutral">
                  {roleLabel(profile.global_role)}
                </StatusBadge>
                {profile.is_supervisor ? (
                  <StatusBadge tone="warning">Supervisor</StatusBadge>
                ) : null}
                {profile.can_manage_cells ? (
                  <StatusBadge tone="theme">Gestão de células</StatusBadge>
                ) : null}
              </div>
            </div>
          </div>
          <ChevronDown
            aria-hidden="true"
            className="mt-2 size-5 shrink-0 text-app-secondary transition-transform group-open:rotate-180"
          />
        </div>
      </summary>

      <div className="border-t border-app-border px-4 py-5 sm:px-5">
        {currentCellRoleLabel && profile.current_cell_name ? (
          <Surface tone="muted" className="text-sm text-app-secondary">
            <span className="font-semibold text-app-foreground">Vínculo atual:</span>{" "}
            {currentCellRoleLabel} · {profile.current_cell_name}
          </Surface>
        ) : null}

        {isOwnAccount ? (
          <Alert className="mt-3">
            Sua própria conta não pode ser alterada nesta tela.
          </Alert>
        ) : (
          <>
            {isPendingFirstAccess ? (
              <div className="mb-4 rounded-xl border border-theme-primary-border bg-theme-primary-subtle p-4">
                <p className="font-semibold text-app-foreground">Primeiro acesso pendente</p>
                <p className="mt-1 text-sm leading-6 text-app-secondary">
                  Gere um novo link para a pessoa criar a própria senha.
                </p>
                <form action={linkFormAction} className="mt-3 space-y-3">
                  <input type="hidden" name="profileId" value={profile.profile_id} />
                  {linkState.message ? (
                    <Alert tone={linkState.success ? "success" : "danger"}>
                      {linkState.message}
                    </Alert>
                  ) : null}
                  {linkState.accessLink ? (
                    <>
                      <p className="break-all rounded-lg border border-app-border bg-surface p-3 text-xs leading-5 text-app-secondary">
                        {linkState.accessLink}
                      </p>
                      <Button
                        type="button"
                        variant="secondary"
                        className="w-full"
                        onClick={() => navigator.clipboard.writeText(linkState.accessLink ?? "")}
                      >
                        <Copy aria-hidden="true" className="size-4" />
                        Copiar link
                      </Button>
                    </>
                  ) : (
                    <Button type="submit" disabled={linkPending} className="w-full">
                      {linkPending ? "Gerando..." : "Gerar novo link"}
                    </Button>
                  )}
                </form>
              </div>
            ) : null}

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
              <Alert tone={state.success ? "success" : "danger"}>
                {state.message}
              </Alert>
            ) : null}

            <div className="grid gap-5 sm:grid-cols-2">
              <label className="min-w-0">
                <span className="font-semibold text-app-foreground">Papel</span>
                <select
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
              </label>

              <label className="min-w-0">
                <span className="font-semibold text-app-foreground">Status</span>
                <select
                  name="status"
                  value={isActive ? "active" : "inactive"}
                  disabled={pending}
                  onChange={(event) => changeStatus(event.target.value)}
                  className={fieldClassName}
                >
                  <option value="active">Ativa</option>
                  <option value="inactive">Inativa</option>
                </select>
              </label>
            </div>

            {supervisorEligible ? (
              <label className="flex min-h-14 cursor-pointer items-start gap-3 rounded-xl border border-theme-primary-border bg-theme-primary-subtle p-4">
                <input
                  type="checkbox"
                  name="isSupervisor"
                  checked={isSupervisor}
                  disabled={pending}
                  onChange={(event) => setIsSupervisor(event.target.checked)}
                  className="mt-1 size-5 shrink-0 accent-theme-primary"
                />
                <span>
                  <span className="flex items-center gap-2 font-semibold text-app-foreground">
                    <ShieldCheck aria-hidden="true" className="size-4 text-theme-primary" />
                    Supervisor
                  </span>
                  <span className="mt-1 block text-sm leading-6 text-app-secondary">
                    Permissão adicional disponível somente para Líder.
                  </span>
                </span>
              </label>
            ) : null}

            <Button type="submit" disabled={pending} className="w-full sm:w-auto">
              {pending ? "Salvando..." : "Salvar acesso"}
            </Button>
          </form>
          </>
        )}
      </div>
    </details>
  );
}
