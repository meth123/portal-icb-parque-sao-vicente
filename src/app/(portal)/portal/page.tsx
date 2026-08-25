import {
  ArrowRight,
  ChartNoAxesCombined,
  Check,
  ClipboardCheck,
  FilePlus2,
  HeartHandshake,
  Quote,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ActionCard } from "@/components/ui/action-card";
import { Alert } from "@/components/ui/alert";
import { EmptyState } from "@/components/ui/empty-state";
import { PageContainer } from "@/components/ui/page-container";
import { PageHeader } from "@/components/ui/page-header";
import { SectionHeader } from "@/components/ui/section-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { SubmitButton } from "@/components/ui/submit-button";
import {
  canAccessPastoralDashboard,
  canManageSupervisionAttendance,
  getCurrentUser,
} from "@/lib/auth/current-user";
import { getCellReportDraftKey } from "@/lib/cell-report-draft";
import {
  getCellReportFormContext,
} from "@/lib/data/cell-reports";
import { getPortalHomeSummary } from "@/lib/data/portal-home";
import { getLatestTestimonyPreview } from "@/lib/data/testimonies";
import { summarizeTestimony } from "@/lib/testimonies";
import { logout } from "./actions";
import { AnimatedNumber } from "./animated-number";
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
            <SubmitButton
              pendingLabel="Saindo..."
              variant="secondary"
              className="w-full"
            >
              Sair
            </SubmitButton>
          </form>
        </div>
      </main>
    );
  }

  const [
    reportContext,
    homeSummary,
    latestTestimonyPreview,
    resolvedSearchParams,
  ] = await Promise.all([
    getCellReportFormContext(),
    getPortalHomeSummary(),
    getLatestTestimonyPreview(),
    searchParams,
  ]);
  const monthlyResponsibility = homeSummary?.monthlyResponsibility ?? null;
  const institutionIndicator = homeSummary?.institutionIndicator ?? null;
  const weeklyChecklist = homeSummary?.weeklyChecklist ?? null;
  const latestTestimony = latestTestimonyPreview?.hasError
    ? null
    : latestTestimonyPreview?.testimony;
  const reportWasSubmitted = resolvedSearchParams.status === "ficha-enviada";
  const checklistIsVisible = Boolean(
    weeklyChecklist &&
      !weeklyChecklist.hasError &&
      weeklyChecklist.peopleCount > 0,
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
  const canViewSupervisionAttendance = canManageSupervisionAttendance(user);
  const pastoralViewLabel =
    user.globalRole === "pastor"
      ? "Visão Pastoral"
      : user.isSupervisor
        ? "Visão de Supervisor"
        : null;
  const highlightedAction = checklistNeedsAnswer
    ? "checklist"
    : reportContext
      ? "report"
      : canViewPastoralDashboard
        ? "pastoral"
        : null;

  return (
    <main>
      <PageContainer width="wide" className="py-5 sm:py-8 lg:py-10">
        <PageHeader
          title={`Olá, ${firstName}`}
          description="Veja o que merece sua atenção e continue de onde parou."
          actions={
            pastoralViewLabel ? (
              <div className="inline-flex min-h-14 w-fit items-center gap-3 rounded-2xl border border-white/10 bg-theme-primary-active px-3 py-2.5 text-theme-primary-foreground shadow-[0_10px_26px_rgba(84,16,103,0.2)]">
                <span
                  aria-hidden="true"
                  className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-white/15"
                >
                  {user.globalRole === "pastor" ? (
                    <HeartHandshake size={20} strokeWidth={1.9} />
                  ) : (
                    <ShieldCheck size={20} strokeWidth={1.9} />
                  )}
                </span>
                <span className="text-left">
                  <span className="block text-[0.625rem] font-bold uppercase tracking-[0.13em] text-white/65">
                    Acesso pastoral
                  </span>
                  <span className="mt-0.5 block text-sm font-semibold text-white">
                    {pastoralViewLabel}
                  </span>
                </span>
                <Sparkles
                  aria-hidden="true"
                  className="ml-1 size-4 shrink-0 text-white/65"
                  strokeWidth={1.8}
                />
              </div>
            ) : null
          }
        />

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

        {latestTestimony ? (
          <section aria-labelledby="latest-testimony-title" className="mt-7">
            <Link
              href="/portal/testemunhos"
              className="group block rounded-[var(--radius-surface)] border border-theme-primary-border bg-theme-primary-subtle p-5 shadow-[var(--shadow-subtle)] transition-[background-color,border-color,box-shadow,transform] duration-150 hover:bg-theme-primary-soft hover:shadow-[var(--shadow-raised)] active:scale-[0.99] active:shadow-none focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-focus motion-reduce:transform-none sm:p-6"
            >
              <div className="flex items-start gap-3">
                <span
                  aria-hidden="true"
                  className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-surface text-theme-primary-active"
                >
                  <Quote size={20} strokeWidth={1.8} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold uppercase tracking-[0.12em] text-theme-primary">
                    Testemunho mais recente
                  </p>
                  <h2
                    id="latest-testimony-title"
                    className="mt-1 break-words font-semibold text-app-foreground"
                  >
                    {latestTestimony.authorName}
                  </h2>
                  <p className="mt-0.5 break-words text-sm text-app-secondary">
                    {latestTestimony.authorCellName
                      ? `${latestTestimony.authorRoleLabel} • ${latestTestimony.authorCellName}`
                      : latestTestimony.authorRoleLabel}
                  </p>
                </div>
              </div>

              <p className="mt-4 text-[0.9375rem] leading-6 text-app-foreground sm:text-base">
                “{summarizeTestimony(latestTestimony.content)}”
              </p>

              <div className="mt-4 flex items-center justify-between gap-4 border-t border-theme-primary-border pt-3 text-sm font-semibold text-theme-primary-active">
                <span>Ver todos os testemunhos</span>
                <ArrowRight
                  aria-hidden="true"
                  className="shrink-0 transition-transform group-hover:translate-x-1 group-active:translate-x-1.5 motion-reduce:transform-none"
                  size={18}
                  strokeWidth={1.8}
                />
              </div>
            </Link>
          </section>
        ) : null}

        <div className="mt-7 grid items-start gap-8 xl:grid-cols-[minmax(22rem,0.9fr)_minmax(28rem,1.1fr)] xl:gap-10">
          {institutionIndicator ? (
            <section aria-labelledby="monthly-summary-title">
              {institutionIndicator.hasError ? (
                <Alert tone="danger">
                  Não foi possível carregar o resumo do mês.
                </Alert>
              ) : (
                <Link
                  href="/portal/vidas"
                  aria-label={`Ver resumo e histórico mensal: ${institutionIndicator.firstTimeGuests} em ${institutionIndicator.monthLabel}`}
                  className="group flex min-h-56 flex-col overflow-hidden rounded-[1.5rem] border border-white/10 bg-theme-primary-active px-5 py-5 text-theme-primary-foreground shadow-[0_16px_36px_rgba(84,16,103,0.18)] transition-[background-color,box-shadow,transform] duration-150 hover:bg-theme-primary-hover hover:shadow-[0_18px_42px_rgba(84,16,103,0.22)] active:scale-[0.985] active:bg-theme-primary-active active:shadow-none focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-focus motion-reduce:transform-none sm:px-7 sm:py-6"
                >
                  <div className="flex items-center justify-between gap-3 text-xs font-semibold text-white/75">
                    <span>{institutionIndicator.monthLabel}</span>
                    <span className="rounded-full bg-white/10 px-2.5 py-1 text-[0.6875rem] text-white/90">
                      Resumo mensal
                    </span>
                  </div>

                  <div className="flex flex-1 flex-col justify-center py-5 sm:py-6">
                    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                      <AnimatedNumber
                        value={institutionIndicator.firstTimeGuests}
                        className="text-5xl font-semibold leading-none sm:text-6xl"
                      />
                      <h2
                        id="monthly-summary-title"
                        className="text-base font-semibold leading-5 sm:text-lg"
                      >
                        {institutionIndicator.firstTimeGuests === 1
                          ? "vida pela 1ª vez"
                          : "vidas pela 1ª vez"}
                      </h2>
                    </div>
                    <p className="mt-3 text-sm text-white/70">
                      Registradas pelas células
                    </p>
                  </div>

                  <div className="flex items-center justify-between gap-4 border-t border-white/15 pt-3.5 text-sm font-semibold text-white/85">
                    <span>Ver histórico mensal</span>
                    <ArrowRight
                      aria-hidden="true"
                      className="shrink-0 transition-transform group-hover:translate-x-1 group-active:translate-x-1.5 motion-reduce:transform-none"
                      size={18}
                      strokeWidth={1.8}
                    />
                  </div>
                </Link>
              )}
            </section>
          ) : null}

          <section
            className={institutionIndicator ? "" : "xl:col-span-2 xl:max-w-3xl"}
            aria-labelledby="portal-now-title"
          >
            <SectionHeader
              id="portal-now-title"
              title="Para você"
              description="Ações disponíveis para o seu perfil."
            />
            {checklistIsVisible || reportContext || canViewPastoralDashboard || canViewSupervisionAttendance ? (
              <div className="mt-4 space-y-3">
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
                    tone={
                      highlightedAction === "checklist" ? "theme" : "default"
                    }
                    layout={
                      highlightedAction === "checklist" ? "card" : "list"
                    }
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
                      highlightedAction === "report" ? "theme" : "default"
                    }
                    layout={
                      highlightedAction === "report" ? "card" : "list"
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

                {canViewSupervisionAttendance ? (
                  <ActionCard
                    href="/portal/supervisao/chamada"
                    title="Chamada da Supervisão"
                    description="Marcar presença em RJ ou HM"
                    icon={<ClipboardCheck size={22} strokeWidth={1.8} />}
                    layout="list"
                  />
                ) : null}

                {canViewPastoralDashboard ? (
                  <ActionCard
                    href="/portal/supervisao"
                    title="Painel pastoral"
                    description="Acompanhar células e lideranças"
                    icon={<ChartNoAxesCombined size={22} strokeWidth={1.8} />}
                    tone={
                      highlightedAction === "pastoral" ? "theme" : "default"
                    }
                    layout={
                      highlightedAction === "pastoral" ? "card" : "list"
                    }
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
        </div>

        {reportContext ? <ReportTutorialCard /> : null}
      </PageContainer>
    </main>
  );
}
