import "server-only";

import { cache } from "react";
import { getCurrentUser } from "@/lib/auth/current-user";
import {
  formatMonthLabel,
  getSaoPauloMonthStart,
} from "@/lib/dates/sao-paulo";
import { createClient } from "@/lib/supabase/server";
import { getWeeklyChecklistPeriod } from "@/lib/weekly-checklist";

type RawPortalHomeSummary = {
  firstTimeGuests: number;
  isCurrentUserResponsible: boolean;
  checklistPeopleCount: number;
  currentChecklist: {
    prayed_in_group: boolean | null;
    fasted_for_cell: boolean | null;
  } | null;
};

export const getPortalHomeSummary = cache(async () => {
  const user = await getCurrentUser();

  if (!user?.isActive) return null;

  const monthStart = getSaoPauloMonthStart();
  const checklistPeriod = getWeeklyChecklistPeriod();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_portal_home_summary", {
    target_month_start: monthStart,
    target_week_starts_on: checklistPeriod.weekStartsOn,
  });
  const summary = data as RawPortalHomeSummary | null;
  const parsedFirstTimeGuests = Number(summary?.firstTimeGuests ?? 0);

  if (error || !summary || !Number.isFinite(parsedFirstTimeGuests)) {
    return {
      monthlyResponsibility: null,
      institutionIndicator: {
        monthLabel: formatMonthLabel(monthStart),
        firstTimeGuests: 0,
        hasError: true,
      },
      weeklyChecklist: null,
    };
  }

  return {
    monthlyResponsibility: {
      isCurrentUserResponsible: summary.isCurrentUserResponsible,
      monthLabel: formatMonthLabel(monthStart),
    },
    institutionIndicator: {
      monthLabel: formatMonthLabel(monthStart),
      firstTimeGuests: parsedFirstTimeGuests,
      hasError: false,
    },
    weeklyChecklist: {
      period: checklistPeriod,
      hasError: false,
      peopleCount: summary.checklistPeopleCount,
      currentPerson: summary.currentChecklist
        ? {
            prayedInGroup: summary.currentChecklist.prayed_in_group,
            fastedForCell: summary.currentChecklist.fasted_for_cell,
          }
        : null,
    },
  };
});
