import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import type { CellReportInitialData } from "@/lib/cell-report-form";
import { getCellReportCorrectionDraftKey } from "@/lib/cell-report-draft";
import { getCellReportVersionDetail } from "@/lib/data/cell-report-detail";
import { getCellReportFormContext } from "@/lib/data/cell-reports";
import { ReportForm } from "../../novo/report-form";

export const metadata: Metadata = {
  title: "Corrigir Ficha de Organização | Portal ICB Parque São Vicente",
  robots: {
    index: false,
    follow: false,
  },
};

type CorrectCellReportPageProps = {
  params: Promise<{ versionId: string }>;
};

export default async function CorrectCellReportPage({
  params,
}: CorrectCellReportPageProps) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login?erro=perfil");
  }

  if (!user.isActive) {
    redirect("/portal");
  }

  const { versionId } = await params;
  const [detail, currentReportContext] = await Promise.all([
    getCellReportVersionDetail(versionId),
    getCellReportFormContext(),
  ]);

  if (!detail) {
    notFound();
  }

  if (
    !detail.isCurrent ||
    !currentReportContext ||
    currentReportContext.cellId !== detail.cellId
  ) {
    redirect(`/portal/relatorios/${detail.id}`);
  }

  const leader = detail.leadership.find(
    (person) => person.leadershipId === detail.leaderLeadershipId,
  );

  if (!leader || leader.role !== "leader") {
    notFound();
  }

  const viceLeaders = detail.leadership.filter(
    (person) => person.role === "vice_leader",
  );
  const guestGroupsByResponsible = new Map<
    string,
    CellReportInitialData["guestGroups"][number]
  >();

  for (const guest of detail.guests) {
    const existingGroup = guestGroupsByResponsible.get(guest.responsibleName);

    if (existingGroup) {
      existingGroup.guests.push({
        name: guest.name,
        isFirstTime: guest.isFirstTime,
      });
    } else {
      guestGroupsByResponsible.set(guest.responsibleName, {
        responsibleName: guest.responsibleName,
        guests: [
          {
            name: guest.name,
            isFirstTime: guest.isFirstTime,
          },
        ],
      });
    }
  }

  const initialData: CellReportInitialData = {
    meetingOn: detail.meetingOn,
    meetingFormat: detail.meetingFormat,
    leaderWasPresent: detail.leaderWasPresent ? "yes" : "no",
    selectedViceIds: detail.presentViceLeadershipIds,
    noViceWasPresent: detail.noViceLeaderWasPresent,
    members: detail.members.map((member) => ({ name: member.name })),
    guestGroups: [...guestGroupsByResponsible.values()],
    evangelismRecords: detail.evangelismEntries
      .filter((entry) => entry.didEvangelize)
      .map((entry) => ({
        primaryLeadershipId: entry.registeredByLeadershipId,
        leadershipIds: entry.leadershipIds,
        evangelismOn: entry.evangelismOn ?? "",
        durationText: entry.durationText ?? "",
        comments: entry.comments,
        participants: entry.participantNames.map((name) => ({ name })),
      })),
    notEvangelized: Object.fromEntries(
      detail.evangelismEntries
        .filter((entry) => !entry.didEvangelize)
        .map((entry) => [entry.registeredByLeadershipId, entry.comments]),
    ),
  };

  return (
    <main className="min-h-screen bg-zinc-100 px-4 py-10 sm:px-6">
      <section className="mx-auto w-full max-w-4xl rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-10">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-zinc-600">
          Fase 5 · Correção
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-zinc-950 sm:text-4xl">
          Corrigir Ficha de Organização
        </h1>
        <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-950">
          <p className="font-semibold">
            Você está corrigindo a versão {detail.versionNumber} de {detail.cellName}.
          </p>
          <p className="mt-1 leading-7">
            O novo envio criará outra versão. Esta versão continuará preservada
            no histórico e não será editada diretamente.
          </p>
        </div>

        <ReportForm
          cellId={detail.cellId}
          cellName={detail.cellName}
          defaultDate={detail.meetingOn}
          draftKey={getCellReportCorrectionDraftKey(
            user.id,
            detail.cellId,
            detail.id,
          )}
          leader={leader}
          viceLeaders={viceLeaders}
          leadership={detail.leadership}
          initialData={initialData}
          correctionSourceVersionId={detail.id}
        />

        <Link
          href={`/portal/relatorios/${detail.id}`}
          className="mt-6 flex min-h-12 w-full items-center justify-center rounded-xl border border-zinc-300 bg-white px-5 font-semibold text-zinc-900 hover:bg-zinc-100 sm:w-auto sm:min-w-52"
        >
          Cancelar correção
        </Link>
      </section>
    </main>
  );
}
