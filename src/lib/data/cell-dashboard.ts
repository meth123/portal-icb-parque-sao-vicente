import "server-only";

import {
  calculateOverdueCellWeeks,
  calculateEvangelismHistory,
  calculateMonthlyEvangelismParticipation,
  calculatePastoralDashboardMetrics,
  calculatePersonalEvangelismSummary,
  normalizePastoralHistoryMonths,
} from "@/lib/cell-dashboard";
import { getCurrentUser } from "@/lib/auth/current-user";
import {
  formatMonthLabel,
  getMonthRange,
  getMonthSequence,
  getSaoPauloDate,
  normalizeMonth,
} from "@/lib/dates/sao-paulo";
import { createClient } from "@/lib/supabase/server";

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type RawReportVersion = {
  id: string;
  report_id: string;
  meeting_on: string;
  members_count: number;
  guests_count: number;
  first_time_guests_count: number;
};

type RawReport = {
  id: string;
  created_at: string;
};

type RawEvangelismEntry = {
  id: string;
  report_version_id: string;
  cell_leadership_id: string;
  did_evangelize: boolean;
};

type RawLeadershipParticipant = {
  evangelism_entry_id: string;
  cell_leadership_id: string;
};

type RawCurrentLeadership = {
  id: string;
  role: "leader" | "vice_leader";
};

type RawCurrentViceLeadership = {
  id: string;
  profile_id: string;
};

type RawCellStart = {
  started_on: string;
};

export async function getCellDashboard(
  cellId: string,
  requestedMonth?: string,
  requestedHistoryMonths?: string,
) {
  const month = normalizeMonth(requestedMonth);
  const today = getSaoPauloDate();
  const range = getMonthRange(month);
  const historyMonthsCount = normalizePastoralHistoryMonths(
    requestedHistoryMonths,
  );
  const historyMonths = getMonthSequence(month, historyMonthsCount);
  const historyRange = getMonthRange(historyMonths[0]);
  const emptyMetrics = calculatePastoralDashboardMetrics([]);
  const emptyHistory = historyMonths.map((historyMonth) => ({
    month: historyMonth,
    monthLabel: formatMonthLabel(`${historyMonth}-01`).replace(" de ", " "),
    metrics: emptyMetrics,
  }));

  if (!uuidPattern.test(cellId)) {
    return null;
  }

  const user = await getCurrentUser();

  if (!user?.isActive) {
    return null;
  }

  const supabase = await createClient();
  const [
    reportsResult,
    currentLeadershipResult,
    viceLeadershipsResult,
    cellStartResult,
  ] =
    await Promise.all([
      supabase
        .from("cell_reports")
        .select("id, created_at")
        .eq("cell_id", cellId)
        .gte("meeting_on", historyRange.startsOn)
        .lt("meeting_on", range.endsBefore)
        .limit(200),
      supabase
        .from("cell_leaderships")
        .select("id, role")
        .eq("cell_id", cellId)
        .eq("profile_id", user.id)
        .is("ends_on", null)
        .maybeSingle(),
      supabase
        .from("cell_leaderships")
        .select("id, profile_id")
        .eq("cell_id", cellId)
        .eq("role", "vice_leader")
        .is("ends_on", null),
      supabase
        .from("cells")
        .select("started_on")
        .eq("id", cellId)
        .maybeSingle(),
    ]);
  const currentLeadership = currentLeadershipResult.data as
    | RawCurrentLeadership
    | null;

  const currentViceLeaderships =
    currentLeadership?.role === "leader"
      ? ((viceLeadershipsResult.data ?? []) as RawCurrentViceLeadership[])
      : [];
  const emptyViceSummaries = currentViceLeaderships.map((leadership) => ({
    profileId: leadership.profile_id,
    records: 0,
    reports: 0,
    didEvangelize: false,
  }));
  const cellStart = cellStartResult.data as RawCellStart | null;
  const reportCreatedOnById = new Map(
    ((reportsResult.data ?? []) as RawReport[]).map((report) => [
      report.id,
      getSaoPauloDate(new Date(report.created_at)),
    ]),
  );
  const calculateOverdueWeeks = (reports: RawReportVersion[]) =>
    cellStart
      ? calculateOverdueCellWeeks(
          [{ id: cellId, startedOn: cellStart.started_on }],
          reports.map((report) => ({
            cellId,
            meetingOn: report.meeting_on,
            submittedOn:
              reportCreatedOnById.get(report.report_id) ?? report.meeting_on,
          })),
          month,
          today,
        )
      : [];

  if (
    reportsResult.error ||
    currentLeadershipResult.error ||
    viceLeadershipsResult.error ||
    cellStartResult.error
  ) {
    return {
      month,
      monthLabel: formatMonthLabel(range.startsOn),
      historyMonths: historyMonthsCount,
      metrics: emptyMetrics,
      history: emptyHistory,
      evangelismHistory: [],
      evangelismParticipation: {
        accompanied: 0,
        evangelized: 0,
        percentage: null,
      },
      personalSummary: null,
      viceSummaries: [],
      overdueWeeks: [],
      hasError: true,
    };
  }

  const reportIds = ((reportsResult.data ?? []) as RawReport[]).map(
    (report) => report.id,
  );

  if (reportIds.length === 0) {
    return {
      month,
      monthLabel: formatMonthLabel(range.startsOn),
      historyMonths: historyMonthsCount,
      metrics: emptyMetrics,
      history: emptyHistory,
      evangelismHistory: [],
      evangelismParticipation: {
        accompanied: 0,
        evangelized: 0,
        percentage: null,
      },
      personalSummary: currentLeadership
        ? {
            role: currentLeadership.role,
            records: 0,
            reports: 0,
            didEvangelize: false,
          }
        : null,
      viceSummaries: emptyViceSummaries,
      overdueWeeks: calculateOverdueWeeks([]),
      hasError: false,
    };
  }

  const versionsResult = await supabase
    .from("cell_report_versions")
    .select(
      "id, report_id, meeting_on, members_count, guests_count, first_time_guests_count",
    )
    .in("report_id", reportIds)
    .eq("is_current", true)
    .gte("meeting_on", historyRange.startsOn)
    .lt("meeting_on", range.endsBefore);

  if (versionsResult.error) {
    return {
      month,
      monthLabel: formatMonthLabel(range.startsOn),
      historyMonths: historyMonthsCount,
      metrics: emptyMetrics,
      history: emptyHistory,
      evangelismHistory: [],
      evangelismParticipation: {
        accompanied: 0,
        evangelized: 0,
        percentage: null,
      },
      personalSummary: null,
      viceSummaries: emptyViceSummaries,
      overdueWeeks: [],
      hasError: true,
    };
  }

  const reports = (versionsResult.data ?? []) as RawReportVersion[];
  const overdueWeeks = calculateOverdueWeeks(reports);
  const history = historyMonths.map((historyMonth) => {
    const monthlyReports = reports
      .filter((report) => report.meeting_on.slice(0, 7) === historyMonth)
      .map((report) => ({
        membersCount: report.members_count,
        guestsCount: report.guests_count,
        firstTimeGuestsCount: report.first_time_guests_count,
      }));

    return {
      month: historyMonth,
      monthLabel: formatMonthLabel(`${historyMonth}-01`).replace(" de ", " "),
      metrics: calculatePastoralDashboardMetrics(monthlyReports),
    };
  });
  const selectedMonth = history.find((item) => item.month === month);
  const selectedVersions = reports.filter(
    (report) => report.meeting_on.slice(0, 7) === month,
  );
  const selectedVersionIds = selectedVersions.map((report) => report.id);
  const evangelismResult =
    selectedVersionIds.length > 0
      ? await supabase
          .from("cell_report_evangelism_entries")
          .select(
            "id, report_version_id, cell_leadership_id, did_evangelize",
          )
          .in("report_version_id", selectedVersionIds)
      : { data: [], error: null };

  if (evangelismResult.error) {
    return {
      month,
      monthLabel: formatMonthLabel(range.startsOn),
      historyMonths: historyMonthsCount,
      metrics: selectedMonth?.metrics ?? emptyMetrics,
      history,
      evangelismHistory: [],
      evangelismParticipation: {
        accompanied: 0,
        evangelized: 0,
        percentage: null,
      },
      personalSummary: null,
      viceSummaries: emptyViceSummaries,
      overdueWeeks,
      hasError: true,
    };
  }

  const evangelismEntries = (evangelismResult.data ?? []) as RawEvangelismEntry[];
  const positiveEvangelismEntries = evangelismEntries.filter(
    (entry) => entry.did_evangelize,
  );
  const evangelismEntryIds = positiveEvangelismEntries.map((entry) => entry.id);
  const leadershipParticipantsResult =
    evangelismEntryIds.length > 0
      ? await supabase
          .from("cell_report_evangelism_leadership_participants")
          .select("evangelism_entry_id, cell_leadership_id")
          .in("evangelism_entry_id", evangelismEntryIds)
      : { data: [], error: null };

  if (leadershipParticipantsResult.error) {
    return {
      month,
      monthLabel: formatMonthLabel(range.startsOn),
      historyMonths: historyMonthsCount,
      metrics: selectedMonth?.metrics ?? emptyMetrics,
      history,
      evangelismHistory: [],
      evangelismParticipation: {
        accompanied: 0,
        evangelized: 0,
        percentage: null,
      },
      personalSummary: null,
      viceSummaries: emptyViceSummaries,
      overdueWeeks,
      hasError: true,
    };
  }

  const leadershipParticipants = (leadershipParticipantsResult.data ??
    []) as RawLeadershipParticipant[];
  const evangelismHistory = calculateEvangelismHistory(
    selectedVersions.map((version) => ({
      versionId: version.id,
      meetingOn: version.meeting_on,
    })),
    positiveEvangelismEntries.map((entry) => ({
      id: entry.id,
      versionId: entry.report_version_id,
    })),
    leadershipParticipants.map((participant) => ({
      entryId: participant.evangelism_entry_id,
      leadershipId: participant.cell_leadership_id,
    })),
  );
  const evangelismParticipation = calculateMonthlyEvangelismParticipation(
    evangelismEntries.map((entry) => ({
      didEvangelize: entry.did_evangelize,
      leadershipId: entry.cell_leadership_id,
    })),
    leadershipParticipants.map(
      (participant) => participant.cell_leadership_id,
    ),
  );
  const personalSummary = currentLeadership
    ? {
        role: currentLeadership.role,
        ...calculatePersonalEvangelismSummary(
          currentLeadership.id,
          positiveEvangelismEntries.map((entry) => ({
            id: entry.id,
            versionId: entry.report_version_id,
          })),
          leadershipParticipants.map((participant) => ({
            entryId: participant.evangelism_entry_id,
            leadershipId: participant.cell_leadership_id,
          })),
        ),
      }
    : null;
  const viceSummaries = currentViceLeaderships.map((leadership) => ({
    profileId: leadership.profile_id,
    ...calculatePersonalEvangelismSummary(
      leadership.id,
      positiveEvangelismEntries.map((entry) => ({
        id: entry.id,
        versionId: entry.report_version_id,
      })),
      leadershipParticipants.map((participant) => ({
        entryId: participant.evangelism_entry_id,
        leadershipId: participant.cell_leadership_id,
      })),
    ),
  }));

  return {
    month,
    monthLabel: formatMonthLabel(range.startsOn),
    historyMonths: historyMonthsCount,
    metrics: selectedMonth?.metrics ?? emptyMetrics,
    history,
    evangelismHistory,
    evangelismParticipation,
    personalSummary,
    viceSummaries,
    overdueWeeks,
    hasError: false,
  };
}
