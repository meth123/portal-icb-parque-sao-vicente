"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  canManageCellAdministration,
  getCurrentUser,
} from "@/lib/auth/current-user";
import { createClient } from "@/lib/supabase/server";

export type UpdateCellState = { message: string };

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const datePattern = /^\d{4}-\d{2}-\d{2}$/;

function readString(formData: FormData, field: string) {
  const value = formData.get(field);
  return typeof value === "string" ? value.trim() : "";
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
  const leaderProfileId = readString(formData, "leaderProfileId");
  const viceProfileIds = [
    ...new Set(
      formData
        .getAll("viceProfileIds")
        .filter((value): value is string => typeof value === "string")
        .filter((value) => uuidPattern.test(value)),
    ),
  ];

  if (!uuidPattern.test(cellId) || !uuidPattern.test(leaderProfileId)) {
    return { message: "Selecione uma célula e um Líder válidos." };
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

  const supabase = await createClient();
  const { error } = await supabase.rpc("update_cell_leadership", {
    target_cell_id: cellId,
    target_name: name,
    target_effective_on: effectiveOn,
    target_leader_profile_id: leaderProfileId,
    target_vice_profile_ids: viceProfileIds,
  });

  if (error) {
    const messages: Record<string, string> = {
      CELL_MANAGEMENT_FORBIDDEN:
        "Sua conta não possui permissão para editar células.",
      CELL_MANAGEMENT_INVALID: "Revise os dados informados.",
      CELL_NAME_INVALID: "Informe um nome entre 2 e 120 caracteres.",
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
      CELL_NO_CHANGES: "Nenhuma alteração foi realizada.",
      CELL_EFFECTIVE_DATE_TOO_EARLY:
        "A data precisa ser posterior ao início dos vínculos que serão encerrados.",
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
