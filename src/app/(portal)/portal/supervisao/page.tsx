import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  AlertTriangle,
  CheckCircle2,
  FileCheck2,
  Files,
  House,
  Search,
  Send,
  UserRoundPlus,
  Users,
  X,
} from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { buttonClassName } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { FilterPanel } from "@/components/ui/filter-panel";
import { MetricCard } from "@/components/ui/metric-card";
import { PageContainer } from "@/components/ui/page-container";
import { PageHeader } from "@/components/ui/page-header";
import { SectionHeader } from "@/components/ui/section-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { TrendBars } from "@/components/ui/trend-bars";
import {
  canAccessPastoralDashboard,
  getCurrentUser,
} from "@/lib/auth/current-user";
import { getPastoralDashboard } from "@/lib/data/pastoral-dashboard";
import { PastoralCellCard } from "./pastoral-cell-card";

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

const inputClassName =
  "mt-2 min-h-12 w-full rounded-xl border border-app-border bg-surface px-4 text-base text-app-foreground outline-none focus:border-theme-primary focus:ring-2 focus:ring-theme-primary-subtle";

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
  const activeFilters = [
    requestedMonth,
    requestedNetworkId,
    requestedCellTypeId,
    requestedCellId,
    requestedWeekday,
    requestedSubmitterProfileId,
    requestedHistoryMonths,
  ].filter(Boolean).length;
  const pendingWeeks = dashboard.overdueWeeks.filter(
    (week) => week.status === "pending",
  );
  const lateWeeks = dashboard.overdueWeeks.filter(
    (week) => week.status === "submitted_late",
  );
  const firstTimeTrend = dashboard.firstTimeHistory.map((item) => ({
    key: item.month,
    label: item.monthLabel,
    value: item.firstTimeGuests,
    valueLabel: String(item.firstTimeGuests),
    accessibleLabel: `${item.monthLabel}: ${item.firstTimeGuests} convidados pela primeira vez`,
  }));
  const highestFirstTimeTotal = Math.max(
    1,
    ...firstTimeTrend.map((item) => item.value),
  );
  const evangelismTrend = dashboard.evangelismHistory.map((item) => ({
    key: item.month,
    label: item.monthLabel,
    value: item.percentage ?? 0,
    valueLabel: item.percentage === null ? "—" : `${item.percentage}%`,
    accessibleLabel:
      item.percentage === null
        ? `${item.monthLabel}: sem dados de evangelismo`
        : `${item.monthLabel}: ${item.percentage}% participaram do evangelismo`,
  }));

  return (
    <main className="min-h-full bg-app-background py-6 sm:py-8">
      <PageContainer width="wide" className="space-y-6 sm:space-y-8">
        <PageHeader
          eyebrow="Área pastoral"
          title="Visão geral"
          description={`Acompanhe as células e a liderança em ${dashboard.monthLabel.toLowerCase()}.`}
          actions={
            <>
              <Link
                href="/portal/relatorios"
                className={buttonClassName({ size: "compact" })}
              >
                <Files aria-hidden="true" className="size-4" />
                Consultar Fichas
              </Link>
              <Link
                href="/portal/organizacao"
                className={buttonClassName({
                  variant: "secondary",
                  size: "compact",
                })}
              >
                <House aria-hidden="true" className="size-4" />
                Ver células
              </Link>
            </>
          }
        />

        <FilterPanel activeFilters={activeFilters} title="Filtros pastorais">
          <form className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <label className="min-w-0">
              <span className="text-sm font-semibold text-app-foreground">Período</span>
              <input
                name="mes"
                type="month"
                defaultValue={dashboard.month}
                className={inputClassName}
              />
            </label>
            <label className="min-w-0">
              <span className="text-sm font-semibold text-app-foreground">Dia</span>
              <select
                name="dia"
                defaultValue={dashboard.selectedWeekday}
                className={inputClassName}
              >
                <option value="">Todos os dias</option>
                <option value="4">Quinta-feira</option>
                <option value="5">Sexta-feira</option>
                <option value="6">Sábado</option>
              </select>
            </label>
            <label className="min-w-0">
              <span className="text-sm font-semibold text-app-foreground">Enviada por</span>
              <select
                name="responsavel"
                defaultValue={dashboard.selectedSubmitterProfileId}
                className={inputClassName}
              >
                <option value="">Todas as pessoas</option>
                {dashboard.submitters.map((submitter) => (
                  <option key={submitter.id} value={submitter.id}>
                    {submitter.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="min-w-0">
              <span className="text-sm font-semibold text-app-foreground">Histórico</span>
              <select
                name="historico"
                defaultValue={String(dashboard.historyMonths)}
                className={inputClassName}
              >
                <option value="3">3 meses</option>
                <option value="6">6 meses</option>
                <option value="12">12 meses</option>
              </select>
            </label>
            <label className="min-w-0">
              <span className="text-sm font-semibold text-app-foreground">Rede</span>
              <select
                name="rede"
                defaultValue={dashboard.selectedNetworkId}
                className={inputClassName}
              >
                <option value="">Todas as Redes</option>
                {dashboard.networks.map((network) => (
                  <option key={network.id} value={network.id}>
                    {network.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="min-w-0">
              <span className="text-sm font-semibold text-app-foreground">Tipo</span>
              <select
                name="tipo"
                defaultValue={dashboard.selectedCellTypeId}
                className={inputClassName}
              >
                <option value="">Todos os tipos</option>
                {dashboard.cellTypes.map((cellType) => (
                  <option key={cellType.id} value={cellType.id}>
                    {cellType.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="min-w-0 sm:col-span-2">
              <span className="text-sm font-semibold text-app-foreground">Célula</span>
              <select
                name="celula"
                defaultValue={dashboard.selectedCellId}
                className={inputClassName}
              >
                <option value="">Todas as células</option>
                {dashboard.cells.map((cell) => (
                  <option key={cell.id} value={cell.id}>
                    {cell.name}
                  </option>
                ))}
              </select>
            </label>
            <div className="flex flex-col gap-3 sm:col-span-2 sm:flex-row lg:col-span-4">
              <button type="submit" className={buttonClassName({ size: "compact" })}>
                <Search aria-hidden="true" className="size-4" />
                Aplicar filtros
              </button>
              {activeFilters > 0 ? (
                <Link
                  href="/portal/supervisao"
                  className={buttonClassName({ variant: "secondary", size: "compact" })}
                >
                  <X aria-hidden="true" className="size-4" />
                  Limpar
                </Link>
              ) : null}
            </div>
          </form>
        </FilterPanel>

        {dashboard.hasError ? (
          <Alert tone="danger">Não foi possível carregar o resumo pastoral.</Alert>
        ) : (
          <>
            <section aria-labelledby="pastoral-summary-heading">
              <SectionHeader id="pastoral-summary-heading" title="Resumo do mês" />
              <dl className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
                <MetricCard
                  label="Células ativas"
                  value={dashboard.activeCells}
                  icon={<House className="size-5" />}
                  tone="theme"
                />
                <MetricCard
                  label="Fichas recebidas"
                  value={metrics.reports}
                  icon={<FileCheck2 className="size-5" />}
                />
                <MetricCard
                  label="Atrasos"
                  value={dashboard.overdueWeeks.length}
                  icon={<AlertTriangle className="size-5" />}
                  tone={dashboard.overdueWeeks.length > 0 ? "warning" : "success"}
                />
                <MetricCard
                  label="Média de presentes"
                  value={formatAverage(metrics.averageAttendance)}
                  icon={<Users className="size-5" />}
                />
              </dl>

              <dl className="mt-3 grid overflow-hidden rounded-2xl border border-app-border bg-surface sm:grid-cols-3">
                {[
                  ["Média de membros por reunião", formatAverage(metrics.averageMembers)],
                  ["Média de convidados por reunião", formatAverage(metrics.averageGuests)],
                  ["Primeira vez no mês", String(metrics.firstTimeGuests)],
                ].map(([label, value], index) => (
                  <div
                    key={label}
                    className={`p-5 ${index > 0 ? "border-t border-app-border sm:border-l sm:border-t-0" : ""}`}
                  >
                    <dt className="text-sm font-medium leading-5 text-app-secondary">{label}</dt>
                    <dd className="mt-2 text-2xl font-semibold text-app-foreground">{value}</dd>
                  </div>
                ))}
              </dl>
            </section>

            {metrics.reports === 0 ? (
              <Alert>Nenhuma Ficha recebida neste período.</Alert>
            ) : null}

            {dashboard.overdueWeeks.length > 0 ? (
              <section className="rounded-2xl border border-warning/20 bg-warning-soft p-5 sm:p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex items-start gap-3">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-surface text-warning">
                      <AlertTriangle aria-hidden="true" className="size-5" />
                    </span>
                    <div>
                      <p className="text-sm font-medium text-app-secondary">Prazos das Fichas</p>
                      <h2 className="mt-1 text-xl font-semibold text-app-foreground">
                        {pendingWeeks.length > 0
                          ? `${pendingWeeks.length} ${pendingWeeks.length === 1 ? "pendência" : "pendências"}`
                          : "Sem pendências atuais"}
                      </h2>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {pendingWeeks.length > 0 ? (
                      <StatusBadge tone="warning">{pendingWeeks.length} pendentes</StatusBadge>
                    ) : null}
                    {lateWeeks.length > 0 ? (
                      <StatusBadge tone="neutral">{lateWeeks.length} após o prazo</StatusBadge>
                    ) : null}
                  </div>
                </div>

                <details className="mt-5 border-t border-warning/20 pt-4">
                  <summary className="cursor-pointer text-sm font-semibold text-app-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus">
                    Ver {dashboard.overdueWeeks.length} {dashboard.overdueWeeks.length === 1 ? "ocorrência" : "ocorrências"}
                  </summary>
                  <ul className="mt-4 max-h-80 divide-y divide-warning/20 overflow-y-auto">
                    {dashboard.overdueWeeks.map((week) => (
                      <li
                        key={`${week.cellId}-${week.weekEndsOn}`}
                        className="flex flex-col gap-2 py-3 first:pt-0 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div>
                          <p className="font-semibold text-app-foreground">{week.cellName}</p>
                          <p className="mt-1 text-sm text-app-secondary">
                            Semana encerrada em {formatDate(week.weekEndsOn)}
                          </p>
                        </div>
                        <StatusBadge tone={week.status === "pending" ? "warning" : "neutral"}>
                          {week.status === "submitted_late" && week.submittedOn
                            ? `Enviada em ${formatDate(week.submittedOn)}`
                            : "Pendente"}
                        </StatusBadge>
                      </li>
                    ))}
                  </ul>
                </details>
              </section>
            ) : (
              <div className="flex items-center gap-3 rounded-2xl border border-success/20 bg-success-soft p-5 text-app-foreground">
                <CheckCircle2 aria-hidden="true" className="size-5 shrink-0 text-success" />
                <p className="font-semibold">Todas as Fichas estão dentro do prazo.</p>
              </div>
            )}

            <section aria-labelledby="pastoral-trends-heading">
              <SectionHeader id="pastoral-trends-heading" title="Tendências" />
              <div className="mt-4 grid gap-4 lg:grid-cols-2">
                <section className="rounded-2xl border border-app-border bg-surface p-5 sm:p-6">
                  <div className="flex items-center gap-3">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-success-soft text-success">
                      <UserRoundPlus aria-hidden="true" className="size-5" />
                    </span>
                    <h3 className="text-lg font-semibold text-app-foreground">Primeira vez</h3>
                  </div>
                  <div className="mt-5">
                    <TrendBars
                      items={firstTimeTrend}
                      highestValue={highestFirstTimeTotal}
                      tone="success"
                    />
                  </div>
                </section>

                <section className="overflow-hidden rounded-2xl border border-theme-primary-border bg-surface">
                  <div className="flex items-center justify-between gap-4 bg-theme-primary-active p-5 text-theme-primary-foreground sm:p-6">
                    <div>
                      <p className="flex items-center gap-2 text-sm font-medium opacity-80">
                        <Send aria-hidden="true" className="size-4" />
                        Evangelismo no mês
                      </p>
                      <p className="mt-2 text-sm leading-6 opacity-80">
                        {dashboard.evangelismParticipation.percentage === null
                          ? "Sem Fichas para calcular."
                          : `${dashboard.evangelismParticipation.evangelized} de ${dashboard.evangelismParticipation.accompanied} líderes participaram.`}
                      </p>
                    </div>
                    <strong className="shrink-0 text-4xl font-semibold">
                      {dashboard.evangelismParticipation.percentage === null
                        ? "—"
                        : `${dashboard.evangelismParticipation.percentage}%`}
                    </strong>
                  </div>
                  <div className="p-5 sm:p-6">
                    <TrendBars items={evangelismTrend} highestValue={100} />
                  </div>
                </section>
              </div>
            </section>

            <section aria-labelledby="cells-summary-heading">
              <SectionHeader
                id="cells-summary-heading"
                title="Células"
                action={
                  <StatusBadge tone="theme">
                    {dashboard.cellSummaries.length}{" "}
                    {dashboard.cellSummaries.length === 1 ? "célula" : "células"}
                  </StatusBadge>
                }
              />

              {dashboard.cellSummaries.length > 0 ? (
                <ul className="mt-4 grid gap-5 xl:grid-cols-2">
                  {dashboard.cellSummaries.map((cell) => (
                    <PastoralCellCard
                      key={cell.id}
                      cell={cell}
                      month={dashboard.month}
                      historyMonths={dashboard.historyMonths}
                    />
                  ))}
                </ul>
              ) : (
                <EmptyState
                  className="mt-4"
                  icon={<House className="size-8" />}
                  title="Nenhuma célula encontrada"
                  description="Ajuste os filtros para ampliar a consulta."
                />
              )}
            </section>
          </>
        )}

      </PageContainer>
    </main>
  );
}
