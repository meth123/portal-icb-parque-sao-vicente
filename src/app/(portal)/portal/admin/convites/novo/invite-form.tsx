"use client";

import Image from "next/image";
import Link from "next/link";
import { Check, Copy, UserPlus } from "lucide-react";
import { useActionState, useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button, buttonClassName } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import type { ManagedCellSummary } from "@/lib/data/cell-administration";
import {
  createLeadershipInvite,
  type CreateLeadershipInviteState,
} from "./actions";

const initialState: CreateLeadershipInviteState = {
  message: "",
  success: false,
};
const fieldClassName =
  "min-h-12 w-full rounded-xl border border-app-border bg-surface px-4 text-base text-app-foreground outline-none focus:border-theme-primary focus:ring-2 focus:ring-theme-primary-subtle";

export function InviteForm({ cells }: { cells: ManagedCellSummary[] }) {
  const hasExistingCells = cells.length > 0;
  const [state, formAction, pending] = useActionState(
    createLeadershipInvite,
    initialState,
  );
  const [leadershipRole, setLeadershipRole] = useState(
    hasExistingCells ? "vice_leader" : "leader",
  );
  const [cellId, setCellId] = useState(
    hasExistingCells ? "" : "new-cell",
  );
  const [copied, setCopied] = useState(false);

  async function copyInviteLink() {
    if (!state.inviteLink) return;
    await navigator.clipboard.writeText(state.inviteLink);
    setCopied(true);
  }

  if (state.success && (state.inviteLink || state.temporaryPassword)) {
    return (
      <div className="space-y-5 text-center">
        <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-success-soft text-success">
          <Check aria-hidden="true" className="size-6" />
        </span>
        <div>
          <h2 className="text-xl font-semibold text-app-foreground">
            Conta criada
          </h2>
          {state.temporaryPassword ? (
            <p className="mt-2 text-sm leading-6 text-app-secondary">
              Envie a senha temporária para {state.invitedName}.
            </p>
          ) : (
          <p className="mt-2 text-sm leading-6 text-app-secondary">
            Envie este link para {state.invitedName}. A pessoa definirá a própria
            senha.
          </p>
          )}
          {state.needsCellCreation ? (
            <p className="mt-2 text-sm font-medium leading-6 text-app-foreground">
              Depois, cadastre a nova célula e escolha esta conta como Líder.
            </p>
          ) : null}
        </div>

        {state.temporaryPassword ? (
          <div className="rounded-xl border border-warning/30 bg-warning-soft p-4 text-left">
            <p className="text-sm font-semibold text-app-foreground">
              Senha temporária
            </p>
            <p className="mt-2 break-all rounded-lg bg-surface px-3 py-2 font-mono text-base text-app-foreground">
              {state.temporaryPassword}
            </p>
            <p className="mt-2 text-xs leading-5 text-app-secondary">
              Envie esta senha com segurança. No primeiro acesso, a pessoa deverá criar uma nova senha.
            </p>
          </div>
        ) : null}

        {state.inviteLink ? (
        <div className="rounded-xl border border-app-border bg-surface-muted p-3 text-left">
          <p className="break-all text-sm leading-6 text-app-secondary">
            {state.inviteLink}
          </p>
        </div>
        ) : null}

        {state.inviteLink ? <Button type="button" onClick={copyInviteLink} className="w-full">
          {copied ? (
            <Check aria-hidden="true" className="size-4" />
          ) : (
            <Copy aria-hidden="true" className="size-4" />
          )}
          {copied ? "Link copiado" : "Copiar link"}
        </Button> : null}

        <div className="grid gap-3 sm:grid-cols-2">
          {state.needsCellCreation ? (
            <Link
              href="/portal/admin/celulas/nova"
              className={buttonClassName()}
            >
              Cadastrar a célula
            </Link>
          ) : null}
          <Link
            href="/portal/admin/convites/novo"
            className={buttonClassName({ variant: "secondary" })}
          >
            Cadastrar outra pessoa
          </Link>
          {!state.needsCellCreation ? (
            <Link
              href="/portal/admin"
              className={buttonClassName({ variant: "secondary" })}
            >
              Voltar à administração
            </Link>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-6">
      <div className="text-center">
        <Image
          src="/images/icb-parque-sao-vicente.webp"
          alt="ICB Parque São Vicente"
          width={72}
          height={72}
          className="mx-auto size-16 object-contain brightness-0"
        />
        <h2 className="mt-3 text-xl font-semibold text-app-foreground">
          Nova liderança
        </h2>
      </div>

      {state.message ? <Alert tone="danger">{state.message}</Alert> : null}

      <FormField id="fullName" label="Nome completo" required>
        <input
          id="fullName"
          name="fullName"
          type="text"
          minLength={2}
          maxLength={120}
          autoComplete="name"
          required
          className={fieldClassName}
        />
      </FormField>

      <FormField id="email" label="E-mail" required>
        <input
          id="email"
          name="email"
          type="email"
          maxLength={254}
          autoComplete="email"
          inputMode="email"
          required
          className={fieldClassName}
        />
      </FormField>

      <FormField
        id="cellId"
        label="Célula"
        hint={
          cellId === "new-cell"
            ? "A conta ficará disponível para você cadastrar a nova célula."
            : "A Rede e o tipo serão definidos pela célula."
        }
        required
      >
        <select
          id="cellId"
          name="cellId"
          required
          value={cellId}
          onChange={(event) => setCellId(event.target.value)}
          className={fieldClassName}
        >
          <option value="" disabled>
            Selecione
          </option>
          {leadershipRole === "leader" ? (
            <option value="new-cell">A célula ainda será cadastrada</option>
          ) : null}
          {cells.map((cell) => (
            <option key={cell.id} value={cell.id}>
              {cell.name} — {cell.networkName} · {cell.cellTypeName}
            </option>
          ))}
        </select>
      </FormField>

      <FormField id="leadershipRole" label="Função" required>
        <select
          id="leadershipRole"
          name="leadershipRole"
          value={leadershipRole}
          onChange={(event) => {
            const nextRole = event.target.value;
            setLeadershipRole(nextRole);
            if (nextRole === "vice_leader" && cellId === "new-cell") {
              setCellId("");
            }
          }}
          className={fieldClassName}
        >
          <option value="vice_leader">Vice-líder</option>
          <option value="leader">Líder</option>
        </select>
      </FormField>

      {leadershipRole === "leader" && cellId !== "new-cell" && cellId ? (
        <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-warning/30 bg-warning-soft p-4 text-sm leading-6 text-app-foreground">
          <input
            type="checkbox"
            name="confirmLeaderReplacement"
            value="yes"
            required
            className="mt-1 size-5 shrink-0 accent-theme-primary"
          />
          <span>Confirmo que esta pessoa substituirá o Líder atual.</span>
        </label>
      ) : null}

      <Button type="submit" disabled={pending} className="w-full">
        <UserPlus aria-hidden="true" className="size-4" />
        {pending ? "Criando conta..." : "Criar conta e gerar link"}
      </Button>

      <p className="text-center text-xs leading-5 text-app-secondary">
        Nenhuma senha será criada ou exibida nesta tela.
      </p>
    </form>
  );
}
