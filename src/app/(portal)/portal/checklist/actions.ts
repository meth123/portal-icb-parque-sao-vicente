"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth/current-user";
import { createClient } from "@/lib/supabase/server";

export type WeeklyChecklistState = {
  message: string;
  success: boolean;
};

function readBoolean(formData: FormData, field: string) {
  const value = formData.get(field);

  if (value === "yes") return true;
  if (value === "no") return false;
  return null;
}

export async function submitWeeklyChecklist(
  _previousState: WeeklyChecklistState,
  formData: FormData,
): Promise<WeeklyChecklistState> {
  const user = await getCurrentUser();
  const prayedInGroup = readBoolean(formData, "prayedInGroup");
  const fastedForCell = readBoolean(formData, "fastedForCell");

  if (!user?.isActive || user.globalRole !== "user") {
    return { message: "Sua conta não pode responder este checklist.", success: false };
  }

  if (prayedInGroup === null || fastedForCell === null) {
    return { message: "Responda Oração em Grupo e Jejum pela Célula.", success: false };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("submit_weekly_leadership_checkin", {
    target_prayed_in_group: prayedInGroup,
    target_fasted_for_cell: fastedForCell,
  });

  if (error) {
    const messages: Record<string, string> = {
      WEEKLY_CHECKIN_FORBIDDEN: "Sua conta não pode responder este checklist.",
      WEEKLY_CHECKIN_INVALID: "Revise as duas respostas.",
      WEEKLY_CHECKIN_CLOSED: "O prazo deste checklist já foi encerrado.",
      WEEKLY_CHECKIN_LEADERSHIP_NOT_FOUND:
        "Não foi encontrado um vínculo de liderança para esta semana.",
    };

    return {
      message:
        messages[error.message] ??
        "Não foi possível salvar o checklist. Tente novamente.",
      success: false,
    };
  }

  revalidatePath("/portal/checklist");
  revalidatePath("/portal");

  return { message: "Checklist atualizado.", success: true };
}
