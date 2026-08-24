"use client";

import Link from "next/link";
import { Check, Copy, UserPlus } from "lucide-react";
import { useActionState, useState } from "react";
import { Alert } from "@/components/ui/alert";
import { BrazilianDateInput } from "@/components/ui/brazilian-date-input";
import { Button, buttonClassName } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import type { ManagedCellSummary } from "@/lib/data/cell-administration";
import {
  createQuickUser,
  type CreateQuickUserState,
} from "./actions";

const initialState: CreateQuickUserState = { message: "", success: false };
const fieldClassName =
  "min-h-12 w-full rounded-xl border border-app-border bg-surface px-4 text-base text-app-foreground outline-none focus:border-theme-primary focus:ring-2 focus:ring-theme-primary-subtle disabled:cursor-not-allowed disabled:bg-surface-muted disabled:text-app-secondary";

type QuickUserFormProps = {
  cells: ManagedCellSummary[];
  currentDate: string;
  leadershipLinkingAvailable: boolean;
};

export function QuickUserForm({
  cells,
  currentDate,
  leadershipLinkingAvailable,
}: QuickUserFormProps) {
  const [state, formAction, pending] = useActionState(
    createQuickUser,
    initialState,
  );
  const [cellId, setCellId] = useState("");
  const [leadershipRole, setLeadershipRole] = useState("");
  const [copied, setCopied] = useState(false);
  const selectedCell = cells.find((cell) => cell.id === cellId);
  const requiresLeaderReplacement =
    leadershipRole === "leader" &&
    (selectedCell?.hasLeader || state.requiresLeaderReplacement);
  const currentLeaderName =
    (selectedCell?.hasLeader ? selectedCell.leaderName : state.currentLeaderName) ??
    "Nome não informado";

  async function copyAccess() {
    if (!state.createdEmail || !state.temporaryPassword) return;

    await navigator.clipboard.writeText(
      [
        state.createdName ? `Nome: ${state.createdName}` : "",
        `E-mail: ${state.createdEmail}`,
        `Senha temporária: ${state.temporaryPassword}`,
      ]
        .filter(Boolean)
        .join("\n"),
    );
    setCopied(true);
  }

  if (
    state.success &&
    state.createdName &&
    state.createdEmail &&
    state.temporaryPassword
  ) {
    return (
      <div className="space-y-5 text-center">
        <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-success-soft text-success">
          <Check aria-hidden="true" className="size-6" />
        </span>
        <div>
          <h1 className="text-2xl font-semibold text-app-foreground">
            Usuário criado
          </h1>
          <p className="mt-2 text-sm leading-6 text-app-secondary">
            Copie o acesso agora. A senha temporária não poderá ser recuperada
            depois que você sair desta tela.
          </p>
        </div>

        <dl className="space-y-3 rounded-xl border border-app-border bg-surface-muted p-4 text-left">
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-app-secondary">
              Nome
            </dt>
            <dd className="mt-1 font-medium text-app-foreground">
              {state.createdName}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-app-secondary">
              E-mail
            </dt>
            <dd className="mt-1 break-all text-app-foreground">
              {state.createdEmail}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-app-secondary">
              Senha temporária
            </dt>
            <dd className="mt-1 break-all rounded-lg bg-surface px-3 py-2 font-mono text-base text-app-foreground">
              {state.temporaryPassword}
            </dd>
          </div>
        </dl>

        <Button type="button" onClick={copyAccess} className="w-full">
          {copied ? (
            <Check aria-hidden="true" className="size-4" />
          ) : (
            <Copy aria-hidden="true" className="size-4" />
          )}
          {copied ? "Acesso copiado" : "Copiar acesso"}
        </Button>

        <div className="grid gap-3 sm:grid-cols-2">
          <Link
            href="/portal/admin/usuarios/novo"
            className={buttonClassName({ variant: "secondary" })}
          >
            Cadastrar outra pessoa
          </Link>
          <Link
            href="/portal/admin"
            className={buttonClassName({ variant: "secondary" })}
          >
            Voltar à administração
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-7">
      <header>
        <p className="text-sm font-semibold text-theme-primary">
          Cadastro Rápido
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-app-foreground">
          Cadastrar usuário
        </h1>
        <p className="mt-2 text-sm leading-6 text-app-secondary">
          Crie a conta com os dados essenciais. O vínculo com uma célula é
          opcional.
        </p>
      </header>

      {state.message ? <Alert tone="danger">{state.message}</Alert> : null}

      <fieldset className="space-y-5">
        <legend className="text-lg font-semibold text-app-foreground">
          Dados pessoais
        </legend>
        <FormField id="fullName" label="Nome completo" required>
          <input
            id="fullName"
            name="fullName"
            type="text"
            minLength={2}
            maxLength={120}
            autoComplete="name"
            required
            disabled={pending}
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
            disabled={pending}
            className={fieldClassName}
          />
        </FormField>
        <FormField id="birthDate" label="Data de nascimento" required>
          <BrazilianDateInput
            id="birthDate"
            name="birthDate"
            defaultValue=""
            max={currentDate}
            required
            disabled={pending}
            className={fieldClassName}
          />
        </FormField>
      </fieldset>

      <fieldset className="space-y-5 border-t border-app-border pt-6">
        <legend className="pr-3 text-lg font-semibold text-app-foreground">
          Liderança
        </legend>
        {!leadershipLinkingAvailable ? (
          <Alert>
            As células não puderam ser carregadas agora. Você ainda pode criar
            o usuário somente com os dados pessoais.
          </Alert>
        ) : null}
        <FormField id="cellId" label="Célula" hint="Opcional">
          <select
            id="cellId"
            name="cellId"
            value={cellId}
            disabled={pending || !leadershipLinkingAvailable}
            onChange={(event) => {
              const nextCellId = event.target.value;
              setCellId(nextCellId);
              if (!nextCellId) setLeadershipRole("");
            }}
            className={fieldClassName}
          >
            <option value="">Sem vínculo com célula</option>
            {cells.map((cell) => (
              <option key={cell.id} value={cell.id}>
                {cell.name} — {cell.networkName} · {cell.cellTypeName}
              </option>
            ))}
          </select>
        </FormField>
        <FormField id="leadershipRole" label="Função" hint="Opcional">
          <select
            id="leadershipRole"
            name="leadershipRole"
            value={leadershipRole}
            disabled={pending || !cellId}
            onChange={(event) => setLeadershipRole(event.target.value)}
            className={fieldClassName}
          >
            <option value="">Selecione</option>
            <option value="leader">Líder</option>
            <option value="vice_leader">Vice-líder</option>
          </select>
        </FormField>
        {cellId && leadershipRole ? (
          <p className="text-xs leading-5 text-app-secondary">
            O vínculo com esta célula começará na data do cadastro. Essa data é
            independente do início da célula e da trajetória geral abaixo.
          </p>
        ) : null}
        {requiresLeaderReplacement ? (
          <div className="rounded-xl border border-warning/30 bg-warning-soft p-4">
            <p className="text-sm font-semibold text-app-foreground">
              Esta célula já possui um líder ativo: {currentLeaderName}.
            </p>
            <label className="mt-3 flex cursor-pointer items-start gap-3 text-sm leading-6 text-app-foreground">
              <input
                type="checkbox"
                name="confirmLeaderReplacement"
                value="yes"
                required
                disabled={pending}
                className="mt-1 size-5 shrink-0 accent-theme-primary"
              />
              <span>
                <strong>Substituir líder</strong>
                <span className="block text-app-secondary">
                  O vínculo atual será encerrado hoje e permanecerá no histórico.
                </span>
              </span>
            </label>
          </div>
        ) : null}
        <FormField
          id="leadershipStartedOn"
          label="Início na liderança"
          hint="Informe quando a pessoa começou a atuar na liderança, mesmo que tenha sido em outra célula."
        >
          <BrazilianDateInput
            id="leadershipStartedOn"
            name="leadershipStartedOn"
            defaultValue=""
            max={currentDate}
            disabled={pending}
            className={fieldClassName}
          />
        </FormField>
      </fieldset>

      <Button type="submit" disabled={pending} className="w-full">
        <UserPlus aria-hidden="true" className="size-4" />
        {pending ? "Cadastrando..." : "Cadastrar usuário"}
      </Button>
    </form>
  );
}
