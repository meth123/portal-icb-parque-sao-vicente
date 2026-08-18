import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  ArrowLeft,
  CalendarRange,
  CheckCircle2,
  CircleAlert,
  ClockAlert,
  Clock3,
  FileCheck2,
  House,
  MapPin,
  Network,
  Send,
  UserRoundCheck,
  UserRoundPlus,
  Users,
} from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { buttonClassName } from "@/components/ui/button";
import { PageContainer } from "@/components/ui/page-container";
import { PageHeader } from "@/components/ui/page-header";
import { SectionHeader } from "@/components/ui/section-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { TrendBars } from "@/components/ui/trend-bars";
import { getCurrentUser } from "@/lib/auth/current-user";
import { getCellDashboard } from "@/lib/data/cell-dashboard";
import { getCellDetails } from "@/lib/data/organization";

function formatDate(date: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "UTC",
  }).format(new Date(`${date}T12:00:00Z`));
}

export const metadata: Metadata = {
  title: "Minha célula | ICB Conecta",
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
  searchParams: Promise<{
    mes?: string | string[];
    historico?: string | string[];
  }>;
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
  const requestedHistoryMonths =
    typeof query.historico === "string" ? query.historico : "3";
  const [cell, dashboard] = await Promise.all([
    getCellDetails(id),
    getCellDashboard(id, requestedMonth, requestedHistoryMonths),
  ]);

  if (!cell || !dashboard) {
    notFound();
  }

  const metrics = dashboard.metrics;
  const highestAverage = Math.max(
    1,
    ...dashboard.history.map((item) => item.metrics.averageAttendance),
  );
  const highestFirstTimeTotal = Math.max(
    1,
    ...dashboard.history.map((item) => item.metrics.firstTimeGuests),
  );
  const viceSummaries = dashboard.viceSummaries.map((summary) => ({
    ...summary,
    name:
      cell.leaderships.find(
        (leadership) => leadership.profileId === summary.profileId,
      )?.name ?? "Vice-líder sem nome",
  }));
  const pendingWeeks = dashboard.overdueWeeks.filter(
    (week) => week.status === "pending",
  );
  const lateSubmissionWeeks = dashboard.overdueWeeks.filter(
    (week) => week.status === "submitted_late",
  );
  const attendanceTrend = dashboard.history.map((item) => {
    const value = item.metrics.averageAttendance;
    const valueLabel = value.toLocaleString("pt-BR", {
      maximumFractionDigits: 1,
    });

    return {
      key: item.month,
      label: item.monthLabel,
      value,
      valueLabel,
      accessibleLabel: `${item.monthLabel}: média de ${valueLabel} presentes por Ficha`,
    };
  });
  const firstTimeTrend = dashboard.history.map((item) => ({
    key: item.month,
    label: item.monthLabel,
    value: item.metrics.firstTimeGuests,
    valueLabel: String(item.metrics.firstTimeGuests),
    accessibleLabel: `${item.monthLabel}: ${item.metrics.firstTimeGuests} convidados pela primeira vez`,
  }));
  const monthlyAverage = metrics.averageAttendance.toLocaleString("pt-BR", {
    maximumFractionDigits: 1,
  });

  return (
    <main className="min-h-full bg-app-background py-6 sm:py-8">
      <PageContainer width="wide" className="space-y-6 sm:space-y-8">
        <PageHeader
          eyebrow={dashboard.personalSummary ? "Minha célula" : "Célula"}
          title={cell.name}
          description="Acompanhe as reuniões, o cuidado com as pessoas e o evangelismo."
          actions={
            <StatusBadge tone={cell.isActive ? "success" : "neutral"}>
              {cell.isActive ? "Ativa" : "Inativa"}
            </StatusBadge>
          }
        />

        {cell.hasError || dashboard.hasError ? (
          <Alert tone="danger">
            Parte dos dados não pôde ser carregada. Atualize a página antes de
            considerar este resumo completo.
          </Alert>
        ) : null}

        <section className="overflow-hidden rounded-2xl border border-theme-primary-border bg-surface">
          <div className="flex flex-col gap-4 border-b border-theme-primary-border bg-theme-primary-subtle p-5 sm:flex-row sm:items-end sm:justify-between sm:p-6">
            <div>
              <p className="text-sm font-semibold text-theme-primary-active">
                {dashboard.monthLabel}
              </p>
              <h2 className="mt-1 text-xl font-semibold text-app-foreground">
                Resumo do mês
              </h2>
            </div>

            <form className="grid items-end gap-2 sm:grid-cols-[11rem_8rem_auto]">
              <label className="min-w-0">
                <span className="mb-1 block text-xs font-medium text-app-secondary">
                  Período
                </span>
                <input
                  name="mes"
                  type="month"
                  defaultValue={dashboard.month}
                  className="min-h-11 w-full rounded-xl border border-app-border bg-surface px-3 text-base text-app-foreground outline-none focus:border-theme-primary focus:ring-2 focus:ring-theme-primary-soft"
                />
              </label>
              <label className="min-w-0">
                <span className="mb-1 block text-xs font-medium text-app-secondary">
                  Histórico
                </span>
                <select
                  name="historico"
                  defaultValue={String(dashboard.historyMonths)}
                  className="min-h-11 w-full rounded-xl border border-app-border bg-surface px-3 text-base text-app-foreground outline-none focus:border-theme-primary focus:ring-2 focus:ring-theme-primary-soft"
                >
                  <option value="3">3 meses</option>
                  <option value="6">6 meses</option>
                  <option value="12">12 meses</option>
                </select>
              </label>
              <button
                type="submit"
                className={buttonClassName({
                  size: "compact",
                })}
              >
                Ver período
              </button>
            </form>
          </div>

          <div className="grid lg:grid-cols-[0.9fr_1.1fr]">
            <div className="bg-theme-primary-active p-6 text-theme-primary-foreground sm:p-8">
              <p className="text-sm font-medium opacity-80">Média de presentes</p>
              <p className="mt-2 text-5xl font-semibold">{monthlyAverage}</p>
              <p className="mt-3 text-sm opacity-80">
                por reunião em {dashboard.monthLabel.toLowerCase()}
              </p>
            </div>
            <dl className="grid grid-cols-2 bg-surface">
              {[
                ["Fichas enviadas", metrics.reports],
                [
                  "Média de membros por reunião",
                  metrics.averageMembers.toLocaleString("pt-BR", {
                    maximumFractionDigits: 1,
                  }),
                ],
                [
                  "Média de convidados por reunião",
                  metrics.averageGuests.toLocaleString("pt-BR", {
                    maximumFractionDigits: 1,
                  }),
                ],
                ["Primeira vez no mês", metrics.firstTimeGuests],
              ].map(([label, value], index) => (
                <div
                  key={label}
                  className={`min-w-0 p-5 sm:p-6 ${index % 2 === 0 ? "border-r border-app-border" : ""} ${index < 2 ? "border-b border-app-border" : ""}`}
                >
                  <dt className="text-sm font-medium leading-5 text-app-secondary">{label}</dt>
                  <dd className="mt-2 text-2xl font-semibold text-app-foreground">{value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        {dashboard.personalSummary ? (
          <div className="grid gap-4 lg:grid-cols-2">
            <section
              className={`rounded-2xl border p-5 sm:p-6 ${
                pendingWeeks.length > 0
                  ? "border-warning/20 bg-warning-soft"
                  : "border-success/20 bg-success-soft"
              }`}
            >
              <div className="flex items-start gap-3">
                <span
                  className={`flex size-10 shrink-0 items-center justify-center rounded-xl bg-surface ${pendingWeeks.length > 0 ? "text-warning" : "text-success"}`}
                >
                  {pendingWeeks.length > 0 ? (
                    <CircleAlert aria-hidden="true" className="size-5" />
                  ) : (
                    <CheckCircle2 aria-hidden="true" className="size-5" />
                  )}
                </span>
                <div>
                  <p className="text-sm font-medium text-app-secondary">Situação das Fichas</p>
                  <h2 className="mt-1 text-xl font-semibold text-app-foreground">
                    {pendingWeeks.length > 0
                      ? `${pendingWeeks.length} ${pendingWeeks.length === 1 ? "pendência" : "pendências"}`
                      : "Tudo em dia"}
                  </h2>
                </div>
              </div>

              {pendingWeeks.length > 0 ? (
                <details className="mt-4 border-t border-warning/20 pt-4">
                  <summary className="cursor-pointer text-sm font-semibold text-app-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus">
                    Ver semanas pendentes
                  </summary>
                  <ul className="mt-3 space-y-2">
                    {pendingWeeks.map((week) => (
                      <li key={week.weekEndsOn} className="text-sm text-app-secondary">
                        Semana encerrada em {formatDate(week.weekEndsOn)}
                      </li>
                    ))}
                  </ul>
                </details>
              ) : null}

              {lateSubmissionWeeks.length > 0 ? (
                <details className="mt-4 border-t border-app-border pt-4">
                  <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-medium text-app-secondary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus [&::-webkit-details-marker]:hidden">
                    <ClockAlert aria-hidden="true" className="size-4 shrink-0 text-warning" />
                    Histórico: {lateSubmissionWeeks.length} {lateSubmissionWeeks.length === 1 ? "envio após o prazo" : "envios após o prazo"}
                  </summary>
                  <ul className="mt-3 space-y-2 pl-6">
                    {lateSubmissionWeeks.map((week) => (
                      <li key={week.weekEndsOn} className="text-sm text-app-secondary">
                        Semana encerrada em {formatDate(week.weekEndsOn)}
                      </li>
                    ))}
                  </ul>
                </details>
              ) : null}
            </section>

            <section className="rounded-2xl border border-theme-primary-border bg-theme-primary-subtle p-5 sm:p-6">
              <div className="flex items-start gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-surface text-theme-primary-active">
                  <Send aria-hidden="true" className="size-5" />
                </span>
                <div>
                  <p className="text-sm font-medium text-app-secondary">Sua participação</p>
                  <h2 className="mt-1 text-xl font-semibold text-app-foreground">
                    {metrics.reports === 0
                      ? "Sem dados no período"
                      : dashboard.personalSummary.didEvangelize
                        ? "Você evangelizou"
                        : "Sem registro de evangelismo"}
                  </h2>
                </div>
              </div>
              {metrics.reports === 0 ? (
                <p className="mt-4 text-base leading-6 text-app-secondary">
                  Nenhuma Ficha foi enviada neste mês.
                </p>
              ) : dashboard.personalSummary.didEvangelize ? (
                <p className="mt-4 text-lg font-semibold text-theme-primary-active">
                  {dashboard.personalSummary.records} {dashboard.personalSummary.records === 1 ? "relato" : "relatos"}{" "}
                  <span className="text-base font-medium text-app-secondary">
                    em {dashboard.personalSummary.reports} {dashboard.personalSummary.reports === 1 ? "Ficha" : "Fichas"}
                  </span>
                </p>
              ) : (
                <p className="mt-4 text-base leading-6 text-app-secondary">
                  Ainda não há participação registrada neste mês.
                </p>
              )}
            </section>
          </div>
        ) : null}

        <section aria-labelledby="trends-heading">
          <SectionHeader
            id="trends-heading"
            title="Evolução da célula"
          />
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <section className="rounded-2xl border border-app-border bg-surface p-5 sm:p-6">
              <div className="flex items-center gap-3">
                <span className="flex size-9 items-center justify-center rounded-xl bg-theme-primary-soft text-theme-primary-active">
                  <Users aria-hidden="true" className="size-5" />
                </span>
                <div>
                  <h3 className="font-semibold text-app-foreground">Presença</h3>
                  <p className="text-sm text-app-secondary">Média por Ficha</p>
                </div>
              </div>
              <div className="mt-5">
                <TrendBars items={attendanceTrend} highestValue={highestAverage} />
              </div>
            </section>

            <section className="rounded-2xl border border-app-border bg-surface p-5 sm:p-6">
              <div className="flex items-center gap-3">
                <span className="flex size-9 items-center justify-center rounded-xl bg-success-soft text-success">
                  <UserRoundPlus aria-hidden="true" className="size-5" />
                </span>
                <div>
                  <h3 className="font-semibold text-app-foreground">Primeira vez</h3>
                </div>
              </div>
              <div className="mt-5">
                <TrendBars
                  items={firstTimeTrend}
                  highestValue={highestFirstTimeTotal}
                  tone="success"
                />
              </div>
            </section>
          </div>
        </section>

        <section aria-labelledby="evangelism-heading" className="border-t border-app-border pt-8">
          <SectionHeader
            id="evangelism-heading"
            title="Evangelismo"
          />

          <div className="mt-4 overflow-hidden rounded-2xl border border-theme-primary-border bg-surface">
            <div className="grid md:grid-cols-[0.75fr_1.25fr]">
              <div className="bg-theme-primary-active p-6 text-theme-primary-foreground sm:p-8">
                <p className="text-sm font-medium opacity-80">Participação da liderança</p>
                <strong className="mt-2 block text-5xl font-semibold">
                  {dashboard.evangelismParticipation.percentage === null
                    ? "—"
                    : `${dashboard.evangelismParticipation.percentage}%`}
                </strong>
                <p className="mt-3 text-sm leading-6 opacity-80">
                  {dashboard.evangelismParticipation.percentage === null
                    ? "Sem Fichas para calcular."
                    : `${dashboard.evangelismParticipation.evangelized} de ${dashboard.evangelismParticipation.accompanied} líderes evangelizaram no mês.`}
                </p>
              </div>
              <div className="p-5 sm:p-6">
                <div
                  className="h-3 overflow-hidden rounded-full bg-surface-muted"
                  role="progressbar"
                  aria-label="Participação mensal da liderança no evangelismo"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={dashboard.evangelismParticipation.percentage ?? undefined}
                >
                  <span
                    className="block h-full rounded-full bg-theme-primary"
                    style={{
                      width: `${dashboard.evangelismParticipation.percentage ?? 0}%`,
                    }}
                  />
                </div>

                {viceSummaries.length > 0 ? (
                  <ul className="mt-5 divide-y divide-app-border">
                    {viceSummaries.map((summary) => (
                      <li
                        key={summary.profileId}
                        className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                      >
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-app-foreground">{summary.name}</p>
                          <p className="mt-0.5 text-sm text-app-secondary">
                            {summary.didEvangelize
                              ? `${summary.records} ${summary.records === 1 ? "relato" : "relatos"}`
                              : "Sem registro no mês"}
                          </p>
                        </div>
                        <StatusBadge tone={summary.didEvangelize ? "success" : "neutral"}>
                          {summary.didEvangelize ? "Participou" : "Pendente"}
                        </StatusBadge>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-5 text-sm text-app-secondary">
                    Nenhum Vice-líder para acompanhar.
                  </p>
                )}
              </div>
            </div>
          </div>

          {dashboard.evangelismHistory.length > 0 ? (
            <ul className="mt-4 divide-y divide-app-border rounded-2xl border border-app-border bg-surface px-5 sm:px-6">
              {dashboard.evangelismHistory.map((item) => {
                const hasEvangelism = item.records > 0;

                return (
                  <li
                    key={item.versionId}
                    className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex items-start gap-3">
                      <span className={`mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl ${hasEvangelism ? "bg-success-soft text-success" : "bg-surface-muted text-app-secondary"}`}>
                        {hasEvangelism ? (
                          <CheckCircle2 aria-hidden="true" className="size-5" />
                        ) : (
                          <FileCheck2 aria-hidden="true" className="size-5" />
                        )}
                      </span>
                      <div>
                        <p className="font-semibold text-app-foreground">
                          {formatDate(item.meetingOn)}
                        </p>
                        <p className="mt-1 text-sm text-app-secondary">
                          {hasEvangelism
                            ? `${item.records} ${item.records === 1 ? "relato" : "relatos"} com ${item.leadershipParticipants} ${item.leadershipParticipants === 1 ? "líder" : "líderes"}.`
                            : "Nenhum evangelismo registrado."}
                        </p>
                      </div>
                    </div>
                    <Link
                      href={`/portal/relatorios/${item.versionId}`}
                      className={buttonClassName({
                        variant: "secondary",
                        size: "compact",
                        className: "w-full sm:w-auto",
                      })}
                    >
                      Ver Ficha
                    </Link>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="mt-4 text-sm text-app-secondary">
              Nenhuma Ficha enviada neste período.
            </p>
          )}
        </section>

        <details className="group overflow-hidden rounded-2xl border border-app-border bg-surface">
          <summary className="flex min-h-16 cursor-pointer list-none items-center justify-between gap-3 px-5 font-semibold text-app-foreground focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-focus [&::-webkit-details-marker]:hidden sm:px-6">
            <span className="flex items-center gap-3">
              <House aria-hidden="true" className="size-5 text-theme-primary" />
              Informações da célula
            </span>
            <span className="text-sm font-medium text-app-secondary group-open:hidden">Ver</span>
            <span className="hidden text-sm font-medium text-app-secondary group-open:inline">Ocultar</span>
          </summary>
          <div className="border-t border-app-border p-5 sm:p-6">
            <dl className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {[
                [<Network key="network" className="size-4" />, "Rede e tipo", cell.classification],
                [<Clock3 key="clock" className="size-4" />, "Encontro", cell.schedule],
                [<MapPin key="pin" className="size-4" />, "Localidade", cell.location],
                [<CalendarRange key="calendar" className="size-4" />, "Início", cell.startedOn ?? "Não informado"],
              ].map(([icon, label, value]) => (
                <div key={String(label)} className="min-w-0">
                  <dt className="flex items-center gap-2 text-xs font-medium text-app-secondary">
                    {icon}
                    {label}
                  </dt>
                  <dd className="mt-2 text-sm font-semibold capitalize text-app-foreground">{value}</dd>
                </div>
              ))}
            </dl>

            <section className="mt-6 border-t border-app-border pt-6">
              <h3 className="font-semibold text-app-foreground">Liderança atual</h3>
              {cell.leaderships.length > 0 ? (
                <ul className="mt-3 grid gap-3 sm:grid-cols-2">
                  {cell.leaderships.map((leadership) => (
                    <li
                      key={leadership.profileId}
                      className="flex items-center gap-3 rounded-xl bg-surface-muted p-3"
                    >
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-theme-primary-soft text-theme-primary-active">
                        <UserRoundCheck aria-hidden="true" className="size-4" />
                      </span>
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-app-foreground">{leadership.name}</p>
                        <p className="mt-0.5 text-xs text-app-secondary">
                          {leadership.role} · desde {leadership.startsOn}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-3 text-sm text-app-secondary">
                  Nenhuma liderança vigente encontrada.
                </p>
              )}
            </section>
          </div>
        </details>

        <Link
          href={dashboard.personalSummary ? "/portal" : "/portal/organizacao"}
          className={buttonClassName({ variant: "ghost", size: "compact", className: "-ml-3" })}
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
          {dashboard.personalSummary ? "Voltar ao ICB Conecta" : "Voltar às células"}
        </Link>
      </PageContainer>
    </main>
  );
}
