import { ArrowLeft, Download, UserRound } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Alert } from "@/components/ui/alert";
import { buttonClassName } from "@/components/ui/button";
import { PageContainer } from "@/components/ui/page-container";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  canManageSupervisionAttendance,
  getCurrentUser,
} from "@/lib/auth/current-user";
import { getSupervisionAttendanceSession } from "@/lib/data/supervision-attendance";
import {
  formatSupervisionDate,
  supervisionNetworkLabel,
} from "@/lib/supervision-attendance";
import { AttendanceCall } from "./attendance-call";
import { FinalizedAttendance } from "./finalized-attendance";

export const metadata: Metadata = {
  title: "Chamada da Supervisão | ICB Conecta",
};

type AttendanceSessionPageProps = {
  params: Promise<{ sessionId: string }>;
  searchParams: Promise<{ finalizada?: string | string[] }>;
};

export default async function AttendanceSessionPage({
  params,
  searchParams,
}: AttendanceSessionPageProps) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!canManageSupervisionAttendance(user)) redirect("/portal");

  const { sessionId } = await params;
  const result = await getSupervisionAttendanceSession(sessionId);
  if (!result) redirect("/portal");
  if (result.hasError) {
    return (
      <PageContainer className="py-8">
        <Alert tone="danger">Não foi possível carregar esta chamada.</Alert>
      </PageContainer>
    );
  }
  if (!result.session) notFound();

  const session = result.session;
  const query = await searchParams;
  const justFinalized = query.finalizada === "1";

  return (
    <main>
      <PageContainer width="wide" className="space-y-6 py-6 sm:py-8 lg:py-10">
        <PageHeader
          eyebrow={`Supervisão ${supervisionNetworkLabel(session.networkCode)} — ${formatSupervisionDate(session.sessionOn)}`}
          title={session.status === "draft" ? "Marcar presença" : "Detalhes da chamada"}
          description={
            session.status === "draft"
              ? "Toque em quem compareceu. As demais pessoas continuam como não marcadas até a finalização."
              : `Responsável: ${session.responsibleName}`
          }
          actions={
            <>
              {session.status === "finalized" ? (
                <a
                  href={`/portal/supervisao/chamada/${session.id}/relatorio`}
                  className={buttonClassName({ size: "compact" })}
                >
                  <Download aria-hidden="true" className="size-4" />
                  Baixar relatório
                </a>
              ) : null}
              <Link
                href="/portal/supervisao/chamada"
                className={buttonClassName({ variant: "secondary", size: "compact" })}
              >
                <ArrowLeft aria-hidden="true" className="size-4" />
                Histórico
              </Link>
            </>
          }
        />

        {justFinalized ? (
          <Alert tone="success">Chamada finalizada e ausências registradas.</Alert>
        ) : null}

        {session.status === "finalized" ? (
          <div className="flex flex-wrap items-center gap-3 text-sm text-app-secondary">
            <StatusBadge tone="success">Finalizada</StatusBadge>
            <span className="inline-flex items-center gap-1.5">
              <UserRound aria-hidden="true" className="size-4" />
              Finalizada por {session.finalizedByName ?? session.responsibleName}
            </span>
          </div>
        ) : (
          <StatusBadge tone="warning">Em andamento</StatusBadge>
        )}

        {session.people.length === 0 ? (
          <Alert tone="warning">
            Nenhuma liderança estava vinculada a esta Rede na data selecionada.
          </Alert>
        ) : session.status === "draft" ? (
          <AttendanceCall sessionId={session.id} people={session.people} />
        ) : (
          <FinalizedAttendance sessionId={session.id} initialPeople={session.people} />
        )}
      </PageContainer>
    </main>
  );
}
