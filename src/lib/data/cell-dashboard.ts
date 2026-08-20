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
import type { CellDetails } from "@/lib/data/organization";

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
  id: string;
  name: string;
  is_active: boolean;
  started_on: string | null;
  reporting_starts_on: string;
  classification: {
    cell_type_name: string;
    network_code: string;
  } | null;
  schedule: {
    weekday: number;
    meeting_time: string;
  } | null;
  location: {
    neighborhood_name: string;
    city_name: string;
    state_code: string;
  } | null;
  leaderships: Array<{
    profile_id: string;
    full_name: string | null;
    role: "leader" | "vice_leader";
    starts_on: string;
  }>;
};

type RawCellDashboardBundle = {
  cell: RawCellStart | null;
  currentLeadership: RawCurrentLeadership | null;
  currentViceLeaderships: RawCurrentViceLeadership[];
  reports: RawReport[];
  versions: RawReportVersion[];
  evangelismEntries: RawEvangelismEntry[];
  leadershipParticipants: RawLeadershipParticipant[];
};

const weekdayNames = [
  "domingo",
  "segunda-feira",
  "terça-feira",
  "quarta-feira",
  "quinta-feira",
  "sexta-feira",
  "sábado",
];

function formatBrazilianDate(date: string) {
  const [year, month, day] = date.split("-");
  return `${day}/${month}/${year}`;
}

function toCellDetails(
  cell: RawCellStart | null | undefined,
  user: NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>,
): CellDetails | null {
  if (!cell) return null;

  const leaderships = cell.leaderships.map((leadership) => ({
    profileId: leadership.profile_id,
    name:
      leadership.full_name ??
      (leadership.profile_id === user.id
        ? (user.fullName ?? user.email ?? "Conta atual")
        : "Nome protegido"),
    role: leadership.role === "leader" ? ("Líder" as const) : ("Vice-líder" as const),
    startsOn: formatBrazilianDate(leadership.starts_on),
  }));

  return {
    id: cell.id,
    name: cell.name,
    isActive: cell.is_active,
    startedOn: cell.started_on ? formatBrazilianDate(cell.started_on) : null,
    classification: cell.classification
      ? `${cell.classification.network_code} — ${cell.classification.cell_type_name}`
      : "Não informada",
    schedule: cell.schedule
      ? `${weekdayNames[cell.schedule.weekday] ?? "dia inválido"}, ${cell.schedule.meeting_time.slice(0, 5)}`
      : "Não informado",
    location: cell.location
      ? `${cell.location.neighborhood_name}, ${cell.location.city_name} — ${cell.location.state_code}`
      : "Não informada",
    leader:
      leaderships.find((leadership) => leadership.role === "Líder")?.name ??
      "Não informado",
    leaderships,
    hasError: false,
  };
}

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
  const { data, error } = await supabase.rpc("get_cell_dashboard_bundle", {
    target_cell_id: cellId,
    target_starts_on: historyRange.startsOn,
    target_ends_before: range.endsBefore,
  });
  const bundle = data as RawCellDashboardBundle | null;
  const currentLeadership = bundle?.currentLeadership ?? null;
  const cellDetails = toCellDetails(bundle?.cell, user);

  const currentViceLeaderships =
    currentLeadership?.role === "leader"
      ? (bundle?.currentViceLeaderships ?? [])
      : [];
  const emptyViceSummaries = currentViceLeaderships.map((leadership) => ({
    profileId: leadership.profile_id,
    records: 0,
    reports: 0,
    didEvangelize: false,
  }));
  const cellStart = bundle?.cell ?? null;
  const reportCreatedOnById = new Map(
    (bundle?.reports ?? []).map((report) => [
      report.id,
      getSaoPauloDate(new Date(report.created_at)),
    ]),
  );
  const calculateOverdueWeeks = (reports: RawReportVersion[]) =>
    cellStart
      ? calculateOverdueCellWeeks(
          [
            {
              id: cellId,
              reportingStartsOn: cellStart.reporting_starts_on,
            },
          ],
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

  if (error || !bundle) {
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
      cellDetails: null,
      hasError: true,
    };
  }

  const reportIds = bundle.reports.map((report) => report.id);

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
      cellDetails,
      hasError: false,
    };
  }

  const reports = bundle.versions;
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
  const selectedVersionIdSet = new Set(selectedVersionIds);
  const evangelismEntries = bundle.evangelismEntries.filter((entry) =>
    selectedVersionIdSet.has(entry.report_version_id),
  );
  const positiveEvangelismEntries = evangelismEntries.filter(
    (entry) => entry.did_evangelize,
  );
  const evangelismEntryIds = positiveEvangelismEntries.map((entry) => entry.id);
  const evangelismEntryIdSet = new Set(evangelismEntryIds);
  const leadershipParticipants = bundle.leadershipParticipants.filter(
    (participant) =>
      evangelismEntryIdSet.has(participant.evangelism_entry_id),
  );
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
    cellDetails,
    hasError: false,
  };
}
