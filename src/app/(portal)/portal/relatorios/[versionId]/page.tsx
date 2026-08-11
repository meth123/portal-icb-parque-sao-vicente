import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import {
  getCellReportCorrectionDraftKey,
  getCellReportDraftKey,
} from "@/lib/cell-report-draft";
import { getCellReportFormContext } from "@/lib/data/cell-reports";
import { getCellReportVersionDetail } from "@/lib/data/cell-report-detail";
import { ClearSubmittedDraft } from "./clear-submitted-draft";

export const metadata: Metadata = {
  title: "Ficha de Organização | Portal ICB Parque São Vicente",
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
    <main className="min-h-screen bg-zinc-100 px-4 py-8 sm:px-6 sm:py-10">
      {wasJustSubmitted ? (
        <ClearSubmittedDraft
          draftKey={submittedDraftKey}
        />
      ) : null}

      <article className="mx-auto w-full max-w-5xl overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-sm">
        <header className="border-b border-zinc-200 px-6 py-7 sm:px-10 sm:py-9">
          {wasJustSubmitted ? (
            <p
              role="status"
              className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 font-semibold text-emerald-900"
            >
              Ficha enviada e registrada com sucesso.
            </p>
          ) : null}

          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-zinc-600">
                Ficha de Organização
              </p>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight text-zinc-950 sm:text-4xl">
                {detail.cellName}
              </h1>
              <p className="mt-3 text-lg text-zinc-700">
                Data da Célula: {formatDate(detail.meetingOn)}
              </p>
            </div>
            <div className="rounded-xl bg-zinc-100 px-4 py-3 text-sm text-zinc-700">
              <p className="font-semibold text-zinc-950">
                Versão {detail.versionNumber}
              </p>
              <p className="mt-1">
                {detail.isCurrent ? "Versão atual" : "Versão substituída"}
              </p>
            </div>
          </div>
        </header>

        <div className="space-y-8 px-6 py-8 sm:px-10 sm:py-10">
          <section aria-labelledby="summary-heading">
            <h2 id="summary-heading" className="text-xl font-semibold text-zinc-950">
              Resumo
            </h2>
            <dl className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {[
                ["Formato", detail.meetingFormat === "in_person" ? "Presencial" : "Online"],
                ["Membros", String(detail.membersCount)],
                ["Convidados", String(detail.guestsCount)],
                ["1ª vez", String(detail.firstTimeGuestsCount)],
              ].map(([label, value]) => (
                <div key={label} className="rounded-2xl bg-zinc-100 p-4">
                  <dt className="text-sm text-zinc-600">{label}</dt>
                  <dd className="mt-1 text-xl font-semibold text-zinc-950">{value}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-4 text-lg font-semibold text-zinc-950">
              Geral: {detail.membersCount + detail.guestsCount}
            </p>
          </section>

          <section aria-labelledby="leadership-heading" className="border-t border-zinc-200 pt-8">
            <h2 id="leadership-heading" className="text-xl font-semibold text-zinc-950">
              Presença da liderança
            </h2>
            <dl className="mt-4 grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-zinc-200 p-5">
                <dt className="font-semibold text-zinc-950">Líder</dt>
                <dd className="mt-2 text-zinc-700">
                  {detail.leaderName} — {detail.leaderWasPresent ? "Presente" : "Ausente"}
                </dd>
              </div>
              <div className="rounded-2xl border border-zinc-200 p-5">
                <dt className="font-semibold text-zinc-950">Vice-líderes presentes</dt>
                <dd className="mt-2 text-zinc-700">
                  {detail.noViceLeaderWasPresent || detail.presentViceLeaderNames.length === 0
                    ? "Nenhum"
                    : detail.presentViceLeaderNames.join(", ")}
                </dd>
              </div>
            </dl>
          </section>

          <section aria-labelledby="members-heading" className="border-t border-zinc-200 pt-8">
            <h2 id="members-heading" className="text-xl font-semibold text-zinc-950">
              Membros
            </h2>
            {detail.members.length > 0 ? (
              <ol className="mt-4 grid gap-2 sm:grid-cols-2">
                {detail.members.map((member) => (
                  <li key={member.position} className="rounded-xl bg-zinc-100 px-4 py-3 text-zinc-800">
                    {member.position}. {member.name}
                  </li>
                ))}
              </ol>
            ) : (
              <p className="mt-3 text-zinc-700">Membros presentes: Nenhum</p>
            )}
          </section>

          <section aria-labelledby="guests-heading" className="border-t border-zinc-200 pt-8">
            <h2 id="guests-heading" className="text-xl font-semibold text-zinc-950">
              Convidados
            </h2>
            {groupedGuests.size > 0 ? (
              <div className="mt-4 grid gap-4 lg:grid-cols-2">
                {[...groupedGuests.entries()].map(([responsibleName, guests]) => (
                  <section key={responsibleName} className="rounded-2xl border border-zinc-200 p-5">
                    <h3 className="font-semibold text-zinc-950">
                      Responsável: {responsibleName}
                    </h3>
                    <ul className="mt-3 space-y-2">
                      {guests.map((guest) => (
                        <li key={guest.position} className="text-zinc-700">
                          {guest.name}
                          {guest.isFirstTime ? (
                            <span className="ml-2 rounded-full bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-900">
                              1ª vez
                            </span>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  </section>
                ))}
              </div>
            ) : (
              <p className="mt-3 text-zinc-700">Convidados: Nenhum</p>
            )}
          </section>

          <section aria-labelledby="evangelism-heading" className="border-t border-zinc-200 pt-8">
            <h2 id="evangelism-heading" className="text-xl font-semibold text-zinc-950">
              Relatório de Evangelismo
            </h2>
            <div className="mt-4 space-y-4">
              {detail.evangelismEntries.map((entry, index) => (
                <section key={entry.id} className="rounded-2xl border border-zinc-200 p-5 sm:p-6">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <h3 className="font-semibold text-zinc-950">
                      {entry.didEvangelize
                        ? `Evangelismo ${index + 1}`
                        : entry.registeredByName}
                    </h3>
                    <span className={`text-sm font-semibold ${entry.didEvangelize ? "text-emerald-800" : "text-zinc-700"}`}>
                      {entry.didEvangelize ? "Evangelizou" : "Não evangelizou"}
                    </span>
                  </div>

                  {entry.didEvangelize ? (
                    <dl className="mt-4 grid gap-4 sm:grid-cols-2">
                      <div>
                        <dt className="text-sm font-semibold text-zinc-600">Liderança</dt>
                        <dd className="mt-1 text-zinc-800">
                          {entry.leadershipNames.join(", ") || entry.registeredByName}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-sm font-semibold text-zinc-600">Quem registrou</dt>
                        <dd className="mt-1 text-zinc-800">{entry.registeredByName}</dd>
                      </div>
                      <div>
                        <dt className="text-sm font-semibold text-zinc-600">Data</dt>
                        <dd className="mt-1 text-zinc-800">
                          {entry.evangelismOn ? formatDate(entry.evangelismOn) : "Não informada"}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-sm font-semibold text-zinc-600">Tempo</dt>
                        <dd className="mt-1 text-zinc-800">{entry.durationText ?? "Não informado"}</dd>
                      </div>
                      <div className="sm:col-span-2">
                        <dt className="text-sm font-semibold text-zinc-600">Integrantes</dt>
                        <dd className="mt-1 text-zinc-800">
                          {entry.participantNames.length > 0 ? entry.participantNames.join(", ") : "Nenhum"}
                        </dd>
                      </div>
                    </dl>
                  ) : null}

                  <div className="mt-4 rounded-xl bg-zinc-100 p-4">
                    <p className="text-sm font-semibold text-zinc-600">Comentários</p>
                    <p className="mt-1 whitespace-pre-wrap text-zinc-800">{entry.comments}</p>
                  </div>
                </section>
              ))}
            </div>
          </section>

          <footer className="border-t border-zinc-200 pt-8">
            <p className="text-sm leading-6 text-zinc-600">
              Enviada por {detail.submittedByName} em {formatDateTime(detail.submittedAt)}.
            </p>
            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
              {canCorrect ? (
                <Link
                  href={`/portal/relatorios/${detail.id}/corrigir`}
                  className="flex min-h-12 w-full items-center justify-center rounded-xl bg-zinc-950 px-5 font-semibold text-white hover:bg-zinc-800 sm:w-auto sm:min-w-52"
                >
                  Corrigir Ficha
                </Link>
              ) : null}
              <a
                href={`/portal/relatorios/${detail.id}/pdf`}
                className="flex min-h-12 w-full items-center justify-center rounded-xl border border-zinc-300 bg-white px-5 font-semibold text-zinc-900 hover:bg-zinc-100 sm:w-auto sm:min-w-52"
              >
                Baixar PDF
              </a>
              <Link
                href="/portal/relatorios"
                className="flex min-h-12 w-full items-center justify-center rounded-xl border border-zinc-300 bg-white px-5 font-semibold text-zinc-900 hover:bg-zinc-100 sm:w-auto sm:min-w-52"
              >
                Voltar ao histórico
              </Link>
            </div>
          </footer>
        </div>
      </article>
    </main>
  );
}
