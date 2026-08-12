import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import { getCellReportHistory } from "@/lib/data/cell-report-history";
import {
  getCellReportFormContext,
  getCurrentMonthlyReportResponsibility,
} from "@/lib/data/cell-reports";
import { MonthlyResponsibility } from "./monthly-responsibility";

export const metadata: Metadata = {
  title: "Histórico de Fichas | Portal ICB Parque São Vicente",
  robots: {
    index: false,
    follow: false,
  },
};

type CellReportsPageProps = {
  searchParams: Promise<{
    celula?: string | string[];
    inicio?: string | string[];
    fim?: string | string[];
    rede?: string | string[];
    tipo?: string | string[];
  }>;
};

function getSingleValue(value: string | string[] | undefined) {
  return typeof value === "string" ? value : "";
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" }).format(
    new Date(`${value}T12:00:00Z`),
  );
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

export default async function CellReportsPage({
  searchParams,
}: CellReportsPageProps) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login?erro=perfil");
  }

  if (!user.isActive) {
    redirect("/portal");
  }

  const resolvedSearchParams = await searchParams;
  const selectedCellId = getSingleValue(resolvedSearchParams.celula);
  const dateFrom = getSingleValue(resolvedSearchParams.inicio);
  const dateTo = getSingleValue(resolvedSearchParams.fim);
  const selectedNetworkId = getSingleValue(resolvedSearchParams.rede);
  const selectedCellTypeId = getSingleValue(resolvedSearchParams.tipo);
  const [history, reportContext, monthlyResponsibility] = await Promise.all([
    getCellReportHistory({
      cellId: selectedCellId,
      dateFrom,
      dateTo,
      networkId: selectedNetworkId,
      cellTypeId: selectedCellTypeId,
    }),
    getCellReportFormContext(),
    getCurrentMonthlyReportResponsibility(),
  ]);

  if (!history) {
    redirect("/portal");
  }

  return (
    <main className="min-h-screen bg-zinc-100 px-4 py-8 sm:px-6 sm:py-10">
      <section className="mx-auto w-full max-w-6xl rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-10">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-zinc-600">
          Área interna · Fase 5
        </p>
        <div className="mt-3 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-zinc-950 sm:text-4xl">
              Histórico de Fichas
            </h1>
            <p className="mt-4 max-w-3xl leading-7 text-zinc-700">
              Consulte as versões atuais das Fichas de Organização que sua conta
              possui permissão para visualizar.
            </p>
          </div>
          {reportContext ? (
            <Link
              href="/portal/relatorios/novo"
              className="flex min-h-12 w-full shrink-0 items-center justify-center rounded-xl bg-zinc-950 px-5 font-semibold text-white hover:bg-zinc-800 sm:w-auto"
            >
              Preencher nova Ficha
            </Link>
          ) : null}
        </div>

        {monthlyResponsibility ? (
          <MonthlyResponsibility {...monthlyResponsibility} />
        ) : null}

        <form
          method="get"
          className="mt-8 grid gap-4 rounded-2xl border border-zinc-200 bg-zinc-50 p-5 md:grid-cols-4"
        >
          {history.canUseOrganizationFilters ? (
            <>
              <label className="md:col-span-2">
                <span className="font-semibold text-zinc-900">Rede</span>
                <select
                  name="rede"
                  defaultValue={selectedNetworkId}
                  className="mt-2 min-h-12 w-full rounded-xl border border-zinc-300 bg-white px-4 text-zinc-950"
                >
                  <option value="">Todas as Redes</option>
                  {history.networks.map((network) => (
                    <option key={network.id} value={network.id}>
                      {network.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="md:col-span-2">
                <span className="font-semibold text-zinc-900">Tipo de célula</span>
                <select
                  name="tipo"
                  defaultValue={selectedCellTypeId}
                  className="mt-2 min-h-12 w-full rounded-xl border border-zinc-300 bg-white px-4 text-zinc-950"
                >
                  <option value="">Todos os tipos</option>
                  {history.cellTypes.map((cellType) => (
                    <option key={cellType.id} value={cellType.id}>
                      {cellType.name}
                    </option>
                  ))}
                </select>
              </label>
            </>
          ) : null}
          <label className="md:col-span-2">
            <span className="font-semibold text-zinc-900">Célula</span>
            <select
              name="celula"
              defaultValue={selectedCellId}
              className="mt-2 min-h-12 w-full rounded-xl border border-zinc-300 bg-white px-4 text-zinc-950"
            >
              <option value="">Todas as células permitidas</option>
              {history.cells.map((cell) => (
                <option key={cell.id} value={cell.id}>
                  {cell.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="font-semibold text-zinc-900">Data inicial</span>
            <input
              type="date"
              name="inicio"
              defaultValue={dateFrom}
              className="mt-2 min-h-12 w-full rounded-xl border border-zinc-300 bg-white px-4 text-zinc-950"
            />
          </label>
          <label>
            <span className="font-semibold text-zinc-900">Data final</span>
            <input
              type="date"
              name="fim"
              defaultValue={dateTo}
              className="mt-2 min-h-12 w-full rounded-xl border border-zinc-300 bg-white px-4 text-zinc-950"
            />
          </label>
          <div className="flex flex-col gap-3 md:col-span-4 sm:flex-row">
            <button
              type="submit"
              className="min-h-12 rounded-xl bg-zinc-950 px-6 font-semibold text-white hover:bg-zinc-800"
            >
              Aplicar filtros
            </button>
            <Link
              href="/portal/relatorios"
              className="flex min-h-12 items-center justify-center rounded-xl border border-zinc-300 bg-white px-6 font-semibold text-zinc-900 hover:bg-zinc-100"
            >
              Limpar filtros
            </Link>
          </div>
        </form>

        {history.hasError ? (
          <p
            role="alert"
            className="mt-8 rounded-xl border border-red-200 bg-red-50 px-4 py-4 text-red-800"
          >
            Não foi possível carregar as Fichas. Tente novamente mais tarde.
          </p>
        ) : history.reports.length > 0 ? (
          <section aria-labelledby="reports-heading" className="mt-8">
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <h2 id="reports-heading" className="text-xl font-semibold text-zinc-950">
                Fichas encontradas
              </h2>
              <p className="text-sm text-zinc-600">
                {history.reports.length} {history.reports.length === 1 ? "Ficha" : "Fichas"}
              </p>
            </div>
            <ul className="mt-4 grid gap-4 lg:grid-cols-2">
              {history.reports.map((report) => (
                <li
                  key={report.versionId}
                  className="rounded-2xl border border-zinc-200 bg-zinc-50 p-5 sm:p-6"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-zinc-600">
                        Data da Célula: {formatDate(report.meetingOn)}
                      </p>
                      <h3 className="mt-1 text-xl font-semibold text-zinc-950">
                        {report.cellName}
                      </h3>
                    </div>
                    <span className="rounded-full bg-white px-3 py-1 text-sm font-semibold text-zinc-700 ring-1 ring-zinc-200">
                      Versão {report.versionNumber}
                    </span>
                  </div>
                  <dl className="mt-5 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                    <div>
                      <dt className="text-zinc-600">Formato</dt>
                      <dd className="mt-1 font-semibold text-zinc-900">
                        {report.meetingFormat === "in_person" ? "Presencial" : "Online"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-zinc-600">Membros</dt>
                      <dd className="mt-1 font-semibold text-zinc-900">{report.membersCount}</dd>
                    </div>
                    <div>
                      <dt className="text-zinc-600">Convidados</dt>
                      <dd className="mt-1 font-semibold text-zinc-900">{report.guestsCount}</dd>
                    </div>
                    <div>
                      <dt className="text-zinc-600">1ª vez</dt>
                      <dd className="mt-1 font-semibold text-zinc-900">
                        {report.firstTimeGuestsCount}
                      </dd>
                    </div>
                  </dl>
                  <p className="mt-4 text-sm text-zinc-600">
                    Enviada em {formatDateTime(report.submittedAt)}
                  </p>
                  <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                    <Link
                      href={`/portal/relatorios/${report.versionId}`}
                      className="flex min-h-12 flex-1 items-center justify-center rounded-xl bg-zinc-950 px-5 font-semibold text-white hover:bg-zinc-800"
                    >
                      Abrir Ficha
                    </Link>
                    <a
                      href={`/portal/relatorios/${report.versionId}/pdf`}
                      className="flex min-h-12 flex-1 items-center justify-center rounded-xl border border-zinc-300 bg-white px-5 font-semibold text-zinc-900 hover:bg-zinc-100"
                    >
                      Baixar PDF
                    </a>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ) : (
          <div className="mt-8 rounded-2xl border border-dashed border-zinc-300 bg-zinc-50 p-8 text-center">
            <h2 className="text-xl font-semibold text-zinc-950">
              Nenhuma Ficha encontrada
            </h2>
            <p className="mt-2 leading-7 text-zinc-600">
              Ajuste os filtros ou preencha a primeira Ficha deste período.
            </p>
          </div>
        )}

        <Link
          href="/portal"
          className="mt-8 flex min-h-12 w-full items-center justify-center rounded-xl border border-zinc-300 bg-white px-5 font-semibold text-zinc-900 hover:bg-zinc-100 sm:w-auto sm:min-w-52"
        >
          Voltar ao portal
        </Link>
      </section>
    </main>
  );
}
