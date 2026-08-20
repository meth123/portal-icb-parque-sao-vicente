"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth/current-user";
import { getCellReportFormContext } from "@/lib/data/cell-reports";
import { getSaoPauloMonthStart } from "@/lib/dates/sao-paulo";
import { createClient } from "@/lib/supabase/server";

export type MonthlyResponsibilityState = {
  message: string;
  success: boolean;
};

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function assignMonthlyReportResponsibility(
  cellId: string,
  _previousState: MonthlyResponsibilityState,
  formData: FormData,
): Promise<MonthlyResponsibilityState> {
  void _previousState;

  const user = await getCurrentUser();
  const context = await getCellReportFormContext();

  if (
    !uuidPattern.test(cellId) ||
    !user?.isActive ||
    !context ||
    context.cellId !== cellId ||
    !["leader", "vice_leader"].includes(context.currentUserRole)
  ) {
    return {
      message: "Somente o Líder ou Vice-líder ativo da célula pode alterar essa indicação.",
      success: false,
    };
  }

  const rawResponsibleId = formData.get("responsibleLeadershipId");
  const responsibleLeadershipId =
    typeof rawResponsibleId === "string" ? rawResponsibleId.trim() : "";

  if (
    responsibleLeadershipId &&
    (!uuidPattern.test(responsibleLeadershipId) ||
      !context.leadership.some(
        (person) => person.leadershipId === responsibleLeadershipId,
      ))
  ) {
    return {
      message: "Selecione o Líder ou um Vice-líder ativo da própria célula.",
      success: false,
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc(
    "assign_monthly_report_responsibility",
    {
      target_cell_id: cellId,
      target_month_start: getSaoPauloMonthStart(),
      target_responsible_leadership_id: responsibleLeadershipId || null,
    },
  );

  if (error) {
    return {
      message: "Não foi possível atualizar o responsável deste mês.",
      success: false,
    };
  }

  revalidatePath("/portal");
  revalidatePath("/portal/relatorios");

  return {
    message: responsibleLeadershipId
      ? "Responsável mensal atualizado."
      : "Indicação mensal removida.",
    success: true,
  };
}
