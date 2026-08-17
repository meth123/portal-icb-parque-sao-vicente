import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  canAccessPastoralDashboard,
  getCurrentUser,
} from "@/lib/auth/current-user";
import { getPastoralDashboard } from "@/lib/data/pastoral-dashboard";

function formatDate(date: string) {
  return new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" }).format(
    new Date(`${date}T12:00:00Z`),
  );
}

export const metadata: Metadata = {
  title: "Painel pastoral | ICB Conecta",
  robots: {
    index: false,
    follow: false,
  },
};

type SupervisionPageProps = {
  searchParams: Promise<{
    mes?: string | string[];
    rede?: string | string[];
    tipo?: string | string[];
    celula?: string | string[];
    dia?: string | string[];
    responsavel?: string | string[];
    historico?: string | string[];
  }>;
};

export default async function SupervisionPage({
  searchParams,
}: SupervisionPageProps) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (!canAccessPastoralDashboard(user)) {
    redirect("/portal");
  }

  const query = await searchParams;
  const requestedMonth = typeof query.mes === "string" ? query.mes : undefined;
  const requestedNetworkId =
    typeof query.rede === "string" ? query.rede : undefined;
  const requestedCellTypeId =
    typeof query.tipo === "string" ? query.tipo : undefined;
  const requestedCellId =
    typeof query.celula === "string" ? query.celula : undefined;
  const requestedWeekday =
    typeof query.dia === "string" ? query.dia : undefined;
  const requestedSubmitterProfileId =
    typeof query.responsavel === "string" ? query.responsavel : undefined;
  const requestedHistoryMonths =
    typeof query.historico === "string" ? query.historico : undefined;
  const dashboard = await getPastoralDashboard({
    month: requestedMonth,
    networkId: requestedNetworkId,
    cellTypeId: requestedCellTypeId,
    cellId: requestedCellId,
    weekday: requestedWeekday,
    submitterProfileId: requestedSubmitterProfileId,
    historyMonths: requestedHistoryMonths,
  });

  if (!dashboard) {
    redirect("/portal");
  }

  const metrics = dashboard.metrics;
  const formatAverage = (value: number) =>
    value.toLocaleString("pt-BR", { maximumFractionDigits: 1 });
  const highestFirstTimeTotal = Math.max(
    1,
    ...dashboard.firstTimeHistory.map((item) => item.firstTimeGuests),
  );
  const cards = [
    {
      label: "Células ativas",
      value: dashboard.activeCells,
      note: "no filtro",
    },
    {
      label: "Fichas recebidas",
      value: metrics.reports,
      note: "no período",
    },
    {
      label: "Fichas atrasadas",
      value: dashboard.overdueWeeks.length,
      note: "prazo até domingo",
    },
    {
      label: "Média de membros presentes",
      value: formatAverage(metrics.averageMembers),
      note: "por reunião",
    },
    {
      label: "Média de convidados",
      value: formatAverage(metrics.averageGuests),
      note: "por reunião",
    },
    {
      label: "1ª vez",
      value: metrics.firstTimeGuests,
      note: "total no período",
    },
    {
      label: "Média de presentes",
      value: formatAverage(metrics.averageAttendance),
      note: "por reunião",
    },
  ];

  return (
    <main className="min-h-screen bg-zinc-100 px-4 py-10 sm:px-6">
      <div className="mx-auto w-full max-w-5xl">
        <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-10">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-zinc-600">
            Área pastoral
          </p>
          <div className="mt-3 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight text-zinc-950 sm:text-4xl">
                Visão geral
              </h1>
              <p className="mt-3 text-base leading-7 text-zinc-700">
                Resumo das células selecionadas em{" "}
                {dashboard.monthLabel.toLowerCase()}.
              </p>
            </div>
          </div>

          <form className="mt-7 grid gap-3 rounded-2xl bg-zinc-100 p-4 sm:grid-cols-2 lg:grid-cols-4 lg:items-end">
            <div className="min-w-0">
                <label
                  htmlFor="pastoral-month"
                  className="mb-1 block text-sm font-medium text-zinc-700"
                >
                  Período
                </label>
                <input
                  id="pastoral-month"
                  name="mes"
                  type="month"
                  defaultValue={dashboard.month}
                  className="min-h-11 w-full rounded-xl border border-zinc-300 bg-white px-3 text-zinc-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900"
                />
            </div>

            <div className="min-w-0">
              <label
                htmlFor="pastoral-weekday"
                className="mb-1 block text-sm font-medium text-zinc-700"
              >
                Dia
              </label>
              <select
                id="pastoral-weekday"
                name="dia"
                defaultValue={dashboard.selectedWeekday}
                className="min-h-11 w-full rounded-xl border border-zinc-300 bg-white px-3 text-zinc-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900"
              >
                <option value="">Todos os dias</option>
                <option value="4">Quinta-feira</option>
                <option value="5">Sexta-feira</option>
                <option value="6">Sábado</option>
              </select>
            </div>

            <div className="min-w-0">
              <label
                htmlFor="pastoral-submitter"
                className="mb-1 block text-sm font-medium text-zinc-700"
              >
                Enviada por
              </label>
              <select
                id="pastoral-submitter"
                name="responsavel"
                defaultValue={dashboard.selectedSubmitterProfileId}
                className="min-h-11 w-full rounded-xl border border-zinc-300 bg-white px-3 text-zinc-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900"
              >
                <option value="">Todas as pessoas</option>
                {dashboard.submitters.map((submitter) => (
                  <option key={submitter.id} value={submitter.id}>
                    {submitter.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="min-w-0">
              <label
                htmlFor="pastoral-history"
                className="mb-1 block text-sm font-medium text-zinc-700"
              >
                Histórico
              </label>
              <select
                id="pastoral-history"
                name="historico"
                defaultValue={String(dashboard.historyMonths)}
                className="min-h-11 w-full rounded-xl border border-zinc-300 bg-white px-3 text-zinc-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900"
              >
                <option value="3">3 meses</option>
                <option value="6">6 meses</option>
                <option value="12">12 meses</option>
              </select>
            </div>

            <div className="min-w-0">
              <label
                htmlFor="pastoral-network"
                  className="mb-1 block text-sm font-medium text-zinc-700"
                >
                  Rede
                </label>
                <select
                  id="pastoral-network"
                  name="rede"
                  defaultValue={dashboard.selectedNetworkId}
                  className="min-h-11 w-full rounded-xl border border-zinc-300 bg-white px-3 text-zinc-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900"
                >
                  <option value="">Todas as Redes</option>
                  {dashboard.networks.map((network) => (
                    <option key={network.id} value={network.id}>
                      {network.name}
                    </option>
                  ))}
                </select>
            </div>

            <div className="min-w-0">
                <label
                  htmlFor="pastoral-cell-type"
                  className="mb-1 block text-sm font-medium text-zinc-700"
                >
                  Tipo de célula
                </label>
                <select
                  id="pastoral-cell-type"
                  name="tipo"
                  defaultValue={dashboard.selectedCellTypeId}
                  className="min-h-11 w-full rounded-xl border border-zinc-300 bg-white px-3 text-zinc-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900"
                >
                  <option value="">Todos os tipos</option>
                  {dashboard.cellTypes.map((cellType) => (
                    <option key={cellType.id} value={cellType.id}>
                      {cellType.name}
                    </option>
                  ))}
                </select>
            </div>

            <div className="min-w-0">
              <label
                htmlFor="pastoral-cell"
                className="mb-1 block text-sm font-medium text-zinc-700"
              >
                Célula
              </label>
              <select
                id="pastoral-cell"
                name="celula"
                defaultValue={dashboard.selectedCellId}
                className="min-h-11 w-full rounded-xl border border-zinc-300 bg-white px-3 text-zinc-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900"
              >
                <option value="">Todas as células</option>
                {dashboard.cells.map((cell) => (
                  <option key={cell.id} value={cell.id}>
                    {cell.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center justify-end gap-2 sm:col-span-2 lg:col-span-4">
                <button
                  type="submit"
                  className="min-h-10 rounded-xl bg-zinc-950 px-5 text-sm font-semibold text-white hover:bg-zinc-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900"
                >
                  Filtrar
                </button>
                <Link
                  href="/portal/supervisao"
                  className="flex min-h-10 items-center justify-center rounded-xl border border-zinc-300 bg-white px-5 text-sm font-semibold text-zinc-900 hover:bg-zinc-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900"
                >
                  Limpar
                </Link>
            </div>
          </form>

          {dashboard.hasError ? (
            <p
              role="alert"
              className="mt-8 rounded-xl border border-red-200 bg-red-50 px-4 py-4 text-red-800"
            >
              Não foi possível carregar o resumo pastoral.
            </p>
          ) : (
            <>
              <dl className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {cards.map((card) => (
                  <div
                    key={card.label}
                    className="rounded-2xl bg-zinc-100 px-4 py-5 text-center"
                  >
                    <dt className="text-sm font-semibold text-zinc-600">
                      {card.label}
                    </dt>
                    <dd className="mt-2 text-3xl font-semibold text-zinc-950">
                      {card.value}
                    </dd>
                    <p className="mt-1 text-xs text-zinc-600">{card.note}</p>
                  </div>
                ))}
              </dl>

              {metrics.reports === 0 ? (
                <p className="mt-5 text-center text-sm text-zinc-600">
                  Nenhuma Ficha recebida neste período.
                </p>
              ) : null}

              <section className="mt-8 rounded-2xl border border-zinc-200 p-4 sm:p-6">
                <h2 className="text-xl font-semibold text-zinc-950">
                  Fichas atrasadas
                </h2>
                <p className="mt-1 text-sm leading-6 text-zinc-600">
                  Sem Ficha até domingo, a semana aparece como atrasada na
                  segunda-feira.
                </p>

                {dashboard.overdueWeeks.length > 0 ? (
                  <details className="mt-5 rounded-xl bg-zinc-100">
                    <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-zinc-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900">
                      Ver lista ({dashboard.overdueWeeks.length})
                    </summary>
                    <ul className="max-h-80 divide-y divide-zinc-200 overflow-y-auto border-t border-zinc-200 px-4">
                      {dashboard.overdueWeeks.map((week) => (
                        <li
                          key={`${week.cellId}-${week.weekEndsOn}`}
                          className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:justify-between"
                        >
                          <div>
                            <p className="font-semibold text-zinc-950">
                              {week.cellName}
                            </p>
                            <p className="mt-1 text-sm text-zinc-600">
                              Semana encerrada em {formatDate(week.weekEndsOn)}
                            </p>
                          </div>
                          <span className="text-sm font-medium text-red-800">
                            {week.status === "submitted_late" && week.submittedOn
                              ? `Enviada em ${formatDate(week.submittedOn)} com atraso`
                              : "Pendente"}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </details>
                ) : (
                  <p className="mt-4 rounded-xl bg-green-50 px-4 py-3 text-sm font-medium text-green-900">
                    Nenhuma Ficha atrasada neste período.
                  </p>
                )}
              </section>

              <section className="mt-8 rounded-2xl border border-zinc-200 p-4 sm:p-6">
                <h2 className="text-xl font-semibold text-zinc-950">
                  Primeira vez nos últimos {dashboard.historyMonths} meses
                </h2>
                <p className="mt-1 text-sm leading-6 text-zinc-600">
                  Total mensal conforme a Rede e o tipo selecionados.
                </p>

                <ul className="mt-5 space-y-4">
                  {dashboard.firstTimeHistory.map((item) => {
                    const barWidth =
                      (item.firstTimeGuests / highestFirstTimeTotal) * 100;

                    return (
                      <li
                        key={item.month}
                        className="grid grid-cols-[minmax(6.5rem,auto)_1fr_auto] items-center gap-3"
                      >
                        <span className="text-sm font-medium text-zinc-700">
                          {item.monthLabel}
                        </span>
                        <span
                          className="h-3 overflow-hidden rounded-full bg-zinc-100"
                          aria-hidden="true"
                        >
                          <span
                            className="block h-full rounded-full bg-zinc-900"
                            style={{ width: `${barWidth}%` }}
                          />
                        </span>
                        <span
                          className="min-w-7 text-right text-sm font-semibold text-zinc-950"
                          aria-label={`${item.monthLabel}: ${item.firstTimeGuests} convidados pela primeira vez`}
                        >
                          {item.firstTimeGuests}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </section>

              <section className="mt-8 rounded-2xl bg-zinc-950 p-5 text-white sm:p-6">
                <div className="flex flex-col gap-4 text-center sm:flex-row sm:items-center sm:justify-between sm:text-left">
                  <div>
                    <div className="flex items-center justify-center gap-2 sm:justify-start">
                      <h2 className="text-xl font-semibold">
                        Participação no evangelismo
                      </h2>
                      <details className="group relative">
                        <summary
                          className="flex size-6 cursor-pointer list-none items-center justify-center rounded-full border border-zinc-500 text-xs font-bold text-white hover:bg-zinc-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white [&::-webkit-details-marker]:hidden"
                          aria-label="Como esta participação é calculada?"
                        >
                          i
                        </summary>
                        <div className="absolute left-1/2 z-10 mt-2 w-64 -translate-x-1/2 rounded-xl border border-zinc-200 bg-white p-3 text-left text-sm font-normal leading-6 text-zinc-700 shadow-lg sm:left-0 sm:translate-x-0">
                          Cada pessoa conta somente uma vez no mês, mesmo que
                          participe de vários registros de evangelismo.
                        </div>
                      </details>
                    </div>
                    <p className="mt-1 text-sm leading-6 text-zinc-300">
                      {dashboard.evangelismParticipation.percentage === null
                        ? "Sem Fichas para calcular este período."
                        : `${dashboard.evangelismParticipation.evangelized} de ${dashboard.evangelismParticipation.accompanied} entre Líderes e Vice-líderes participaram no mês.`}
                    </p>
                  </div>
                  <strong className="text-3xl">
                    {dashboard.evangelismParticipation.percentage === null
                      ? "—"
                      : `${dashboard.evangelismParticipation.percentage}%`}
                  </strong>
                </div>
                <div
                  className="mt-4 h-4 overflow-hidden rounded-full bg-zinc-700"
                  role="progressbar"
                  aria-label="Participação mensal de Líderes e Vice-líderes no evangelismo"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={
                    dashboard.evangelismParticipation.percentage ?? undefined
                  }
                >
                  <span
                    className="block h-full rounded-full bg-white"
                    style={{
                      width: `${dashboard.evangelismParticipation.percentage ?? 0}%`,
                    }}
                  />
                </div>
              </section>

              <section className="mt-8 rounded-2xl border border-zinc-200 p-4 sm:p-6">
                <h2 className="text-xl font-semibold text-zinc-950">
                  Evangelismo nos últimos {dashboard.historyMonths} meses
                </h2>
                <p className="mt-1 text-sm leading-6 text-zinc-600">
                  Participação mensal conforme os filtros selecionados.
                </p>

                <ul className="mt-5 space-y-4">
                  {dashboard.evangelismHistory.map((item) => (
                    <li
                      key={item.month}
                      className="grid grid-cols-[minmax(6.5rem,auto)_1fr_auto] items-center gap-3"
                    >
                      <span className="text-sm font-medium text-zinc-700">
                        {item.monthLabel}
                      </span>
                      <span
                        className="h-3 overflow-hidden rounded-full bg-zinc-100"
                        aria-hidden="true"
                      >
                        <span
                          className="block h-full rounded-full bg-zinc-900"
                          style={{ width: `${item.percentage ?? 0}%` }}
                        />
                      </span>
                      <span
                        className="min-w-9 text-right text-sm font-semibold text-zinc-950"
                        aria-label={
                          item.percentage === null
                            ? `${item.monthLabel}: sem dados de evangelismo`
                            : `${item.monthLabel}: ${item.percentage}% participaram do evangelismo`
                        }
                      >
                        {item.percentage === null ? "—" : `${item.percentage}%`}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>

              <section className="mt-8" aria-labelledby="cells-summary-heading">
                <div className="flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <h2
                      id="cells-summary-heading"
                      className="text-xl font-semibold text-zinc-950"
                    >
                      Resumo por célula
                    </h2>
                    <p className="mt-1 text-sm leading-6 text-zinc-600">
                      Resultados de {dashboard.monthLabel.toLowerCase()}.
                    </p>
                  </div>
                  <p className="text-sm text-zinc-600">
                    {dashboard.cellSummaries.length}{" "}
                    {dashboard.cellSummaries.length === 1 ? "célula" : "células"}
                  </p>
                </div>

                <ul className="mt-5 grid gap-4 lg:grid-cols-2">
                  {dashboard.cellSummaries.map((cell) => (
                    <li
                      key={cell.id}
                      className="rounded-2xl border border-zinc-200 bg-zinc-50 p-5"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <h3 className="text-lg font-semibold text-zinc-950">
                            {cell.name}
                          </h3>
                          <p className="mt-1 text-sm text-zinc-600">
                            {cell.networkName} · {cell.cellTypeName}
                          </p>
                        </div>
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${
                            cell.metrics.reports > 0
                              ? "bg-green-100 text-green-900"
                              : "bg-zinc-200 text-zinc-700"
                          }`}
                        >
                          {cell.metrics.reports > 0
                            ? `${cell.metrics.reports} ${cell.metrics.reports === 1 ? "Ficha" : "Fichas"}`
                            : "Sem Ficha"}
                        </span>
                      </div>

                      <dl className="mt-5 grid grid-cols-2 gap-3 text-center sm:grid-cols-4">
                        <div className="rounded-xl bg-white px-2 py-3">
                          <dt className="text-xs text-zinc-600">Média membros</dt>
                          <dd className="mt-1 text-lg font-semibold text-zinc-950">
                            {formatAverage(cell.metrics.averageMembers)}
                          </dd>
                        </div>
                        <div className="rounded-xl bg-white px-2 py-3">
                          <dt className="text-xs text-zinc-600">Média convidados</dt>
                          <dd className="mt-1 text-lg font-semibold text-zinc-950">
                            {formatAverage(cell.metrics.averageGuests)}
                          </dd>
                        </div>
                        <div className="rounded-xl bg-white px-2 py-3">
                          <dt className="text-xs text-zinc-600">Média presentes</dt>
                          <dd className="mt-1 text-lg font-semibold text-zinc-950">
                            {formatAverage(cell.metrics.averageAttendance)}
                          </dd>
                        </div>
                        <div className="rounded-xl bg-white px-2 py-3">
                          <dt className="text-xs text-zinc-600">1ª vez</dt>
                          <dd className="mt-1 text-lg font-semibold text-zinc-950">
                            {cell.metrics.firstTimeGuests}
                          </dd>
                        </div>
                      </dl>

                      <p className="mt-4 text-sm text-zinc-700">
                        <span className="font-semibold text-zinc-950">
                          Evangelismo: {cell.evangelismParticipation.percentage === null
                            ? "sem dados"
                            : `${cell.evangelismParticipation.percentage}%`}
                        </span>
                        {cell.evangelismParticipation.percentage !== null
                          ? ` · ${cell.evangelismParticipation.evangelized} de ${cell.evangelismParticipation.accompanied} participaram`
                          : ""}
                      </p>

                      <Link
                        href={`/portal/celulas/${cell.id}?mes=${dashboard.month}&historico=${dashboard.historyMonths}`}
                        className="mt-4 flex min-h-11 items-center justify-center rounded-xl border border-zinc-300 bg-white px-4 text-sm font-semibold text-zinc-900 hover:bg-zinc-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900"
                      >
                        Ver célula
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            </>
          )}

          <nav
            aria-label="Atalhos da área pastoral"
            className="mt-8 grid gap-3 sm:grid-cols-3"
          >
            <Link
              href="/portal/relatorios"
              className="flex min-h-12 items-center justify-center rounded-xl bg-zinc-950 px-5 text-center text-base font-semibold text-white transition-colors hover:bg-zinc-800 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-zinc-900"
            >
              Consultar Fichas
            </Link>
            <Link
              href="/portal/organizacao"
              className="flex min-h-12 items-center justify-center rounded-xl border border-zinc-300 bg-white px-5 text-center text-base font-semibold text-zinc-900 transition-colors hover:bg-zinc-100 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-zinc-900"
            >
              Ver células
            </Link>
            <Link
              href="/portal"
              className="flex min-h-12 items-center justify-center rounded-xl border border-zinc-300 bg-white px-5 text-center text-base font-semibold text-zinc-900 transition-colors hover:bg-zinc-100 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-zinc-900"
            >
              Voltar ao ICB Conecta
            </Link>
          </nav>
        </section>
      </div>
    </main>
  );
}
