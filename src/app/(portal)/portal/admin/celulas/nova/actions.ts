"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  canManageCellAdministration,
  getCurrentUser,
} from "@/lib/auth/current-user";
import { createClient } from "@/lib/supabase/server";

export type CreateCellState = {
  message: string;
};

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;

function readString(formData: FormData, field: string) {
  const value = formData.get(field);
  return typeof value === "string" ? value.trim() : "";
}

export async function createCell(
  _previousState: CreateCellState,
  formData: FormData,
): Promise<CreateCellState> {
  const user = await getCurrentUser();

  if (!user || !canManageCellAdministration(user)) {
    return { message: "Sua conta não possui permissão para cadastrar células." };
  }

  const name = readString(formData, "name");
  const cellTypeId = readString(formData, "cellTypeId");
  const neighborhoodId = readString(formData, "neighborhoodId");
  const leaderProfileId = readString(formData, "leaderProfileId");
  const startedOn = readString(formData, "startedOn");
  const meetingTime = readString(formData, "meetingTime");
  const weekdayValue = readString(formData, "weekday");
  const weekday = Number(weekdayValue);
  const viceProfileIds = [
    ...new Set(
      formData
        .getAll("viceProfileIds")
        .filter((value): value is string => typeof value === "string")
        .filter((value) => uuidPattern.test(value)),
    ),
  ];

  if (name.length < 2 || name.length > 120) {
    return { message: "Informe um nome entre 2 e 120 caracteres." };
  }

  if (
    !uuidPattern.test(cellTypeId) ||
    !uuidPattern.test(neighborhoodId) ||
    !uuidPattern.test(leaderProfileId)
  ) {
    return { message: "Selecione Rede/tipo, localidade e líder válidos." };
  }

  const parsedStartedOn = new Date(`${startedOn}T00:00:00Z`);

  if (
    !datePattern.test(startedOn) ||
    Number.isNaN(parsedStartedOn.getTime()) ||
    parsedStartedOn.toISOString().slice(0, 10) !== startedOn
  ) {
    return { message: "Informe uma data de início válida." };
  }

  if (!Number.isInteger(weekday) || ![4, 5, 6].includes(weekday)) {
    return { message: "Selecione quinta-feira, sexta-feira ou sábado." };
  }

  if (!timePattern.test(meetingTime)) {
    return { message: "Informe um horário válido." };
  }

  if (viceProfileIds.includes(leaderProfileId)) {
    return { message: "A mesma pessoa não pode ser líder e vice-líder." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_cell_with_relationships", {
    target_name: name,
    target_cell_type_id: cellTypeId,
    target_weekday: weekday,
    target_meeting_time: meetingTime,
    target_started_on: startedOn,
    target_neighborhood_id: neighborhoodId,
    target_leader_profile_id: leaderProfileId,
    target_vice_profile_ids: viceProfileIds,
  });

  if (error) {
    if (error.message === "CURRENT_LEADERSHIP_REQUIRES_ACTIVE_USER") {
      return {
        message:
          "Líder e vice-líderes precisam possuir uma conta comum ativa.",
      };
    }

    if (error.code === "23505") {
      if (error.message.includes("cells_name_unique_ci")) {
        return { message: "Já existe uma célula com esse nome." };
      }

      if (
        error.message.includes(
          "cell_leaderships_one_current_assignment_per_profile_idx",
        )
      ) {
        return {
          message:
            "O líder ou um dos vice-líderes selecionados já possui vínculo com outra célula.",
        };
      }

      return {
        message: "Os dados informados entram em conflito com um cadastro existente.",
      };
    }

    const expectedMessages = [
      "A conta não possui permissão",
      "Informe",
      "A Rede ou o tipo",
      "A cidade ou o bairro",
      "O líder selecionado",
      "A mesma pessoa",
      "Um ou mais vice-líderes",
    ];
    const safeMessage = expectedMessages.some((message) =>
      error.message.startsWith(message),
    )
      ? error.message
      : "Não foi possível cadastrar a célula. Revise os dados e tente novamente.";

    return { message: safeMessage };
  }

  if (typeof data !== "string" || !uuidPattern.test(data)) {
    return { message: "A célula foi processada, mas o identificador retornado é inválido." };
  }

  revalidatePath("/portal/organizacao");
  redirect(`/portal/celulas/${data}`);
}
