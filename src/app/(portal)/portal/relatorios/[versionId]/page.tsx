import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  CircleSlash2,
  Download,
  FilePenLine,
  MessageSquareText,
  UserRoundCheck,
  UserRoundPlus,
  Users,
} from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { buttonClassName } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { MetricCard } from "@/components/ui/metric-card";
import { PageContainer } from "@/components/ui/page-container";
import { SectionHeader } from "@/components/ui/section-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { getCurrentUser } from "@/lib/auth/current-user";
import {
  getCellReportCorrectionDraftKey,
  getCellReportDraftKey,
} from "@/lib/cell-report-draft";
import { getCellReportFormContext } from "@/lib/data/cell-reports";
import { getCellReportVersionDetail } from "@/lib/data/cell-report-detail";
import { ClearSubmittedDraft } from "./clear-submitted-draft";

export const metadata: Metadata = {
  title: "Ficha de Organização | ICB Conecta",
  robots: {
    index: false,
    follow: false,
  },
};

type CellReportDetailPageProps = {
  params: Promise<{ versionId: string }>;
  searchParams: Promise<{
    status?: string | string[];
    correcao?: string | string[];
  }>;
};

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "UTC",
  }).format(new Date(`${value}T12:00:00Z`));
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

export default async function CellReportDetailPage({
  params,
  searchParams,
}: CellReportDetailPageProps) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login?erro=perfil");
  }

  if (!user.isActive) {
    redirect("/portal");
  }

  const [{ versionId }, resolvedSearchParams] = await Promise.all([
    params,
    searchParams,
  ]);
  const [detail, reportContext] = await Promise.all([
    getCellReportVersionDetail(versionId),
    getCellReportFormContext(),
  ]);

  if (!detail) {
    notFound();
  }

  const wasJustSubmitted = resolvedSearchParams.status === "enviada";
  const correctionSourceVersionId =
    typeof resolvedSearchParams.correcao === "string" &&
    uuidPattern.test(resolvedSearchParams.correcao)
      ? resolvedSearchParams.correcao
      : null;
  const submittedDraftKey = correctionSourceVersionId
    ? getCellReportCorrectionDraftKey(
        user.id,
        detail.cellId,
        correctionSourceVersionId,
      )
    : getCellReportDraftKey(user.id, detail.cellId);
  const canCorrect =
    detail.isCurrent && reportContext?.cellId === detail.cellId;
  const groupedGuests = new Map<string, typeof detail.guests>();

  for (const guest of detail.guests) {
    const group = groupedGuests.get(guest.responsibleName) ?? [];
    group.push(guest);
    groupedGuests.set(guest.responsibleName, group);
  }

  return (
    <main className="min-h-full bg-app-background py-6 sm:py-8">
      {wasJustSubmitted ? (
        <ClearSubmittedDraft
          draftKey={submittedDraftKey}
        />
      ) : null}

      <PageContainer className="space-y-6 sm:space-y-8">
        <Link
          href="/portal/relatorios"
          className={buttonClassName({ variant: "ghost", size: "compact", className: "-ml-3" })}
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
          Histórico
        </Link>

        <article className="space-y-8">
          <header className="overflow-hidden rounded-2xl border border-theme-primary-border bg-surface">
            <div className="h-2 bg-theme-primary" aria-hidden="true" />
            <div className="p-5 sm:p-7">
          {wasJustSubmitted ? (
                <Alert tone="success" className="mb-6">
              Ficha enviada e registrada com sucesso.
                </Alert>
          ) : null}

              <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-theme-primary">Ficha de Organização</p>
                  <h1 className="mt-1 text-3xl font-semibold text-app-foreground sm:text-4xl">
                {detail.cellName}
              </h1>
                  <p className="mt-3 flex items-center gap-2 text-app-secondary">
                    <CalendarDays aria-hidden="true" className="size-5 text-theme-primary" />
                    {formatDate(detail.meetingOn)}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge tone={detail.isCurrent ? "success" : "neutral"}>
                    {detail.isCurrent ? "Versão atual" : "Substituída"}
                  </StatusBadge>
                  <StatusBadge tone="theme">v{detail.versionNumber}</StatusBadge>
                </div>
              </div>
            </div>
          </header>

          <section aria-labelledby="summary-heading">
            <SectionHeader id="summary-heading" title="Resumo da reunião" />
            <dl className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <MetricCard
                label="Formato"
                value={detail.meetingFormat === "in_person" ? "Presencial" : "Online"}
                icon={<CalendarDays className="size-5" />}
              />
              <MetricCard label="Membros" value={detail.membersCount} icon={<Users className="size-5" />} />
              <MetricCard
                label="Convidados"
                value={detail.guestsCount}
                icon={<UserRoundPlus className="size-5" />}
              />
              <MetricCard label="Primeira vez" value={detail.firstTimeGuestsCount} tone="theme" />
            </dl>
            <p className="mt-3 text-sm text-app-secondary">
              Total presente: <strong className="text-app-foreground">{detail.membersCount + detail.guestsCount}</strong>
            </p>
          </section>

          <section aria-labelledby="leadership-heading" className="border-t border-app-border pt-8">
            <SectionHeader id="leadership-heading" title="Presença da liderança" />
            <dl className="mt-4 overflow-hidden rounded-2xl border border-app-border bg-surface sm:grid sm:grid-cols-2">
              <div className="p-5 sm:border-r sm:border-app-border">
                <dt className="text-sm font-medium text-app-secondary">Líder</dt>
                <dd className="mt-2 flex items-center justify-between gap-3 text-app-foreground">
                  <span className="font-semibold">{detail.leaderName}</span>
                  <StatusBadge tone={detail.leaderWasPresent ? "success" : "neutral"}>
                    {detail.leaderWasPresent ? "Presente" : "Ausente"}
                  </StatusBadge>
                </dd>
              </div>
              <div className="border-t border-app-border p-5 sm:border-t-0">
                <dt className="text-sm font-medium text-app-secondary">Vice-líderes</dt>
                <dd className="mt-3">
                  {detail.leadership.some((person) => person.role === "vice_leader") ? (
                    <ul className="space-y-3">
                      {detail.leadership
                        .filter((person) => person.role === "vice_leader")
                        .map((person) => {
                          const wasPresent = detail.presentViceLeadershipIds.includes(
                            person.leadershipId,
                          );

                          return (
                            <li key={person.leadershipId} className="flex items-center justify-between gap-3 text-app-foreground">
                              <span className="min-w-0 truncate font-semibold">{person.name}</span>
                              <StatusBadge tone={wasPresent ? "success" : "neutral"}>
                                {wasPresent ? "Presente" : "Ausente"}
                              </StatusBadge>
                            </li>
                          );
                        })}
                    </ul>
                  ) : (
                    <span className="text-app-secondary">Nenhum vinculado à célula</span>
                  )}
                </dd>
              </div>
            </dl>
          </section>

          <section aria-labelledby="members-heading" className="border-t border-app-border pt-8">
            <SectionHeader
              id="members-heading"
              title="Membros presentes"
              description={`${detail.members.length} ${detail.members.length === 1 ? "membro" : "membros"}`}
            />
            {detail.members.length > 0 ? (
              <ol className="mt-4 grid overflow-hidden rounded-2xl border border-app-border bg-surface sm:grid-cols-2">
                {detail.members.map((member) => (
                  <li key={member.position} className="flex min-h-12 items-center gap-3 border-b border-app-border px-4 py-3 text-app-foreground last:border-b-0 sm:[&:nth-last-child(2):nth-child(odd)]:border-b-0 sm:[&:nth-child(odd)]:border-r">
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-theme-primary-soft text-xs font-semibold text-theme-primary-active">
                      {member.position}
                    </span>
                    <span className="min-w-0 truncate">{member.name}</span>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="mt-3 text-app-secondary">Nenhum membro registrado.</p>
            )}
          </section>

          <section aria-labelledby="guests-heading" className="border-t border-app-border pt-8">
            <SectionHeader
              id="guests-heading"
              title="Convidados"
              description={`${groupedGuests.size} ${groupedGuests.size === 1 ? "responsável" : "responsáveis"}`}
            />
            {groupedGuests.size > 0 ? (
              <div className="mt-4 grid gap-4 lg:grid-cols-2">
                {[...groupedGuests.entries()].map(([responsibleName, guests]) => (
                  <section key={responsibleName} className="rounded-2xl border border-app-border bg-surface p-5">
                    <div className="flex items-center gap-3">
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-theme-primary-soft text-theme-primary-active">
                        <UserRoundCheck aria-hidden="true" className="size-5" />
                      </span>
                      <div className="min-w-0">
                        <p className="text-xs text-app-secondary">Responsável</p>
                        <h3 className="truncate font-semibold text-app-foreground">{responsibleName}</h3>
                      </div>
                    </div>
                    <ul className="mt-4 divide-y divide-app-border border-t border-app-border">
                      {guests.map((guest) => (
                        <li key={guest.position} className="flex min-h-11 items-center justify-between gap-3 py-2.5 text-app-foreground">
                          <span className="min-w-0 truncate">{guest.name}</span>
                          {guest.isFirstTime ? (
                            <StatusBadge tone="success">1ª vez</StatusBadge>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  </section>
                ))}
              </div>
            ) : (
              <p className="mt-3 text-app-secondary">Nenhum convidado registrado.</p>
            )}
          </section>

          <section aria-labelledby="evangelism-heading" className="border-t border-app-border pt-8">
            <SectionHeader
              id="evangelism-heading"
              title="Evangelismo"
              description="Registros vinculados a esta reunião"
            />
            {detail.evangelismEntries.length > 0 ? (
              <div className="mt-4 grid gap-4 lg:grid-cols-2">
              {detail.evangelismEntries.map((entry, index) => (
                  <section key={entry.id} className="overflow-hidden rounded-2xl border border-app-border bg-surface">
                    <div className={`h-1.5 ${entry.didEvangelize ? "bg-success" : "bg-app-border"}`} aria-hidden="true" />
                    <div className="p-5 sm:p-6">
                  <div className="flex items-start justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-3">
                          <span className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${entry.didEvangelize ? "bg-success-soft text-success" : "bg-surface-muted text-app-secondary"}`}>
                            {entry.didEvangelize ? <CheckCircle2 aria-hidden="true" className="size-5" /> : <CircleSlash2 aria-hidden="true" className="size-5" />}
                          </span>
                          <h3 className="min-w-0 truncate font-semibold text-app-foreground">
                      {entry.didEvangelize
                        ? `Evangelismo ${index + 1}`
                        : entry.registeredByName}
                    </h3>
                        </div>
                        <StatusBadge tone={entry.didEvangelize ? "success" : "neutral"}>
                          {entry.didEvangelize ? "Realizado" : "Não realizado"}
                        </StatusBadge>
                  </div>

                  {entry.didEvangelize ? (
                        <dl className="mt-5 grid gap-4 border-t border-app-border pt-5 sm:grid-cols-2">
                      <div>
                            <dt className="text-xs font-medium text-app-secondary">Equipe</dt>
                            <dd className="mt-1 text-sm text-app-foreground">
                          {entry.leadershipNames.join(", ") || entry.registeredByName}
                        </dd>
                      </div>
                      <div>
                            <dt className="text-xs font-medium text-app-secondary">Registrado por</dt>
                            <dd className="mt-1 text-sm text-app-foreground">{entry.registeredByName}</dd>
                      </div>
                      <div>
                            <dt className="text-xs font-medium text-app-secondary">Data</dt>
                            <dd className="mt-1 text-sm text-app-foreground">
                          {entry.evangelismOn ? formatDate(entry.evangelismOn) : "Não informada"}
                        </dd>
                      </div>
                      <div>
                            <dt className="text-xs font-medium text-app-secondary">Duração</dt>
                            <dd className="mt-1 text-sm text-app-foreground">{entry.durationText ?? "Não informada"}</dd>
                      </div>
                      <div className="sm:col-span-2">
                            <dt className="text-xs font-medium text-app-secondary">Outros integrantes</dt>
                            <dd className="mt-1 text-sm text-app-foreground">
                          {entry.participantNames.length > 0 ? entry.participantNames.join(", ") : "Nenhum"}
                        </dd>
                      </div>
                    </dl>
                  ) : null}

                      <div className="mt-5 flex items-start gap-3 rounded-xl bg-surface-muted p-4">
                        <MessageSquareText aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-theme-primary" />
                        <div>
                          <p className="text-xs font-medium text-app-secondary">Relato</p>
                          <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-app-foreground">{entry.comments}</p>
                        </div>
                      </div>
                    </div>
                </section>
              ))}
            </div>
            ) : (
              <EmptyState
                className="mt-4"
                icon={<MessageSquareText className="size-8" />}
                title="Nenhum registro de evangelismo"
              />
            )}
          </section>

          <footer className="border-t border-app-border pt-8">
            <p className="text-sm leading-6 text-app-secondary">
              Enviada por {detail.submittedByName} em {formatDateTime(detail.submittedAt)}.
            </p>
            <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              {canCorrect ? (
                <Link
                  href={`/portal/relatorios/${detail.id}/corrigir`}
                  className={buttonClassName({ className: "w-full sm:w-auto" })}
                >
                  <FilePenLine aria-hidden="true" className="size-5" />
                  Corrigir Ficha
                </Link>
              ) : null}
              <a
                href={`/portal/relatorios/${detail.id}/pdf`}
                className={buttonClassName({ variant: "secondary", className: "w-full sm:w-auto" })}
              >
                <Download aria-hidden="true" className="size-5" />
                Baixar PDF
              </a>
            </div>
          </footer>
        </article>
      </PageContainer>
    </main>
  );
}
