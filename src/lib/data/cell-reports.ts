import "server-only";

import { cache } from "react";
import { getCurrentUser } from "@/lib/auth/current-user";
import {
  formatMonthLabel,
  getSaoPauloMonthStart,
} from "@/lib/dates/sao-paulo";
import { createClient } from "@/lib/supabase/server";

export type CellReportLeadershipOption = {
  leadershipId: string;
  name: string;
  role: "leader" | "vice_leader";
};

export type CellReportFormContext = {
  cellId: string;
  cellName: string;
  currentUserLeadershipId: string;
  currentUserRole: "leader" | "vice_leader";
  leader: CellReportLeadershipOption;
  viceLeaders: CellReportLeadershipOption[];
  leadership: CellReportLeadershipOption[];
};

type RawCellReportFormContext = {
  cell_id: string;
  cell_name: string;
  current_user_leadership_id: string;
  current_user_role: "leader" | "vice_leader";
  leadership_id: string;
  leadership_name: string;
  leadership_role: "leader" | "vice_leader";
};

export const getCellReportFormContext = cache(
  async (): Promise<CellReportFormContext | null> => {
    const user = await getCurrentUser();

    if (!user?.isActive) {
      return null;
    }

    const supabase = await createClient();
    const { data, error } = await supabase.rpc("get_cell_report_form_context");
    const rows = (data ?? []) as RawCellReportFormContext[];
    const firstRow = rows[0];

    if (error || !firstRow) {
      return null;
    }

    const leadershipOptions = rows
      .map((row) => ({
        leadershipId: row.leadership_id,
        name: row.leadership_name,
        role: row.leadership_role,
      }))
      .sort((first, second) => {
        if (first.role !== second.role) {
          return first.role === "leader" ? -1 : 1;
        }

        return first.name.localeCompare(second.name, "pt-BR");
      });
    const leader = leadershipOptions.find((item) => item.role === "leader");

    if (!leader) {
      return null;
    }

    const viceLeaders = leadershipOptions.filter(
      (item) => item.role === "vice_leader",
    );

    return {
      cellId: firstRow.cell_id,
      cellName: firstRow.cell_name,
      currentUserLeadershipId: firstRow.current_user_leadership_id,
      currentUserRole: firstRow.current_user_role,
      leader,
      viceLeaders,
      leadership: leadershipOptions,
    };
  },
);

export const getCurrentMonthlyReportResponsibility = cache(async () => {
  const context = await getCellReportFormContext();

  if (!context) {
    return null;
  }

  const monthStart = getSaoPauloMonthStart();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("cell_report_monthly_responsibilities")
    .select("responsible_leadership_id, assigned_at")
    .eq("cell_id", context.cellId)
    .eq("month_start", monthStart)
    .is("replaced_at", null)
    .maybeSingle();
  const responsibleLeadershipId = data?.responsible_leadership_id ?? null;
  const responsible = context.leadership.find(
    (person) => person.leadershipId === responsibleLeadershipId,
  );

  return {
    cellId: context.cellId,
    monthStart,
    monthLabel: formatMonthLabel(monthStart),
    currentUserRole: context.currentUserRole,
    isCurrentUserResponsible:
      responsibleLeadershipId === context.currentUserLeadershipId,
    leadership: context.leadership,
    responsibleLeadershipId,
    responsibleName:
      responsible?.name ??
      (responsibleLeadershipId ? "Vice-líder anteriormente vinculado" : null),
    hasError: Boolean(error),
  };
});
