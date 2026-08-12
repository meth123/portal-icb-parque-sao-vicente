import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import { getCellDashboard } from "@/lib/data/cell-dashboard";
import { getCellDetails } from "@/lib/data/organization";

function formatDate(date: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "UTC",
  }).format(new Date(`${date}T12:00:00Z`));
}

export const metadata: Metadata = {
  title: "Minha célula | Portal ICB Parque São Vicente",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function CellDetailsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ mes?: string | string[] }>;
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login?erro=perfil");
  }

  if (!user.isActive) {
    redirect("/portal");
  }

  const [{ id }, query] = await Promise.all([params, searchParams]);
  const requestedMonth =
    typeof query.mes === "string" ? query.mes : undefined;
  const [cell, dashboard] = await Promise.all([
    getCellDetails(id),
    getCellDashboard(id, requestedMonth),
  ]);

  if (!cell || !dashboard) {
    notFound();
  }

  const metrics = dashboard.metrics;
  const highestAverage = Math.max(
    1,
    ...dashboard.history.map((item) => item.metrics.averageAttendance),
  );
  const metricCards = [
    { label: "Fichas", value: metrics.reports, note: "enviadas" },
    { label: "Membros", value: metrics.members, note: "presenças" },
    { label: "Convidados", value: metrics.guests, note: "registrados" },
    { label: "1ª vez", value: metrics.firstTimeGuests, note: "registrados" },
    {
      label: "Média de presentes",
      value: metrics.averageAttendance.toLocaleString("pt-BR", {
        maximumFractionDigits: 1,
      }),
      note: "por Ficha",
    },
  ];

  return (
    <main className="min-h-screen bg-zinc-100 px-4 py-10 sm:px-6">
      <div className="mx-auto w-full max-w-4xl">
        <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-10">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-zinc-600">
                {dashboard.personalSummary ? "Minha célula" : "Célula"}
              </p>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight text-zinc-950 sm:text-4xl">
                {cell.name}
              </h1>
            </div>
            <span className="rounded-full border border-zinc-300 bg-zinc-100 px-3 py-1 text-sm text-zinc-700">
              {cell.isActive ? "Ativa" : "Inativa"}
            </span>
          </div>

          {cell.hasError || dashboard.hasError ? (
            <p
              role="alert"
              className="mt-8 rounded-xl border border-red-200 bg-red-50 px-4 py-4 text-red-800"
            >
              Parte dos dados não pôde ser carregada. Tente novamente antes de
              considerar estas informações completas.
            </p>
          ) : null}

          <section className="mt-8 rounded-2xl border border-zinc-200 p-4 sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-zinc-600">
                  {dashboard.monthLabel}
                </p>
                <h2 className="mt-1 text-xl font-semibold text-zinc-950">
                  Resumo mensal
                </h2>
              </div>

              <form className="flex w-full items-end gap-2 sm:w-auto">
                <div className="min-w-0 flex-1 sm:w-48">
                  <label
                    htmlFor="dashboard-month"
                    className="mb-1 block text-sm font-medium text-zinc-700"
                  >
                    Período
                  </label>
                  <input
                    id="dashboard-month"
                    name="mes"
                    type="month"
                    defaultValue={dashboard.month}
                    className="min-h-11 w-full rounded-xl border border-zinc-300 bg-white px-3 text-zinc-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900"
                  />
                </div>
                <button
                  type="submit"
                  className="min-h-11 shrink-0 rounded-xl bg-zinc-950 px-4 text-sm font-semibold text-white hover:bg-zinc-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900"
                >
                  Ver
                </button>
              </form>
            </div>

            <dl className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              {metricCards.map((metric) => (
                <div
                  key={metric.label}
                  className="rounded-xl bg-zinc-100 px-3 py-4"
                >
                  <dt className="text-xs font-semibold uppercase tracking-wide text-zinc-600">
                    {metric.label}
                  </dt>
                  <dd className="mt-1 text-2xl font-semibold text-zinc-950">
                    {metric.value}
                  </dd>
                  <p className="mt-1 text-xs text-zinc-600">{metric.note}</p>
                </div>
              ))}
            </dl>

            {metrics.reports === 0 && !dashboard.hasError ? (
              <p className="mt-4 text-sm text-zinc-600">
                Nenhuma Ficha enviada neste período.
              </p>
            ) : null}
          </section>

          {dashboard.personalSummary ? (
            <section className="mt-6 rounded-2xl border border-zinc-200 bg-zinc-950 p-4 text-white sm:p-6">
              <div className="flex flex-col gap-4 text-center sm:flex-row sm:items-center sm:justify-between sm:text-left">
                <div>
                  <p className="text-sm font-semibold text-zinc-300">
                    Meu resumo · {dashboard.monthLabel}
                  </p>
                  <h2 className="mt-1 text-xl font-semibold">
                    {dashboard.personalSummary.role === "leader"
                      ? "Líder"
                      : "Vice-líder"}{" "}
                    da célula {cell.name}
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-zinc-300">
                    {metrics.reports === 0
                      ? "Sem Fichas neste período."
                      : dashboard.personalSummary.didEvangelize
                        ? `Participou de ${dashboard.personalSummary.records} ${dashboard.personalSummary.records === 1 ? "relato" : "relatos"} em ${dashboard.personalSummary.reports} ${dashboard.personalSummary.reports === 1 ? "Ficha" : "Fichas"}.`
                        : "Sem participação no evangelismo neste período."}
                  </p>
                </div>
                <span className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-zinc-950">
                  {metrics.reports === 0
                    ? "Sem dados"
                    : dashboard.personalSummary.didEvangelize
                      ? "Participou"
                      : "Não participou"}
                </span>
              </div>
            </section>
          ) : null}

          <section className="mt-6 rounded-2xl border border-zinc-200 p-4 sm:p-6">
            <h2 className="text-xl font-semibold text-zinc-950">
              Presença nos últimos 6 meses
            </h2>
            <p className="mt-1 text-sm text-zinc-600">
              Média de presentes por Ficha.
            </p>

            <ul className="mt-5 space-y-4">
              {dashboard.history.map((item) => {
                const average = item.metrics.averageAttendance;
                const formattedAverage = average.toLocaleString("pt-BR", {
                  maximumFractionDigits: 1,
                });
                const barWidth = (average / highestAverage) * 100;

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
                      aria-label={`${item.monthLabel}: média de ${formattedAverage} presentes por Ficha`}
                    >
                      {formattedAverage}
                    </span>
                  </li>
                );
              })}
            </ul>
          </section>

          <section className="mt-6 rounded-2xl border border-zinc-200 p-4 sm:p-6">
            <h2 className="text-xl font-semibold text-zinc-950">
              Evangelismo no período
            </h2>
            <p className="mt-1 text-sm text-zinc-600">
              Histórico das Fichas de {dashboard.monthLabel.toLowerCase()}.
            </p>

            <div className="mt-5 rounded-xl bg-zinc-100 p-4 sm:p-5">
              <div className="flex flex-col gap-1 text-center sm:flex-row sm:items-end sm:justify-between sm:text-left">
                <div>
                  <div className="flex items-center justify-center gap-2 sm:justify-start">
                    <p className="text-sm font-semibold text-zinc-700">
                      Participação no evangelismo
                    </p>
                    <details className="group relative">
                      <summary
                        className="flex size-6 cursor-pointer list-none items-center justify-center rounded-full border border-zinc-300 bg-white text-xs font-bold text-zinc-700 hover:bg-zinc-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 [&::-webkit-details-marker]:hidden"
                        aria-label="Como esta porcentagem é calculada?"
                      >
                        i
                      </summary>
                      <div className="absolute left-1/2 z-10 mt-2 w-64 -translate-x-1/2 rounded-xl border border-zinc-200 bg-white p-3 text-left text-sm font-normal leading-6 text-zinc-700 shadow-lg sm:left-0 sm:translate-x-0">
                        Mostra quantos, entre o Líder e os Vice-líderes desta
                        célula, evangelizaram pelo menos uma vez no mês. Cada
                        pessoa conta somente uma vez.
                      </div>
                    </details>
                  </div>
                  {dashboard.evangelismParticipation.percentage !== null ? (
                    <p className="mt-1 text-sm text-zinc-600">
                      {dashboard.evangelismParticipation.evangelized} de{" "}
                      {dashboard.evangelismParticipation.accompanied} entre
                      Líder e Vice-líderes da célula participaram no mês.
                    </p>
                  ) : (
                    <p className="mt-1 text-sm text-zinc-600">
                      Sem Fichas para calcular este período.
                    </p>
                  )}
                </div>
                <strong className="text-3xl text-zinc-950">
                  {dashboard.evangelismParticipation.percentage === null
                    ? "—"
                    : `${dashboard.evangelismParticipation.percentage}%`}
                </strong>
              </div>

              <div
                className="mt-4 h-4 overflow-hidden rounded-full bg-white"
                role="progressbar"
                aria-label="Participação mensal do Líder e dos Vice-líderes da célula no evangelismo"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={
                  dashboard.evangelismParticipation.percentage ?? undefined
                }
                aria-valuetext={
                  dashboard.evangelismParticipation.percentage === null
                    ? "Sem dados no período"
                    : `${dashboard.evangelismParticipation.percentage}% entre Líder e Vice-líderes da célula participaram no mês`
                }
              >
                <span
                  className="block h-full rounded-full bg-zinc-900"
                  style={{
                    width: `${dashboard.evangelismParticipation.percentage ?? 0}%`,
                  }}
                />
              </div>
            </div>

            {dashboard.evangelismHistory.length > 0 ? (
              <ul className="mt-5 divide-y divide-zinc-200">
                {dashboard.evangelismHistory.map((item) => {
                  const hasEvangelism = item.records > 0;

                  return (
                    <li
                      key={item.versionId}
                      className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div>
                        <p className="font-semibold text-zinc-950">
                          {formatDate(item.meetingOn)}
                        </p>
                        <p className="mt-1 text-sm text-zinc-600">
                          {hasEvangelism
                            ? `${item.records} ${item.records === 1 ? "relato" : "relatos"} · ${item.leadershipParticipants} ${item.leadershipParticipants === 1 ? "Líder/Vice-líder" : "Líderes/Vice-líderes"}`
                            : "Nenhum evangelismo registrado"}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span
                          className={`rounded-full px-3 py-1 text-sm font-semibold ${
                            hasEvangelism
                              ? "bg-green-100 text-green-900"
                              : "bg-zinc-100 text-zinc-700"
                          }`}
                        >
                          {hasEvangelism ? "Registrado" : "Não houve"}
                        </span>
                        <Link
                          href={`/portal/relatorios/${item.versionId}`}
                          className="text-sm font-semibold text-zinc-900 underline decoration-zinc-300 underline-offset-4 hover:decoration-zinc-900"
                        >
                          Ver Ficha
                        </Link>
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="mt-4 text-sm text-zinc-600">
                Nenhuma Ficha enviada neste período.
              </p>
            )}
          </section>

          <h2 className="mt-8 text-xl font-semibold text-zinc-950">
            Informações da célula
          </h2>
          <dl className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl bg-zinc-100 p-4">
              <dt className="font-semibold text-zinc-950">Rede e tipo</dt>
              <dd className="mt-2 text-zinc-700">{cell.classification}</dd>
            </div>
            <div className="rounded-2xl bg-zinc-100 p-4">
              <dt className="font-semibold text-zinc-950">Encontro</dt>
              <dd className="mt-2 capitalize text-zinc-700">{cell.schedule}</dd>
            </div>
            <div className="rounded-2xl bg-zinc-100 p-4">
              <dt className="font-semibold text-zinc-950">Localidade</dt>
              <dd className="mt-2 text-zinc-700">{cell.location}</dd>
            </div>
            <div className="rounded-2xl bg-zinc-100 p-4">
              <dt className="font-semibold text-zinc-950">Início registrado</dt>
              <dd className="mt-2 text-zinc-700">
                {cell.startedOn ?? "Não informado"}
              </dd>
            </div>
          </dl>

          <section className="mt-8 rounded-2xl border border-zinc-200 p-5 sm:p-6">
            <h2 className="text-xl font-semibold text-zinc-950">Liderança</h2>
            {cell.leaderships.length > 0 ? (
              <ul className="mt-4 divide-y divide-zinc-200">
                {cell.leaderships.map((leadership) => (
                  <li
                    key={leadership.profileId}
                    className="flex flex-col gap-1 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
                  >
                    <div>
                      <p className="font-semibold text-zinc-950">
                        {leadership.name}
                      </p>
                      <p className="mt-1 text-sm text-zinc-600">
                        Desde {leadership.startsOn}
                      </p>
                    </div>
                    <span className="text-sm font-medium text-zinc-700">
                      {leadership.role}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-4 text-zinc-700">
                Nenhuma liderança vigente encontrada.
              </p>
            )}
          </section>

          <Link
            href={dashboard.personalSummary ? "/portal" : "/portal/organizacao"}
            className="mt-8 flex min-h-12 w-full items-center justify-center rounded-xl border border-zinc-300 bg-white px-5 text-base font-semibold text-zinc-900 transition-colors hover:bg-zinc-100 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-zinc-900 sm:w-auto sm:min-w-52"
          >
            {dashboard.personalSummary ? "Voltar ao portal" : "Voltar às células"}
          </Link>
        </section>
      </div>
    </main>
  );
}
