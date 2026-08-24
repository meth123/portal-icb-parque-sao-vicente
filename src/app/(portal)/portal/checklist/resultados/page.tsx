import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  CalendarRange,
  Download,
  FileClock,
  Search,
  Users,
} from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { buttonClassName } from "@/components/ui/button";
import { controlClassName } from "@/components/ui/control-styles";
import { EmptyState } from "@/components/ui/empty-state";
import { FilterPanel } from "@/components/ui/filter-panel";
import { MetricCard } from "@/components/ui/metric-card";
import { PageContainer } from "@/components/ui/page-container";
import { PageHeader } from "@/components/ui/page-header";
import { SectionHeader } from "@/components/ui/section-header";
import { Surface } from "@/components/ui/surface";
import {
  canAccessPastoralDashboard,
  getCurrentUser,
} from "@/lib/auth/current-user";
import {
  formatChecklistAvailableAt,
  formatChecklistPeriodLabel,
} from "@/lib/checklist-results";
import {
  getChecklistResultsReport,
  type ChecklistResultsPerson,
} from "@/lib/data/checklist-results";

export const metadata: Metadata = {
  title: "Resultados do Checklist | ICB Conecta",
  robots: { index: false, follow: false },
};

type ChecklistResultsPageProps = {
  searchParams: Promise<{
    periodo?: string | string[];
    mes?: string | string[];
    semana?: string | string[];
    rede?: string | string[];
  }>;
};

const inputClassName = `mt-2 ${controlClassName}`;

function singleValue(value: string | string[] | undefined) {
  return typeof value === "string" ? value : undefined;
}

function roleLabel(role: ChecklistResultsPerson["leadershipRole"]) {
  return role === "leader" ? "Líder" : "Vice-líder";
}

export default async function ChecklistResultsPage({
  searchParams,
}: ChecklistResultsPageProps) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?erro=perfil");
  if (!canAccessPastoralDashboard(user)) redirect("/portal/checklist");

  const query = await searchParams;
  const result = await getChecklistResultsReport({
    periodType: singleValue(query.periodo),
    month: singleValue(query.mes),
    week: singleValue(query.semana),
    networkCode: singleValue(query.rede),
  });
  if (!result) redirect("/portal/checklist");

  const { filters, report, hasError } = result;
  const periodLabel = report
    ? formatChecklistPeriodLabel(
        report.periodType,
        report.periodStart,
        report.periodEnd,
      )
    : "Período selecionado";
  const selectedNetworkLabel =
    report?.availableNetworks.find(
      (network) => network.code === filters.networkCode,
    )?.name ?? "Todas as Redes permitidas";
  const exportParams = new URLSearchParams({
    periodo: filters.periodType,
    mes: filters.month,
    semana: filters.week,
  });
  if (filters.networkCode) exportParams.set("rede", filters.networkCode);

  const groupedPeople = new Map<
    string,
    { networkName: string; cells: Map<string, ChecklistResultsPerson[]> }
  >();
  for (const person of report?.people ?? []) {
    const network = groupedPeople.get(person.networkId) ?? {
      networkName: person.networkName,
      cells: new Map(),
    };
    const people = network.cells.get(person.cellId) ?? [];
    people.push(person);
    network.cells.set(person.cellId, people);
    groupedPeople.set(person.networkId, network);
  }

  const monthlyParams = new URLSearchParams({
    periodo: "monthly",
    mes: filters.month,
  });
  const weeklyParams = new URLSearchParams({
    periodo: "weekly",
    semana: filters.week,
  });
  if (filters.networkCode) {
    monthlyParams.set("rede", filters.networkCode);
    weeklyParams.set("rede", filters.networkCode);
  }

  return (
    <main className="min-h-full bg-app-background py-6 sm:py-8">
      <PageContainer width="wide" className="space-y-6 sm:space-y-8">
        <PageHeader
          eyebrow="Checklist"
          title="Resultados"
          description="Consulte períodos fechados e exporte um PDF consolidado por Rede, Célula e liderança."
          actions={
            report?.isComplete ? (
              <a
                href={`/portal/checklist/resultados/pdf?${exportParams.toString()}`}
                className={buttonClassName({ className: "w-full sm:w-auto" })}
              >
                <Download aria-hidden="true" className="size-5" />
                Baixar PDF
              </a>
            ) : null
          }
        />

        <div className="flex gap-2 rounded-2xl border border-app-border bg-surface p-2">
          <Link
            href={`/portal/checklist/resultados?${monthlyParams.toString()}`}
            className={buttonClassName({
              variant: filters.periodType === "monthly" ? "primary" : "ghost",
              className: "flex-1",
            })}
          >
            Mensal
          </Link>
          <Link
            href={`/portal/checklist/resultados?${weeklyParams.toString()}`}
            className={buttonClassName({
              variant: filters.periodType === "weekly" ? "primary" : "ghost",
              className: "flex-1",
            })}
          >
            Semanal
          </Link>
        </div>

        <FilterPanel title="Período e Rede" activeFilters={filters.networkCode ? 1 : 0}>
          <form method="get" className="grid gap-4 md:grid-cols-3">
            <input type="hidden" name="periodo" value={filters.periodType} />
            {filters.periodType === "monthly" ? (
              <label>
                <span className="text-sm font-semibold text-app-foreground">Mês</span>
                <input
                  type="month"
                  name="mes"
                  defaultValue={filters.month}
                  className={inputClassName}
                />
              </label>
            ) : (
              <label>
                <span className="text-sm font-semibold text-app-foreground">
                  Início da semana (segunda-feira)
                </span>
                <input
                  type="date"
                  name="semana"
                  defaultValue={filters.week}
                  className={inputClassName}
                />
              </label>
            )}
            <label>
              <span className="text-sm font-semibold text-app-foreground">Rede</span>
              <select
                name="rede"
                defaultValue={filters.networkCode ?? ""}
                className={inputClassName}
              >
                <option value="">Todas as Redes permitidas</option>
                {(report?.availableNetworks ?? []).map((network) => (
                  <option key={network.id} value={network.code}>
                    {network.code === "H.M" ? "HM" : network.code} — {network.name}
                  </option>
                ))}
              </select>
            </label>
            <div className="flex items-end">
              <button
                type="submit"
                className={buttonClassName({ className: "w-full md:w-auto" })}
              >
                <Search aria-hidden="true" className="size-5" />
                Consultar
              </button>
            </div>
          </form>
        </FilterPanel>

        {hasError ? (
          <Alert tone="danger">
            Não foi possível carregar os resultados. Tente novamente mais tarde.
          </Alert>
        ) : report && !report.isComplete ? (
          <Alert tone="warning">
            Este período ainda não está fechado. O relatório definitivo ficará disponível em {formatChecklistAvailableAt(report.availableAt)}.
          </Alert>
        ) : report ? (
          <>
            <section aria-labelledby="checklist-summary-heading">
              <SectionHeader
                id="checklist-summary-heading"
                title={`Resumo geral — ${periodLabel}`}
                description={`${selectedNetworkLabel} · ${report.weeks.length} ${report.weeks.length === 1 ? "Checklist fechado" : "Checklists fechados"}`}
              />
              <dl className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                <MetricCard
                  label="Lideranças consideradas"
                  value={report.summary.leadershipsConsidered}
                  icon={<Users className="size-5" />}
                  tone="theme"
                />
                <MetricCard
                  label="Oraram em grupo"
                  value={`${report.summary.prayedCount}/${report.summary.eligibleChecklists}`}
                />
                <MetricCard
                  label="Jejuaram pela célula"
                  value={`${report.summary.fastedCount}/${report.summary.eligibleChecklists}`}
                />
                <MetricCard
                  label="Evangelizaram"
                  value={`${report.summary.evangelizedCount}/${report.summary.eligibleChecklists}`}
                  tone="success"
                />
                <MetricCard
                  label="Pendentes"
                  value={`${report.summary.pendingCount}/${report.summary.eligibleChecklists}`}
                  tone={report.summary.pendingCount > 0 ? "warning" : "default"}
                />
              </dl>
            </section>

            {groupedPeople.size > 0 ? (
              <section aria-labelledby="checklist-detail-heading">
                <SectionHeader
                  id="checklist-detail-heading"
                  title="Detalhamento"
                  description="Rede → Célula → Liderança"
                />
                <div className="mt-4 space-y-5">
                  {[...groupedPeople.entries()].map(([networkId, network]) => (
                    <Surface key={networkId} className="p-0 sm:p-0">
                      <div className="border-b border-app-border px-4 py-4 sm:px-5">
                        <h3 className="text-lg font-semibold text-app-foreground">
                          {network.networkName}
                        </h3>
                      </div>
                      <div className="divide-y divide-app-border">
                        {[...network.cells.entries()].map(([cellId, people]) => (
                          <article key={cellId} className="px-4 py-5 sm:px-5">
                            <h4 className="font-semibold text-theme-primary-active">
                              {people[0].cellName}
                            </h4>
                            <div className="mt-4 grid gap-3 xl:grid-cols-2">
                              {people.map((person) => (
                                <div
                                  key={`${person.profileId}-${person.leadershipRole}`}
                                  className="rounded-xl border border-app-border bg-surface-muted p-4"
                                >
                                  <p className="font-semibold text-app-foreground">
                                    {person.fullName} — {roleLabel(person.leadershipRole)}
                                  </p>
                                  <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-4">
                                    <ResultCount label="Oração" value={person.prayedCount} total={person.eligibleChecklists} />
                                    <ResultCount label="Jejum" value={person.fastedCount} total={person.eligibleChecklists} />
                                    <ResultCount label="Evangelismo" value={person.evangelizedCount} total={person.eligibleChecklists} />
                                    <ResultCount label="Pendências" value={person.pendingCount} total={person.eligibleChecklists} />
                                  </dl>
                                </div>
                              ))}
                            </div>
                          </article>
                        ))}
                      </div>
                    </Surface>
                  ))}
                </div>
              </section>
            ) : (
              <EmptyState
                icon={<CalendarRange className="size-8" />}
                title="Nenhuma liderança elegível"
                description="Não existem resultados fechados para a Rede e o período selecionados."
              />
            )}
          </>
        ) : null}

        <div className="flex flex-wrap gap-3">
          <Link
            href="/portal/checklist"
            className={buttonClassName({ variant: "secondary" })}
          >
            <FileClock aria-hidden="true" className="size-5" />
            Voltar ao Checklist
          </Link>
        </div>
      </PageContainer>
    </main>
  );
}

function ResultCount({
  label,
  value,
  total,
}: {
  label: string;
  value: number;
  total: number;
}) {
  return (
    <div>
      <dt className="text-app-secondary">{label}</dt>
      <dd className="mt-0.5 font-semibold text-app-foreground">
        {value}/{total}
      </dd>
    </div>
  );
}
