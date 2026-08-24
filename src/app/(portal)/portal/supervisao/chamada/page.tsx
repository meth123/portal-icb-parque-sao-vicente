import { CalendarDays, ChevronRight, ClipboardCheck, Users } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Alert } from "@/components/ui/alert";
import { EmptyState } from "@/components/ui/empty-state";
import { PageContainer } from "@/components/ui/page-container";
import { PageHeader } from "@/components/ui/page-header";
import { SectionHeader } from "@/components/ui/section-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { Surface } from "@/components/ui/surface";
import {
  canManageSupervisionAttendance,
  getCurrentUser,
} from "@/lib/auth/current-user";
import { getSupervisionAttendanceOverview } from "@/lib/data/supervision-attendance";
import { getSaoPauloDate } from "@/lib/dates/sao-paulo";
import {
  formatSupervisionDate,
  supervisionNetworkLabel,
} from "@/lib/supervision-attendance";
import { NewCallForm } from "./new-call-form";

export const metadata: Metadata = {
  title: "Chamada da Supervisão | ICB Conecta",
};

export default async function SupervisionAttendancePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!canManageSupervisionAttendance(user)) redirect("/portal");

  const result = await getSupervisionAttendanceOverview();
  if (!result) redirect("/portal");

  const overview = result.overview;

  return (
    <main>
      <PageContainer width="wide" className="space-y-8 py-6 sm:py-8 lg:py-10">
        <PageHeader
          eyebrow="Supervisão"
          title="Chamada da Supervisão"
          description="Registre a presença das lideranças de RJ e HM, sem alterar o Checklist Semanal."
        />

        {result.hasError || !overview ? (
          <Alert tone="danger">
            Não foi possível carregar as chamadas. Tente novamente.
          </Alert>
        ) : (
          <>
            <Surface tone="theme">
              <div className="mb-5 flex items-center gap-3">
                <span className="flex size-11 items-center justify-center rounded-xl bg-theme-primary-soft text-theme-primary-active">
                  <ClipboardCheck aria-hidden="true" className="size-6" />
                </span>
                <div>
                  <h2 className="text-lg font-semibold text-app-foreground">Nova chamada</h2>
                  <p className="text-sm text-app-secondary">A lista será carregada automaticamente pela Rede.</p>
                </div>
              </div>
              <NewCallForm networks={overview.networks} today={getSaoPauloDate()} />
            </Surface>

            <section aria-labelledby="attendance-history-heading">
              <SectionHeader
                id="attendance-history-heading"
                title="Histórico"
                description="Todas as chamadas iniciadas e finalizadas."
              />

              {overview.sessions.length > 0 ? (
                <div className="mt-4 grid gap-3 lg:grid-cols-2">
                  {overview.sessions.map((session) => (
                    <Link
                      key={session.id}
                      href={`/portal/supervisao/chamada/${session.id}`}
                      className="group flex min-h-28 items-center gap-4 rounded-2xl border border-app-border bg-surface p-4 shadow-[var(--shadow-subtle)] transition-[border-color,background-color,box-shadow,transform] duration-150 hover:border-theme-primary-border hover:shadow-[var(--shadow-raised)] active:scale-[0.99] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus motion-reduce:transform-none sm:p-5"
                    >
                      <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-theme-primary-subtle text-theme-primary-active">
                        <CalendarDays aria-hidden="true" className="size-6" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-center gap-2">
                          <strong className="text-lg text-app-foreground">
                            {supervisionNetworkLabel(session.networkCode)} — {formatSupervisionDate(session.sessionOn)}
                          </strong>
                          <StatusBadge tone={session.status === "finalized" ? "success" : "warning"}>
                            {session.status === "finalized" ? "Finalizada" : "Em andamento"}
                          </StatusBadge>
                        </span>
                        <span className="mt-2 flex items-center gap-2 text-sm text-app-secondary">
                          <Users aria-hidden="true" className="size-4" />
                          {session.status === "finalized"
                            ? `${session.present} presentes · ${session.absent} ausentes · ${session.percentage}%`
                            : `${session.present} de ${session.total} presentes`}
                        </span>
                      </span>
                      <ChevronRight aria-hidden="true" className="size-5 shrink-0 text-app-secondary transition-transform group-hover:translate-x-0.5" />
                    </Link>
                  ))}
                </div>
              ) : (
                <EmptyState
                  icon={<ClipboardCheck className="size-8" />}
                  title="Nenhuma chamada registrada"
                  description="Inicie a primeira chamada usando RJ ou HM."
                />
              )}
            </section>
          </>
        )}
      </PageContainer>
    </main>
  );
}
