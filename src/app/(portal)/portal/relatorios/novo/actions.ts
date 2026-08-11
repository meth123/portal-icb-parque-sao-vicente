"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import { createClient } from "@/lib/supabase/server";

export type SubmitCellReportState = {
  message: string;
};

type ManualNameEntry = {
  name: string;
};

type GuestEntry = {
  name: string;
  responsibleName: string;
  isFirstTime: boolean;
};

type EvangelismEntry = {
  leadershipId: string;
  leadershipIds: string[];
  didEvangelize: boolean;
  evangelismOn: string;
  durationText: string;
  comments: string;
  participants: ManualNameEntry[];
};

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const datePattern = /^\d{4}-\d{2}-\d{2}$/;

function readString(formData: FormData, field: string) {
  const value = formData.get(field);
  return typeof value === "string" ? value.trim() : "";
}

function isValidDate(value: string) {
  if (!datePattern.test(value)) {
    return false;
  }

  const date = new Date(`${value}T00:00:00Z`);
  return (
    !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
  );
}

function parseArray(value: string, maxLength: number): unknown[] | null {
  if (value.length > maxLength) {
    return null;
  }

  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function normalizeManualNames(value: unknown[], limit: number) {
  if (value.length > limit) {
    return null;
  }

  const normalized: ManualNameEntry[] = [];

  for (const item of value) {
    if (!item || typeof item !== "object") {
      return null;
    }

    const name = "name" in item && typeof item.name === "string"
      ? item.name.trim()
      : "";

    if (name.length < 1 || name.length > 200) {
      return null;
    }

    normalized.push({ name });
  }

  return normalized;
}

function normalizeGuests(value: unknown[]) {
  if (value.length > 500) {
    return null;
  }

  const normalized: GuestEntry[] = [];

  for (const item of value) {
    if (!item || typeof item !== "object") {
      return null;
    }

    const name = "name" in item && typeof item.name === "string"
      ? item.name.trim()
      : "";
    const responsibleName =
      "responsibleName" in item && typeof item.responsibleName === "string"
        ? item.responsibleName.trim()
        : "";
    const isFirstTime =
      "isFirstTime" in item && typeof item.isFirstTime === "boolean"
        ? item.isFirstTime
        : null;

    if (
      name.length < 1 ||
      name.length > 200 ||
      responsibleName.length < 1 ||
      responsibleName.length > 200 ||
      isFirstTime === null
    ) {
      return null;
    }

    normalized.push({ name, responsibleName, isFirstTime });
  }

  return normalized;
}

function normalizeEvangelism(value: unknown[]) {
  if (value.length < 1 || value.length > 100) {
    return null;
  }

  const normalized: EvangelismEntry[] = [];
  const negativeLeadershipIds = new Set<string>();

  for (const item of value) {
    if (!item || typeof item !== "object") {
      return null;
    }

    const leadershipId =
      "leadershipId" in item && typeof item.leadershipId === "string"
        ? item.leadershipId
        : "";
    const didEvangelize =
      "didEvangelize" in item && typeof item.didEvangelize === "boolean"
        ? item.didEvangelize
        : null;
    const rawLeadershipIds =
      "leadershipIds" in item && Array.isArray(item.leadershipIds)
        ? item.leadershipIds
        : null;
    const evangelismOn =
      "evangelismOn" in item && typeof item.evangelismOn === "string"
        ? item.evangelismOn.trim()
        : "";
    const durationText =
      "durationText" in item && typeof item.durationText === "string"
        ? item.durationText.trim()
        : "";
    const comments =
      "comments" in item && typeof item.comments === "string"
        ? item.comments.trim()
        : "";
    const rawParticipants =
      "participants" in item && Array.isArray(item.participants)
        ? item.participants
        : null;

    if (
      !uuidPattern.test(leadershipId) ||
      didEvangelize === null ||
      comments.length < 1 ||
      comments.length > 4000 ||
      rawParticipants === null
    ) {
      return null;
    }

    const participants = normalizeManualNames(rawParticipants, 100);

    if (participants === null) {
      return null;
    }

    let leadershipIds: string[] = [];

    if (didEvangelize) {
      if (
        rawLeadershipIds === null ||
        rawLeadershipIds.length < 1 ||
        rawLeadershipIds.length > 100 ||
        rawLeadershipIds.some(
          (id) => typeof id !== "string" || !uuidPattern.test(id),
        ) ||
        !isValidDate(evangelismOn) ||
        durationText.length < 1 ||
        durationText.length > 60
      ) {
        return null;
      }

      leadershipIds = [...new Set(rawLeadershipIds as string[])];

      if (
        leadershipIds.length !== rawLeadershipIds.length ||
        !leadershipIds.includes(leadershipId)
      ) {
        return null;
      }
    }

    if (
      !didEvangelize &&
      (evangelismOn !== "" ||
        durationText !== "" ||
        participants.length > 0 ||
        (rawLeadershipIds !== null && rawLeadershipIds.length > 0) ||
        negativeLeadershipIds.has(leadershipId))
    ) {
      return null;
    }

    if (!didEvangelize) {
      negativeLeadershipIds.add(leadershipId);
    }

    normalized.push({
      leadershipId,
      leadershipIds,
      didEvangelize,
      evangelismOn: didEvangelize ? evangelismOn : "",
      durationText: didEvangelize ? durationText : "",
      comments,
      participants: didEvangelize ? participants : [],
    });
  }

  return normalized;
}

export async function submitCellReport(
  _previousState: SubmitCellReportState,
  formData: FormData,
): Promise<SubmitCellReportState> {
  const user = await getCurrentUser();

  if (!user?.isActive) {
    return { message: "Sua sessão não permite enviar Fichas." };
  }

  const cellId = readString(formData, "cellId");
  const correctionSourceVersionId = readString(
    formData,
    "correctionSourceVersionId",
  );
  const meetingOn = readString(formData, "meetingOn");
  const meetingFormat = readString(formData, "meetingFormat");
  const leaderPresence = readString(formData, "leaderWasPresent");
  const noVicePresence = readString(formData, "noViceWasPresent");
  const rawViceLeadershipIds = parseArray(
    readString(formData, "viceLeadershipIdsJson"),
    10000,
  );
  const rawMembers = parseArray(readString(formData, "membersJson"), 150000);
  const rawGuests = parseArray(readString(formData, "guestsJson"), 300000);
  const rawEvangelism = parseArray(
    readString(formData, "evangelismJson"),
    1000000,
  );

  if (!uuidPattern.test(cellId)) {
    return { message: "A célula informada é inválida." };
  }

  if (
    correctionSourceVersionId &&
    !uuidPattern.test(correctionSourceVersionId)
  ) {
    return { message: "A origem da correção é inválida." };
  }

  if (!isValidDate(meetingOn)) {
    return { message: "Informe uma Data da Célula válida." };
  }

  if (!["in_person", "online"].includes(meetingFormat)) {
    return { message: "Selecione Presencial ou Online." };
  }

  if (!["yes", "no"].includes(leaderPresence)) {
    return { message: "Informe se o Líder esteve presente." };
  }

  if (!["yes", "no"].includes(noVicePresence)) {
    return {
      message: "Informe quais Vices estiveram presentes ou marque Nenhum.",
    };
  }

  if (
    rawViceLeadershipIds === null ||
    rawViceLeadershipIds.some(
      (value) => typeof value !== "string" || !uuidPattern.test(value),
    )
  ) {
    return { message: "A seleção de Vice-líderes é inválida." };
  }

  const viceLeadershipIds = [...new Set(rawViceLeadershipIds as string[])];

  if (viceLeadershipIds.length !== rawViceLeadershipIds.length) {
    return { message: "A seleção de Vice-líderes contém itens repetidos." };
  }

  if (
    (noVicePresence === "yes" && viceLeadershipIds.length > 0) ||
    (noVicePresence === "no" && viceLeadershipIds.length === 0)
  ) {
    return {
      message: "Selecione os Vices presentes ou confirme que nenhum esteve.",
    };
  }

  if (rawMembers === null || rawGuests === null || rawEvangelism === null) {
    return { message: "Os dados enviados estão incompletos ou inválidos." };
  }

  const members = normalizeManualNames(rawMembers, 500);
  const guests = normalizeGuests(rawGuests);
  const evangelismEntries = normalizeEvangelism(rawEvangelism);

  if (members === null) {
    return { message: "Revise os nomes dos membros adicionados." };
  }

  if (guests === null) {
    return { message: "Revise os convidados e seus responsáveis." };
  }

  if (evangelismEntries === null) {
    return { message: "Preencha o evangelismo de toda a liderança." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("submit_cell_report", {
    target_cell_id: cellId,
    target_meeting_on: meetingOn,
    target_meeting_format: meetingFormat,
    target_leader_was_present: leaderPresence === "yes",
    target_no_vice_leader_was_present: noVicePresence === "yes",
    target_vice_leadership_ids: viceLeadershipIds,
    target_members: members,
    target_guests: guests,
    target_evangelism_entries: evangelismEntries,
  });

  if (error) {
    const safeMessagePrefixes = [
      "Somente Líder ou Vice ativo",
      "A célula selecionada",
      "A célula deve possuir",
      "Informe",
      "Selecione",
      "Não selecione",
      "Um ou mais Vices",
      "A lista",
      "Preencha",
      "Os registros de evangelismo",
      "Cada pessoa da liderança",
      "O evangelismo contém",
      "A liderança principal",
      "Um participante vinculado",
      "Uma pessoa da liderança",
      "Existe mais de um status",
      "Quem participou",
      "Toda a liderança",
      "O status Não evangelizou",
      "Não informe",
    ];
    const safeMessage = safeMessagePrefixes.some((prefix) =>
      error.message.startsWith(prefix),
    )
      ? error.message
      : "Não foi possível enviar a Ficha. Revise os dados e tente novamente.";

    return { message: safeMessage };
  }

  if (typeof data !== "string" || !uuidPattern.test(data)) {
    return { message: "A Ficha foi processada, mas o retorno é inválido." };
  }

  revalidatePath("/portal");
  revalidatePath("/portal/relatorios");
  revalidatePath(`/portal/relatorios/${data}`);
  const correctionQuery = correctionSourceVersionId
    ? `&correcao=${encodeURIComponent(correctionSourceVersionId)}`
    : "";
  redirect(`/portal/relatorios/${data}?status=enviada${correctionQuery}`);
}
