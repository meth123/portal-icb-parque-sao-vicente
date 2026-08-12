import type { CellReportInitialData } from "@/lib/cell-report-form";
import type {
  EvangelismRecordDraft,
  GuestGroup,
  ManualName,
  NotEvangelizedDraft,
} from "./types";

export type ReportFormInitialSeed = {
  meetingOn: string;
  meetingFormat: "in_person" | "online";
  leaderWasPresent: "yes" | "no";
  selectedViceIds: string[];
  noViceWasPresent: boolean;
  members: ManualName[];
  guestGroups: GuestGroup[];
  evangelismRecords: EvangelismRecordDraft[];
  notEvangelized: NotEvangelizedDraft;
  maxKey: number;
};

export function getEvangelismRecordError(draft: EvangelismRecordDraft) {
  if (draft.leadershipIds.length < 1) {
    return "Selecione ao menos uma pessoa da liderança.";
  }

  if (!draft.leadershipIds.includes(draft.primaryLeadershipId)) {
    return "A liderança principal precisa permanecer neste registro.";
  }

  if (!draft.evangelismOn) {
    return "Informe a Data do Evangelismo.";
  }

  if (!draft.durationText.trim()) {
    return "Informe o Tempo de Evangelismo.";
  }

  if (!draft.comments.trim()) {
    return "Preencha os Comentários.";
  }

  if (
    draft.participants.some(
      (participant) =>
        participant.name.trim().length < 1 ||
        participant.name.trim().length > 200,
    )
  ) {
    return "Preencha o nome de cada integrante adicionado.";
  }

  return "";
}

export function createInitialSeed(
  initialData: CellReportInitialData | undefined,
  defaultDate: string,
  hasViceLeaders: boolean,
): ReportFormInitialSeed {
  let key = 0;
  const nextKey = () => {
    key += 1;
    return key;
  };

  return {
    meetingOn: initialData?.meetingOn ?? defaultDate,
    meetingFormat: initialData?.meetingFormat ?? "in_person",
    leaderWasPresent: initialData?.leaderWasPresent ?? "yes",
    selectedViceIds: initialData?.selectedViceIds ?? [],
    noViceWasPresent:
      initialData?.noViceWasPresent ?? !hasViceLeaders,
    members:
      initialData?.members.map((member) => ({
        key: nextKey(),
        name: member.name,
      })) ?? [],
    guestGroups:
      initialData?.guestGroups.map((group) => ({
        key: nextKey(),
        responsibleName: group.responsibleName,
        guests: group.guests.map((guest) => ({
          key: nextKey(),
          name: guest.name,
          isFirstTime: guest.isFirstTime,
        })),
      })) ?? [],
    evangelismRecords:
      initialData?.evangelismRecords.map((record) => ({
        key: nextKey(),
        primaryLeadershipId: record.primaryLeadershipId,
        leadershipIds: [...record.leadershipIds],
        evangelismOn: record.evangelismOn,
        durationText: record.durationText,
        comments: record.comments,
        participants: record.participants.map((participant) => ({
          key: nextKey(),
          name: participant.name,
        })),
      })) ?? [],
    notEvangelized: { ...(initialData?.notEvangelized ?? {}) },
    maxKey: key,
  };
}
