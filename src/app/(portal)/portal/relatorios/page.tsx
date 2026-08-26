import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  CalendarDays,
  Download,
  Eye,
  FilePlus2,
  Files,
  Search,
  Users,
  X,
} from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { buttonClassName } from "@/components/ui/button";
import { controlClassName } from "@/components/ui/control-styles";
import { EmptyState } from "@/components/ui/empty-state";
import { FilterPanel } from "@/components/ui/filter-panel";
import { PageContainer } from "@/components/ui/page-container";
import { PageHeader } from "@/components/ui/page-header";
import { SectionHeader } from "@/components/ui/section-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { getCurrentUser } from "@/lib/auth/current-user";
import { getCellReportHistory } from "@/lib/data/cell-report-history";
import {
  getCellReportFormContext,
  getCurrentMonthlyReportResponsibility,
} from "@/lib/data/cell-reports";
import { MonthlyResponsibility } from "./monthly-responsibility";

export const metadata: Metadata = {
  title: "Histórico de Fichas | ICB Conecta",
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

const filterControlClassName = `mt-2 ${controlClassName}`;

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

  const activeFilters = [
    selectedCellId,
    dateFrom,
    dateTo,
    selectedNetworkId,
    selectedCellTypeId,
  ].filter(Boolean).length;

  return (
    <main className="min-h-full bg-app-background py-6 sm:py-8">
      <PageContainer width="wide" className="space-y-6 sm:space-y-8">
        <PageHeader
          eyebrow="Fichas"
          title="Histórico"
          description="Encontre uma reunião, confira os dados registrados ou baixe o PDF."
          actions={
            reportContext ? (
              <Link
                href="/portal/relatorios/novo"
                className={buttonClassName({ className: "w-full sm:w-auto" })}
              >
                <FilePlus2 aria-hidden="true" className="size-5" />
                Nova Ficha
              </Link>
            ) : null
          }
        />

        {monthlyResponsibility ? (
          <MonthlyResponsibility {...monthlyResponsibility} />
        ) : null}

        <FilterPanel activeFilters={activeFilters}>
          <form method="get" className="grid gap-4 md:grid-cols-4">
            {history.canUseOrganizationFilters ? (
              <>
                <label className="md:col-span-2">
                  <span className="text-sm font-semibold text-app-foreground">Rede</span>
                  <select
                    name="rede"
                    defaultValue={selectedNetworkId}
                    className={filterControlClassName}
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
                  <span className="text-sm font-semibold text-app-foreground">Tipo</span>
                  <select
                    name="tipo"
                    defaultValue={selectedCellTypeId}
                    className={filterControlClassName}
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
              <span className="text-sm font-semibold text-app-foreground">Célula</span>
              <select
                name="celula"
                defaultValue={selectedCellId}
                className={filterControlClassName}
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
              <span className="text-sm font-semibold text-app-foreground">De</span>
              <input
                type="date"
                name="inicio"
                defaultValue={dateFrom}
                className={filterControlClassName}
              />
            </label>
            <label>
              <span className="text-sm font-semibold text-app-foreground">Até</span>
              <input
                type="date"
                name="fim"
                defaultValue={dateTo}
                className={filterControlClassName}
              />
            </label>
            <div className="flex flex-col gap-3 md:col-span-4 sm:flex-row">
              <button type="submit" className={buttonClassName({ size: "compact" })}>
                <Search aria-hidden="true" className="size-4" />
                Buscar
              </button>
              {activeFilters > 0 ? (
                <Link
                  href="/portal/relatorios"
                  className={buttonClassName({ variant: "secondary", size: "compact" })}
                >
                  <X aria-hidden="true" className="size-4" />
                  Limpar
                </Link>
              ) : null}
            </div>
          </form>
        </FilterPanel>

        {history.hasError ? (
          <Alert tone="danger">
            Não foi possível carregar as Fichas. Tente novamente mais tarde.
          </Alert>
        ) : history.reports.length > 0 ? (
          <section aria-labelledby="reports-heading">
            <SectionHeader
              id="reports-heading"
              title="Fichas encontradas"
              description={`${history.reports.length} ${history.reports.length === 1 ? "registro recente" : "registros recentes"}`}
            />
            <ul className="mt-4 grid gap-4 xl:grid-cols-2">
              {history.reports.map((report) => (
                <li
                  key={report.versionId}
                  className="rounded-2xl border border-app-border bg-surface p-5 transition-colors hover:border-theme-primary-border sm:p-6"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="flex items-center gap-2 text-sm font-medium text-app-secondary">
                        <CalendarDays aria-hidden="true" className="size-4 text-theme-primary" />
                        {formatDate(report.meetingOn)}
                      </p>
                      <h3 className="mt-2 truncate text-xl font-semibold text-app-foreground">
                        {report.cellName}
                      </h3>
                    </div>
                    <StatusBadge tone={report.versionNumber > 1 ? "theme" : "neutral"}>
                      v{report.versionNumber}
                    </StatusBadge>
                  </div>
                  <dl className="mt-5 grid grid-cols-3 gap-3 border-y border-app-border py-4 text-center">
                    <div className="min-w-0">
                      <dt className="text-xs text-app-secondary">Membros</dt>
                      <dd className="mt-1 text-lg font-semibold text-app-foreground">{report.membersCount}</dd>
                    </div>
                    <div className="min-w-0 border-x border-app-border px-2">
                      <dt className="text-xs text-app-secondary">Convidados</dt>
                      <dd className="mt-1 text-lg font-semibold text-app-foreground">{report.guestsCount}</dd>
                    </div>
                    <div className="min-w-0">
                      <dt className="text-xs text-app-secondary">1ª vez</dt>
                      <dd className="mt-1 text-lg font-semibold text-app-foreground">{report.firstTimeGuestsCount}</dd>
                    </div>
                  </dl>
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-sm text-app-secondary">
                    <span className="inline-flex items-center gap-2">
                      <Users aria-hidden="true" className="size-4" />
                      {report.meetingFormat === "in_person" ? "Presencial" : "Online"}
                    </span>
                    <span>Enviada em {formatDateTime(report.submittedAt)}</span>
                  </div>
                  <div className="mt-5 flex gap-3">
                    <Link
                      href={`/portal/relatorios/${report.versionId}`}
                      className={buttonClassName({ className: "flex-1" })}
                    >
                      <Eye aria-hidden="true" className="size-5" />
                      Ver Ficha
                    </Link>
                    <a
                      href={`/portal/relatorios/${report.versionId}/pdf`}
                      className={buttonClassName({
                        variant: "secondary",
                        className: "flex-1",
                      })}
                      aria-label={`Baixar PDF da Ficha de ${report.cellName} em ${formatDate(report.meetingOn)}`}
                    >
                      <Download aria-hidden="true" className="size-5" />
                      Baixar PDF
                    </a>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ) : (
          <EmptyState
            icon={<Files className="size-8" />}
            title="Nenhuma Ficha encontrada"
            description="Ajuste os filtros ou registre uma nova reunião."
          />
        )}

        <Link
          href="/portal"
          className={buttonClassName({
            variant: "ghost",
            size: "compact",
            className: "w-full sm:w-auto",
          })}
        >
          Voltar ao ICB Conecta
        </Link>
      </PageContainer>
    </main>
  );
}
