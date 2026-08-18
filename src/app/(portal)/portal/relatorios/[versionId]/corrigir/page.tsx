import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Alert } from "@/components/ui/alert";
import { buttonClassName } from "@/components/ui/button";
import { PageContainer } from "@/components/ui/page-container";
import { PageHeader } from "@/components/ui/page-header";
import { Surface } from "@/components/ui/surface";
import { getCurrentUser } from "@/lib/auth/current-user";
import type { CellReportInitialData } from "@/lib/cell-report-form";
import { getCellReportCorrectionDraftKey } from "@/lib/cell-report-draft";
import { getCellReportVersionDetail } from "@/lib/data/cell-report-detail";
import { getCellReportFormContext } from "@/lib/data/cell-reports";
import { ReportForm } from "../../novo/report-form";
import { ReportThemeIntroduction } from "../../novo/components/report-theme-introduction";

export const metadata: Metadata = {
  title: "Corrigir Ficha de Organização | ICB Conecta",
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
    <main>
      <PageContainer className="py-6 sm:py-8 lg:py-10">
        <PageHeader
          title="Corrigir ficha"
          description={detail.cellName}
        />

        <ReportThemeIntroduction />

        <Alert tone="warning" className="mt-5">
          Corrigindo a versão {detail.versionNumber}. O envio cria uma nova
          versão e preserva a anterior.
        </Alert>

        <Surface className="mt-5 p-4 sm:p-7 lg:p-8">
          <ReportForm
            cellId={detail.cellId}
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
        </Surface>

        <Link
          href={`/portal/relatorios/${detail.id}`}
          className={buttonClassName({
            variant: "ghost",
            className: "mt-4 w-full sm:w-auto",
          })}
        >
          Cancelar correção
        </Link>
      </PageContainer>
    </main>
  );
}
