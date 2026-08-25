"use server";

import { revalidatePath } from "next/cache";
import {
  canAccessPastoralDashboard,
  getCurrentUser,
} from "@/lib/auth/current-user";
import { createClient } from "@/lib/supabase/server";

export type UpdateCellInaugurationState = {
  message: string;
  success?: boolean;
};

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const datePattern = /^\d{4}-\d{2}-\d{2}$/;

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

export async function updateOwnCellInauguration(
  _previousState: UpdateCellInaugurationState,
  formData: FormData,
): Promise<UpdateCellInaugurationState> {
  const user = await getCurrentUser();
  const cellId = readString(formData, "cellId");
  const startedOn = readString(formData, "startedOn");

  if (
    !user?.isActive ||
    (!canAccessPastoralDashboard(user) &&
      (user.currentCellId !== cellId ||
        user.currentLeadershipRole !== "leader"))
  ) {
    return {
      message:
        "Somente o líder atual, supervisor, pastor ou administrador pode alterar essa data.",
    };
  }

  if (!uuidPattern.test(cellId) || (startedOn !== "" && !isValidDate(startedOn))) {
    return { message: "Informe uma data de inauguração válida." };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("update_own_cell_started_on", {
    target_cell_id: cellId,
    target_started_on: startedOn || null,
  });

  if (error) {
    const messages: Record<string, string> = {
      CELL_INAUGURATION_DATE_FORBIDDEN:
        "Somente o líder atual, supervisor, pastor ou administrador pode alterar essa data.",
      CELL_INAUGURATION_DATE_INVALID:
        "A data de inauguração não pode estar no futuro.",
    };

    return {
      message:
        messages[error.message] ??
        "Não foi possível atualizar a data de inauguração. Tente novamente.",
    };
  }

  revalidatePath(`/portal/celulas/${cellId}`);
  revalidatePath("/portal/organizacao");
  revalidatePath("/portal");

  return { message: "Data de inauguração atualizada.", success: true };
}
