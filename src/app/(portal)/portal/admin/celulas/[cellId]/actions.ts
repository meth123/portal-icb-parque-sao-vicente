"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  canManageCellAdministration,
  getCurrentUser,
} from "@/lib/auth/current-user";
import { createClient } from "@/lib/supabase/server";

export type UpdateCellState = { message: string };
export type UpdateCellHistoryDatesState = { message: string; success?: boolean };
export type DeactivateCellState = { message: string };
export type ReactivateCellState = { message: string };

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;

function readString(formData: FormData, field: string) {
  const value = formData.get(field);
  return typeof value === "string" ? value.trim() : "";
}

function isValidDate(value: string) {
  if (!datePattern.test(value)) return false;
  const parsedDate = new Date(`${value}T00:00:00Z`);
  return (
    !Number.isNaN(parsedDate.getTime()) &&
    parsedDate.toISOString().slice(0, 10) === value
  );
}

export async function updateCellHistoryDates(
  _previousState: UpdateCellHistoryDatesState,
  formData: FormData,
): Promise<UpdateCellHistoryDatesState> {
  const user = await getCurrentUser();

  if (!user || !canManageCellAdministration(user)) {
    return { message: "Sua conta não possui permissão para editar células." };
  }

  const cellId = readString(formData, "cellId");
  const startedOn = readString(formData, "startedOn");
  const reportingStartsOn = readString(formData, "reportingStartsOn");

  if (
    !uuidPattern.test(cellId) ||
    !isValidDate(startedOn) ||
    !isValidDate(reportingStartsOn)
  ) {
    return { message: "Revise as datas informadas." };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("update_cell_history_dates", {
    target_cell_id: cellId,
    target_started_on: startedOn,
    target_reporting_starts_on: reportingStartsOn,
  });

  if (error) {
    const messages: Record<string, string> = {
      CELL_MANAGEMENT_FORBIDDEN:
        "Sua conta não possui permissão para editar células.",
      CELL_HISTORY_DATES_INVALID:
        "O início da célula não pode estar no futuro. O acompanhamento deve começar entre o início da célula e até 31 dias após hoje.",
      CELL_FOUNDATION_AFTER_EXISTING_HISTORY:
        "O início da célula não pode ser posterior a um histórico já registrado.",
      CELL_NOT_FOUND: "A célula não foi encontrada.",
    };

    return {
      message:
        messages[error.message] ??
        "Não foi possível atualizar as datas da célula.",
    };
  }

  revalidatePath("/portal/admin/celulas");
  revalidatePath(`/portal/admin/celulas/${cellId}`);
  revalidatePath(`/portal/celulas/${cellId}`);
  revalidatePath("/portal/supervisao");

  return { message: "Datas atualizadas.", success: true };
}

export async function updateCellLeadership(
  _previousState: UpdateCellState,
  formData: FormData,
): Promise<UpdateCellState> {
  const user = await getCurrentUser();

  if (!user || !canManageCellAdministration(user)) {
    return { message: "Sua conta não possui permissão para editar células." };
  }

  const cellId = readString(formData, "cellId");
  const name = readString(formData, "name");
  const effectiveOn = readString(formData, "effectiveOn");
  const cellTypeId = readString(formData, "cellTypeId");
  const neighborhoodId = readString(formData, "neighborhoodId");
  const meetingTime = readString(formData, "meetingTime");
  const weekday = Number(readString(formData, "weekday"));
  const leaderProfileId = readString(formData, "leaderProfileId");
  const viceProfileIds = [
    ...new Set(
      formData
        .getAll("viceProfileIds")
        .filter((value): value is string => typeof value === "string")
        .filter((value) => uuidPattern.test(value)),
    ),
  ];

  if (
    !uuidPattern.test(cellId) ||
    !uuidPattern.test(cellTypeId) ||
    !uuidPattern.test(neighborhoodId) ||
    !uuidPattern.test(leaderProfileId)
  ) {
    return {
      message: "Selecione célula, Rede/tipo, localidade e Líder válidos.",
    };
  }

  if (name.length < 2 || name.length > 120) {
    return { message: "Informe um nome entre 2 e 120 caracteres." };
  }

  const parsedDate = new Date(`${effectiveOn}T00:00:00Z`);
  if (
    !datePattern.test(effectiveOn) ||
    Number.isNaN(parsedDate.getTime()) ||
    parsedDate.toISOString().slice(0, 10) !== effectiveOn
  ) {
    return { message: "Informe uma data válida para a alteração." };
  }

  if (viceProfileIds.includes(leaderProfileId)) {
    return { message: "A mesma pessoa não pode ser Líder e Vice-líder." };
  }

  if (!Number.isInteger(weekday) || ![4, 5, 6].includes(weekday)) {
    return { message: "Selecione quinta-feira, sexta-feira ou sábado." };
  }

  if (!timePattern.test(meetingTime)) {
    return { message: "Informe um horário válido." };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("update_cell_configuration", {
    target_cell_id: cellId,
    target_name: name,
    target_effective_on: effectiveOn,
    target_cell_type_id: cellTypeId,
    target_weekday: weekday,
    target_meeting_time: meetingTime,
    target_neighborhood_id: neighborhoodId,
    target_leader_profile_id: leaderProfileId,
    target_vice_profile_ids: viceProfileIds,
  });

  if (error) {
    const messages: Record<string, string> = {
      CELL_MANAGEMENT_FORBIDDEN:
        "Sua conta não possui permissão para editar células.",
      CELL_MANAGEMENT_INVALID: "Revise os dados informados.",
      CELL_NAME_INVALID: "Informe um nome entre 2 e 120 caracteres.",
      CELL_TYPE_INVALID: "Selecione uma Rede e um tipo ativos.",
      CELL_LOCATION_INVALID: "Selecione uma localidade ativa.",
      CELL_SCHEDULE_INVALID:
        "Selecione quinta-feira, sexta-feira ou sábado e um horário válido.",
      CELL_VICE_INVALID: "Selecione Vice-líderes válidos.",
      CELL_LEADER_IS_VICE:
        "A mesma pessoa não pode ser Líder e Vice-líder.",
      CELL_NOT_ACTIVE: "A célula não existe ou não está ativa.",
      CELL_EFFECTIVE_DATE_INVALID:
        "A data deve estar entre o início da célula e hoje.",
      CELL_LEADERSHIP_REQUIRES_ACTIVE_USER:
        "Líder e Vices precisam possuir uma conta comum ativa.",
      CELL_PROFILE_ASSIGNED_ELSEWHERE:
        "Uma das pessoas selecionadas ainda possui vínculo com outra célula.",
      CELL_CURRENT_LEADER_MISSING:
        "A célula não possui o Líder atual esperado.",
      CELL_CURRENT_CLASSIFICATION_MISSING:
        "A célula não possui classificação vigente.",
      CELL_CURRENT_SCHEDULE_MISSING:
        "A célula não possui dia e horário vigentes.",
      CELL_CURRENT_LOCATION_MISSING:
        "A célula não possui localidade vigente.",
      CELL_NO_CHANGES: "Nenhuma alteração foi realizada.",
      CELL_EFFECTIVE_DATE_TOO_EARLY:
        "A data precisa ser posterior ao início dos registros que serão substituídos.",
      CURRENT_LEADERSHIP_REQUIRES_ACTIVE_USER:
        "Líder e Vices precisam possuir uma conta comum ativa.",
    };

    if (error.code === "23505") {
      if (error.message.includes("cells_name_unique_ci")) {
        return { message: "Já existe uma célula com esse nome." };
      }

      return {
        message:
          "Uma das pessoas selecionadas ainda possui vínculo com outra célula.",
      };
    }

    return {
      message:
        messages[error.message] ??
        "Não foi possível atualizar a célula. Revise os dados e tente novamente.",
    };
  }

  revalidatePath("/portal/admin/celulas");
  revalidatePath(`/portal/celulas/${cellId}`);
  revalidatePath("/portal/organizacao");
  revalidatePath("/portal/admin");
  revalidatePath("/portal");
  redirect("/portal/admin/celulas?status=atualizada");
}

export async function deactivateCell(
  _previousState: DeactivateCellState,
  formData: FormData,
): Promise<DeactivateCellState> {
  const user = await getCurrentUser();

  if (!user || !canManageCellAdministration(user)) {
    return { message: "Sua conta não possui permissão para desativar células." };
  }

  const cellId = readString(formData, "cellId");
  const endedOn = readString(formData, "endedOn");
  const parsedDate = new Date(`${endedOn}T00:00:00Z`);

  if (!uuidPattern.test(cellId)) {
    return { message: "Selecione uma célula válida." };
  }

  if (
    !datePattern.test(endedOn) ||
    Number.isNaN(parsedDate.getTime()) ||
    parsedDate.toISOString().slice(0, 10) !== endedOn
  ) {
    return { message: "Informe uma data de encerramento válida." };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("deactivate_cell", {
    target_cell_id: cellId,
    target_ended_on: endedOn,
  });

  if (error) {
    const messages: Record<string, string> = {
      CELL_MANAGEMENT_FORBIDDEN:
        "Sua conta não possui permissão para desativar células.",
      CELL_DEACTIVATION_INVALID: "Revise os dados informados.",
      CELL_NOT_ACTIVE: "A célula não existe ou já está desativada.",
      CELL_END_DATE_INVALID:
        "A data deve estar entre o início da célula e hoje.",
      CELL_END_DATE_TOO_EARLY:
        "A data não pode ser anterior ao início dos registros vigentes.",
    };

    return {
      message:
        messages[error.message] ??
        "Não foi possível desativar a célula. Tente novamente.",
    };
  }

  revalidatePath("/portal/admin/celulas");
  revalidatePath(`/portal/celulas/${cellId}`);
  revalidatePath("/portal/organizacao");
  revalidatePath("/portal/admin");
  revalidatePath("/portal");
  redirect("/portal/admin/celulas?status=desativada");
}

export async function reactivateCell(
  _previousState: ReactivateCellState,
  formData: FormData,
): Promise<ReactivateCellState> {
  const user = await getCurrentUser();

  if (!user || !canManageCellAdministration(user)) {
    return { message: "Sua conta não possui permissão para reativar células." };
  }

  const cellId = readString(formData, "cellId");
  const reactivatedOn = readString(formData, "effectiveOn");
  const cellTypeId = readString(formData, "cellTypeId");
  const neighborhoodId = readString(formData, "neighborhoodId");
  const meetingTime = readString(formData, "meetingTime");
  const weekday = Number(readString(formData, "weekday"));
  const leaderProfileId = readString(formData, "leaderProfileId");
  const viceProfileIds = [
    ...new Set(
      formData
        .getAll("viceProfileIds")
        .filter((value): value is string => typeof value === "string")
        .filter((value) => uuidPattern.test(value)),
    ),
  ];

  const parsedDate = new Date(`${reactivatedOn}T00:00:00Z`);
  if (
    !uuidPattern.test(cellId) ||
    !uuidPattern.test(cellTypeId) ||
    !uuidPattern.test(neighborhoodId) ||
    !uuidPattern.test(leaderProfileId) ||
    !datePattern.test(reactivatedOn) ||
    Number.isNaN(parsedDate.getTime()) ||
    parsedDate.toISOString().slice(0, 10) !== reactivatedOn ||
    !Number.isInteger(weekday) ||
    ![4, 5, 6].includes(weekday) ||
    !timePattern.test(meetingTime)
  ) {
    return { message: "Revise os dados da reativação." };
  }

  if (viceProfileIds.includes(leaderProfileId)) {
    return { message: "A mesma pessoa não pode ser Líder e Vice-líder." };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("reactivate_cell", {
    target_cell_id: cellId,
    target_reactivated_on: reactivatedOn,
    target_cell_type_id: cellTypeId,
    target_weekday: weekday,
    target_meeting_time: meetingTime,
    target_neighborhood_id: neighborhoodId,
    target_leader_profile_id: leaderProfileId,
    target_vice_profile_ids: viceProfileIds,
  });

  if (error) {
    const messages: Record<string, string> = {
      CELL_MANAGEMENT_FORBIDDEN:
        "Sua conta não possui permissão para reativar células.",
      CELL_REACTIVATION_INVALID: "Revise os dados da reativação.",
      CELL_NOT_INACTIVE: "A célula não existe ou já está ativa.",
      CELL_REACTIVATION_DATE_INVALID:
        "A reativação deve ser posterior ao encerramento e não pode estar no futuro.",
      CELL_TYPE_INVALID: "Selecione uma Rede e um tipo ativos.",
      CELL_LOCATION_INVALID: "Selecione uma localidade ativa.",
      CELL_SCHEDULE_INVALID:
        "Selecione quinta-feira, sexta-feira ou sábado e um horário válido.",
      CELL_VICE_INVALID: "Selecione Vice-líderes válidos.",
      CELL_LEADER_IS_VICE:
        "A mesma pessoa não pode ser Líder e Vice-líder.",
      CELL_LEADERSHIP_REQUIRES_ACTIVE_USER:
        "Líder e Vices precisam possuir uma conta comum ativa.",
      CELL_PROFILE_ASSIGNED_ELSEWHERE:
        "Uma das pessoas selecionadas ainda possui vínculo com outra célula.",
    };

    if (error.code === "23505") {
      return {
        message:
          "A data escolhida já possui um registro ou uma das pessoas ainda está vinculada a outra célula.",
      };
    }

    return {
      message:
        messages[error.message] ??
        "Não foi possível reativar a célula. Revise os dados e tente novamente.",
    };
  }

  revalidatePath("/portal/admin/celulas");
  revalidatePath(`/portal/celulas/${cellId}`);
  revalidatePath("/portal/organizacao");
  revalidatePath("/portal/admin");
  revalidatePath("/portal");
  redirect("/portal/admin/celulas?status=reativada");
}
