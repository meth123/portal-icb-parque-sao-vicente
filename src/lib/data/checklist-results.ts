import "server-only";

import {
  canAccessPastoralDashboard,
  getCurrentUser,
} from "@/lib/auth/current-user";
import {
  normalizeChecklistNetworkCode,
  normalizeChecklistResultsMonth,
  normalizeChecklistResultsPeriodType,
  normalizeChecklistResultsWeek,
  type ChecklistResultsPeriodType,
} from "@/lib/checklist-results";
import { createClient } from "@/lib/supabase/server";

export type ChecklistResultsNetwork = {
  id: string;
  name: string;
  code: string;
};

export type ChecklistResultsSummary = {
  leadershipsConsidered: number;
  eligibleChecklists: number;
  prayedCount: number;
  fastedCount: number;
  evangelizedCount: number;
  pendingCount: number;
};

export type ChecklistResultsNetworkSummary = ChecklistResultsSummary & {
  networkId: string;
  networkName: string;
  networkCode: string;
};

export type ChecklistResultsPerson = {
  profileId: string;
  fullName: string;
  cellId: string;
  cellName: string;
  leadershipRole: "leader" | "vice_leader";
  networkId: string;
  networkName: string;
  networkCode: string;
  eligibleChecklists: number;
  prayedCount: number;
  fastedCount: number;
  evangelizedCount: number;
  pendingCount: number;
};

export type ChecklistResultsReport = {
  periodType: ChecklistResultsPeriodType;
  periodStart: string;
  periodEnd: string;
  isComplete: boolean;
  availableAt: string;
  selectedNetworkCode: string | null;
  availableNetworks: ChecklistResultsNetwork[];
  weeks: Array<{
    startsOn: string;
    endsOn: string;
    closesAt: string;
  }>;
  summary: ChecklistResultsSummary;
  networkSummaries: ChecklistResultsNetworkSummary[];
  people: ChecklistResultsPerson[];
};

export type ChecklistResultsFilters = {
  periodType?: string;
  month?: string;
  week?: string;
  networkCode?: string;
};

export async function getChecklistResultsReport(
  filters: ChecklistResultsFilters = {},
) {
  const user = await getCurrentUser();

  if (!user || !canAccessPastoralDashboard(user)) return null;

  const periodType = normalizeChecklistResultsPeriodType(filters.periodType);
  const month = normalizeChecklistResultsMonth(filters.month);
  const week = normalizeChecklistResultsWeek(filters.week);
  const networkCode = normalizeChecklistNetworkCode(filters.networkCode);
  const periodStart = periodType === "monthly" ? `${month}-01` : week;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_checklist_results_report", {
    target_period_type: periodType,
    target_period_start: periodStart,
    target_network_code: networkCode,
  });

  return {
    report: error ? null : (data as ChecklistResultsReport | null),
    hasError: Boolean(error || !data),
    filters: {
      periodType,
      month,
      week,
      networkCode,
    },
  };
}
