import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  canAccessAdministration,
  canAccessPastoralDashboard,
  getCurrentUser,
} from "@/lib/auth/current-user";
import { getCellReportDraftKey } from "@/lib/cell-report-draft";
import { canAccessDocumentLibrary } from "@/lib/data/document-library";
import { getInstitutionMonthlyIndicator } from "@/lib/data/institution-dashboard";
import {
  getCellReportFormContext,
  getCurrentMonthlyReportResponsibility,
} from "@/lib/data/cell-reports";
import { logout } from "./actions";
import { ClearCellReportDraft } from "./clear-cell-report-draft";

type PortalPageProps = {
  searchParams: Promise<{ status?: string | string[] }>;
};

export default async function PortalPage({ searchParams }: PortalPageProps) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login?erro=perfil");
  }

  const roleLabels: Record<string, string> = {
    user: "Usuário",
    pastor: "Pastor",
    administrator: "Administrador",
  };
  const roleLabel = roleLabels[user.globalRole] ?? "Usuário";

  if (!user.isActive) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-zinc-100 px-4 py-10 sm:px-6">
        <section className="w-full max-w-lg rounded-3xl border border-zinc-200 bg-white p-6 text-center shadow-sm sm:p-10">
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-950">
            Acesso desativado
          </h1>
          <p className="mt-4 text-base leading-7 text-zinc-700">
            Esta conta está temporariamente sem acesso ao portal. Procure um
            administrador.
          </p>
          <form action={logout} className="mt-8">
            <button
              type="submit"
              className="min-h-12 w-full rounded-xl border border-zinc-300 bg-white px-5 text-base font-semibold text-zinc-900 transition-colors hover:bg-zinc-100 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-zinc-900"
            >
              Sair
            </button>
          </form>
        </section>
      </main>
    );
  }

  const [
    hasDocumentLibraryAccess,
    reportContext,
    monthlyResponsibility,
    institutionIndicator,
    resolvedSearchParams,
  ] =
    await Promise.all([
      canAccessDocumentLibrary(),
      getCellReportFormContext(),
      getCurrentMonthlyReportResponsibility(),
      getInstitutionMonthlyIndicator(),
      searchParams,
    ]);
  const reportWasSubmitted =
    resolvedSearchParams.status === "ficha-enviada";

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-100 px-3 py-6 sm:px-6 sm:py-10">
      <section className="w-full max-w-lg rounded-3xl border border-zinc-200 bg-white p-4 text-center shadow-sm sm:p-10">
        <Image
          src="/images/icb-parque-sao-vicente.png"
          alt="ICB Parque São Vicente"
          width={857}
          height={576}
          priority
          className="mx-auto h-24 w-auto brightness-0"
        />

        <p className="mt-6 text-sm font-semibold uppercase tracking-[0.18em] text-zinc-600">
          Área interna
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-zinc-950">
          Olá, {user.fullName ?? "usuário"}
        </h1>
        <p className="mt-4 text-base leading-7 text-zinc-700">
          Seu perfil está conectado. O painel será construído nas próximas
          etapas.
        </p>

        {reportWasSubmitted ? (
          <>
            {reportContext ? (
              <ClearCellReportDraft
                draftKey={getCellReportDraftKey(user.id, reportContext.cellId)}
              />
            ) : null}
            <p
              role="status"
              className="mt-6 rounded-xl border border-green-200 bg-green-50 px-4 py-4 text-green-900"
            >
              Ficha de Organização enviada com sucesso.
            </p>
          </>
        ) : null}

        {monthlyResponsibility?.isCurrentUserResponsible ? (
          <div className="mx-auto mt-6 w-fit max-w-full rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-center text-blue-950">
            <p className="text-sm font-semibold leading-6">
              Você é o responsável pelas Fichas em{" "}
              <span className="whitespace-nowrap">
                {monthlyResponsibility.monthLabel}
              </span>
              .
            </p>
          </div>
        ) : null}

        {institutionIndicator ? (
          <section className="mt-6 rounded-2xl border border-zinc-200 bg-white px-4 py-5 text-center">
            <p className="text-sm font-semibold text-zinc-600">
              {institutionIndicator.monthLabel}
            </p>
            {institutionIndicator.hasError ? (
              <p className="mt-2 text-sm text-red-700" role="alert">
                Não foi possível carregar o resumo geral.
              </p>
            ) : (
              <p className="mt-2 flex flex-wrap items-baseline justify-center gap-x-2 text-base leading-7 text-zinc-800">
                <strong className="text-3xl text-zinc-950">
                  {institutionIndicator.firstTimeGuests}
                </strong>
                <span>
                  {institutionIndicator.firstTimeGuests === 1
                    ? "convidado pela 1ª vez"
                    : "convidados pela 1ª vez"}
                </span>
              </p>
            )}
            {!institutionIndicator.hasError ? (
              <p className="mt-2 text-sm text-zinc-600">
                Todas as células · Atualizado automaticamente
              </p>
            ) : null}
          </section>
        ) : null}

        <dl className="mt-6 rounded-2xl bg-zinc-100 px-5 py-4 text-left text-sm text-zinc-700">
          {user.email ? (
            <div className="flex flex-col gap-1 py-2 sm:flex-row sm:justify-between sm:gap-4">
              <dt className="font-medium text-zinc-900">E-mail</dt>
              <dd className="break-all sm:text-right">{user.email}</dd>
            </div>
          ) : null}
          <div className="flex justify-between gap-4 border-t border-zinc-200 py-2">
            <dt className="font-medium text-zinc-900">Papel</dt>
            <dd>{roleLabel}</dd>
          </div>
          <div className="flex justify-between gap-4 border-t border-zinc-200 py-2">
            <dt className="font-medium text-zinc-900">Supervisor</dt>
            <dd>{user.isSupervisor ? "Sim" : "Não"}</dd>
          </div>
        </dl>

        <div className="mt-6 space-y-3">
          {reportContext ? (
            <Link
              href="/portal/relatorios/novo"
              className="flex min-h-12 w-full items-center justify-center rounded-xl bg-zinc-950 px-3 py-3 text-sm font-semibold leading-5 text-white transition-colors hover:bg-zinc-800 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-zinc-900 sm:px-5 sm:text-base"
            >
              <span className="sm:hidden">Preencher Ficha</span>
              <span className="hidden sm:inline">Preencher Ficha de Organização</span>
            </Link>
          ) : null}

          {reportContext || canAccessPastoralDashboard(user) ? (
            <Link
              href="/portal/relatorios"
              className="flex min-h-12 w-full items-center justify-center rounded-xl border border-zinc-300 bg-white px-3 py-3 text-sm font-semibold leading-5 text-zinc-900 transition-colors hover:bg-zinc-100 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-zinc-900 sm:px-5 sm:text-base"
            >
              <span className="sm:hidden">Consultar Fichas</span>
              <span className="hidden sm:inline">Consultar Fichas enviadas</span>
            </Link>
          ) : null}

          {reportContext ? (
            <Link
              href={`/portal/celulas/${reportContext.cellId}`}
              className="flex min-h-12 w-full items-center justify-center rounded-xl border border-zinc-300 bg-white px-3 py-3 text-sm font-semibold leading-5 text-zinc-900 transition-colors hover:bg-zinc-100 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-zinc-900 sm:px-5 sm:text-base"
            >
              Minha célula
            </Link>
          ) : null}

          {hasDocumentLibraryAccess ? (
            <Link
              href="/portal/documentos"
              className="flex min-h-12 w-full items-center justify-center rounded-xl border border-zinc-300 bg-white px-5 text-base font-semibold text-zinc-900 transition-colors hover:bg-zinc-100 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-zinc-900"
            >
              Biblioteca de documentos
            </Link>
          ) : null}

          {canAccessPastoralDashboard(user) ? (
            <Link
              href="/portal/organizacao"
              className="flex min-h-12 w-full items-center justify-center rounded-xl border border-zinc-300 bg-white px-5 text-base font-semibold text-zinc-900 transition-colors hover:bg-zinc-100 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-zinc-900"
            >
              Ver estrutura organizacional
            </Link>
          ) : null}

          {canAccessPastoralDashboard(user) ? (
            <Link
              href="/portal/supervisao"
              className="flex min-h-12 w-full items-center justify-center rounded-xl border border-zinc-300 bg-white px-5 text-base font-semibold text-zinc-900 transition-colors hover:bg-zinc-100 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-zinc-900"
            >
              Painel pastoral
            </Link>
          ) : null}

          {canAccessAdministration(user) ? (
            <Link
              href="/portal/admin"
              className="flex min-h-12 w-full items-center justify-center rounded-xl border border-zinc-300 bg-white px-5 text-base font-semibold text-zinc-900 transition-colors hover:bg-zinc-100 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-zinc-900"
            >
              Testar acesso administrativo
            </Link>
          ) : null}
        </div>

        <form action={logout} className="mt-4">
          <button
            type="submit"
            className="min-h-12 w-full rounded-xl border border-zinc-300 bg-white px-5 text-base font-semibold text-zinc-900 transition-colors hover:bg-zinc-100 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-zinc-900"
          >
            Sair
          </button>
        </form>
      </section>
    </main>
  );
}
