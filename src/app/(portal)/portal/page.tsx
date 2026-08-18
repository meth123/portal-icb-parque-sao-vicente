import {
  ChartNoAxesCombined,
  Check,
  ClipboardCheck,
  FilePlus2,
  Users,
} from "lucide-react";
import { redirect } from "next/navigation";
import { ActionCard } from "@/components/ui/action-card";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageContainer } from "@/components/ui/page-container";
import { PageHeader } from "@/components/ui/page-header";
import { SectionHeader } from "@/components/ui/section-header";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  canAccessPastoralDashboard,
  getCurrentUser,
} from "@/lib/auth/current-user";
import { getCellReportDraftKey } from "@/lib/cell-report-draft";
import {
  getCellReportFormContext,
  getCurrentMonthlyReportResponsibility,
} from "@/lib/data/cell-reports";
import { getInstitutionMonthlyIndicator } from "@/lib/data/institution-dashboard";
import { getWeeklyChecklistData } from "@/lib/data/weekly-checklist";
import { logout } from "./actions";
import { ClearCellReportDraft } from "./clear-cell-report-draft";
import { ReportTutorialCard } from "./report-tutorial";

type PortalPageProps = {
  searchParams: Promise<{ status?: string | string[] }>;
};

export default async function PortalPage({ searchParams }: PortalPageProps) {
  const user = await getCurrentUser();

  if (!user) redirect("/login?erro=perfil");

  if (!user.isActive) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-app-background px-4 py-10">
        <div className="w-full max-w-md text-center">
          <h1 className="text-3xl font-semibold text-app-foreground">
            Acesso desativado
          </h1>
          <p className="mt-4 leading-7 text-app-secondary">
            Esta conta está temporariamente sem acesso ao ICB Conecta. Procure um
            administrador.
          </p>
          <form action={logout} className="mt-8">
            <Button type="submit" variant="secondary" className="w-full">
              Sair
            </Button>
          </form>
        </div>
      </main>
    );
  }

  const [
    reportContext,
    monthlyResponsibility,
    institutionIndicator,
    weeklyChecklist,
    resolvedSearchParams,
  ] = await Promise.all([
    getCellReportFormContext(),
    getCurrentMonthlyReportResponsibility(),
    getInstitutionMonthlyIndicator(),
    getWeeklyChecklistData({ includeAvatars: false }),
    searchParams,
  ]);
  const reportWasSubmitted = resolvedSearchParams.status === "ficha-enviada";
  const checklistIsVisible = Boolean(
    weeklyChecklist &&
      !weeklyChecklist.hasError &&
      weeklyChecklist.people.length > 0,
  );
  const checklistWasAnswered = Boolean(
    weeklyChecklist?.currentPerson &&
      weeklyChecklist.currentPerson.prayedInGroup !== null &&
      weeklyChecklist.currentPerson.fastedForCell !== null,
  );
  const checklistNeedsAnswer = Boolean(
    weeklyChecklist?.period.isOpen &&
      weeklyChecklist.currentPerson &&
      !checklistWasAnswered,
  );
  const firstName = user.fullName?.trim().split(/\s+/)[0] ?? "usuário";
  const canViewPastoralDashboard = canAccessPastoralDashboard(user);

  return (
    <main>
      <PageContainer width="wide" className="py-6 sm:py-8 lg:py-10">
        <PageHeader title={`Olá, ${firstName}`} />

        {reportWasSubmitted ? (
          <div className="mt-6">
            {reportContext ? (
              <ClearCellReportDraft
                draftKey={getCellReportDraftKey(user.id, reportContext.cellId)}
              />
            ) : null}
            <Alert tone="success">
              Ficha de Organização enviada com sucesso.
            </Alert>
          </div>
        ) : null}

        {institutionIndicator ? (
          <section className="mt-7" aria-labelledby="monthly-summary-title">
            {institutionIndicator.hasError ? (
              <Alert tone="danger">
                Não foi possível carregar o resumo do mês.
              </Alert>
            ) : (
              <div className="relative overflow-hidden rounded-2xl bg-theme-primary-active px-5 py-6 text-theme-primary-foreground sm:px-7 sm:py-7">
                <div className="relative flex items-center justify-between gap-6">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-white/75">
                      {institutionIndicator.monthLabel}
                    </p>
                    <div className="mt-3 flex items-baseline gap-3">
                      <p className="text-5xl font-semibold leading-none sm:text-6xl">
                        {institutionIndicator.firstTimeGuests}
                      </p>
                      <h2
                        id="monthly-summary-title"
                        className="max-w-44 text-base font-semibold leading-5 sm:max-w-none sm:text-lg"
                      >
                        novos convidados
                      </h2>
                    </div>
                    <p className="mt-3 text-sm text-white/75">
                      Primeira participação nas células
                    </p>
                  </div>
                  <span
                    aria-hidden="true"
                    className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/12 sm:h-16 sm:w-16"
                  >
                    <Users size={30} strokeWidth={1.7} />
                  </span>
                </div>
              </div>
            )}
          </section>
        ) : null}

        <section className="mt-8" aria-labelledby="portal-now-title">
          <SectionHeader id="portal-now-title" title="Para você" />
          {checklistIsVisible || reportContext || canViewPastoralDashboard ? (
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              {checklistIsVisible && weeklyChecklist ? (
                <ActionCard
                  href="/portal/checklist"
                  title="Checklist semanal"
                  description={
                    weeklyChecklist.currentPerson
                      ? weeklyChecklist.period.isOpen
                        ? checklistWasAnswered
                          ? "Revisar respostas"
                          : "Responder esta semana"
                        : "Ver resultado"
                      : "Acompanhar respostas"
                  }
                  icon={<ClipboardCheck size={22} strokeWidth={1.8} />}
                  tone={checklistNeedsAnswer ? "theme" : "default"}
                  meta={
                    <StatusBadge
                      tone={checklistNeedsAnswer ? "warning" : "success"}
                    >
                      {checklistNeedsAnswer
                        ? "Pendente"
                        : weeklyChecklist.period.isOpen
                          ? "Em dia"
                          : "Encerrado"}
                    </StatusBadge>
                  }
                />
              ) : null}

              {reportContext ? (
                <ActionCard
                  href="/portal/relatorios/novo"
                  title="Preencher Ficha"
                  description={reportContext.cellName}
                  icon={<FilePlus2 size={22} strokeWidth={1.8} />}
                  tone={
                    monthlyResponsibility?.isCurrentUserResponsible
                      ? "theme"
                      : "default"
                  }
                  meta={
                    monthlyResponsibility?.isCurrentUserResponsible ? (
                      <StatusBadge tone="theme">
                        Responsável em {monthlyResponsibility.monthLabel}
                      </StatusBadge>
                    ) : null
                  }
                />
              ) : null}

              {canViewPastoralDashboard ? (
                <ActionCard
                  href="/portal/supervisao"
                  title="Painel pastoral"
                  description="Acompanhar células e lideranças"
                  icon={<ChartNoAxesCombined size={22} strokeWidth={1.8} />}
                />
              ) : null}
            </div>
          ) : (
            <EmptyState
              className="mt-4"
              icon={<Check size={28} strokeWidth={1.8} />}
              title="Tudo certo por agora"
              description="Você não tem nenhuma pendência."
            />
          )}
        </section>

        {reportContext ? <ReportTutorialCard /> : null}
      </PageContainer>
    </main>
  );
}
