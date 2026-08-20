import "server-only";

import {
  canAccessPastoralDashboard,
  getCurrentUser,
} from "@/lib/auth/current-user";
import {
  calculateOverdueCellWeeks,
  calculatePastoralDashboardMetrics,
  calculatePastoralCellSummaries,
  calculatePastoralFirstTimeHistory,
  calculateMonthlyEvangelismParticipation,
  calculatePastoralEvangelismHistory,
  normalizePastoralHistoryMonths,
} from "@/lib/cell-dashboard";
import {
  formatMonthLabel,
  getMonthRange,
  getMonthSequence,
  getSaoPauloDate,
  normalizeMonth,
} from "@/lib/dates/sao-paulo";
import { createClient } from "@/lib/supabase/server";

type PastoralDashboardFilters = {
  month?: string;
  networkId?: string;
  cellTypeId?: string;
  cellId?: string;
  weekday?: string;
  submitterProfileId?: string;
  historyMonths?: string;
};

type RawNetwork = {
  id: string;
  name: string;
  code: string;
};

type RawCellType = {
  id: string;
  network_id: string;
  name: string;
};

type RawCell = {
  id: string;
  name: string;
  reporting_starts_on: string;
};

type RawReport = {
  id: string;
  cell_id: string;
  created_at: string;
};

type RawDeadlineReport = {
  cell_id: string;
  meeting_on: string;
  created_at: string;
};

type RawClassification = {
  cell_id: string;
  cell_type_id: string;
};

type RawSchedule = {
  cell_id: string;
  weekday: number;
};

type RawLeadershipDirectoryEntry = {
  profile_id: string;
  full_name: string | null;
};

type RawReportVersion = {
  id: string;
  report_id: string;
  submitted_by: string;
  meeting_on: string;
  members_count: number;
  guests_count: number;
  first_time_guests_count: number;
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

type RawPastoralDashboardBundle = {
  networks: RawNetwork[];
  cellTypes: RawCellType[];
  cells: RawCell[];
  classifications: RawClassification[];
  schedules: RawSchedule[];
  reports: RawReport[];
  versions: RawReportVersion[];
  submitters: RawLeadershipDirectoryEntry[];
  deadlineReports: RawDeadlineReport[];
  evangelismEntries: RawEvangelismEntry[];
  leadershipParticipants: RawLeadershipParticipant[];
};

const emptyEvangelismParticipation = {
  accompanied: 0,
  evangelized: 0,
  percentage: null,
};

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function getPastoralDashboard(
  requestedFilters: PastoralDashboardFilters = {},
) {
  const user = await getCurrentUser();

  if (!user || !canAccessPastoralDashboard(user)) {
    return null;
  }

  const month = normalizeMonth(requestedFilters.month);
  const today = getSaoPauloDate();
  const range = getMonthRange(month);
  const historyMonthsCount = normalizePastoralHistoryMonths(
    requestedFilters.historyMonths,
  );
  const historyMonths = getMonthSequence(month, historyMonthsCount);
  const historyRange = getMonthRange(historyMonths[0]);
  const emptyMetrics = calculatePastoralDashboardMetrics([]);
  const emptyHistory = calculatePastoralFirstTimeHistory(historyMonths, []).map(
    (item) => ({
      ...item,
      monthLabel: formatMonthLabel(`${item.month}-01`).replace(" de ", " "),
    }),
  );
  const emptyEvangelismHistory = historyMonths.map((historyMonth) => ({
    month: historyMonth,
    monthLabel: formatMonthLabel(`${historyMonth}-01`).replace(" de ", " "),
    ...emptyEvangelismParticipation,
  }));
  const supabase = await createClient();
  const { data, error: bundleError } = await supabase.rpc(
    "get_pastoral_dashboard_bundle",
    {
      target_starts_on: historyRange.startsOn,
      target_ends_before: range.endsBefore,
      target_month_start: range.startsOn,
      target_network_id: uuidPattern.test(requestedFilters.networkId ?? "")
        ? requestedFilters.networkId
        : null,
      target_cell_type_id: uuidPattern.test(requestedFilters.cellTypeId ?? "")
        ? requestedFilters.cellTypeId
        : null,
      target_cell_id: uuidPattern.test(requestedFilters.cellId ?? "")
        ? requestedFilters.cellId
        : null,
      target_weekday: ["4", "5", "6"].includes(
        requestedFilters.weekday ?? "",
      )
        ? Number(requestedFilters.weekday)
        : null,
      target_submitter_profile_id: uuidPattern.test(
        requestedFilters.submitterProfileId ?? "",
      )
        ? requestedFilters.submitterProfileId
        : null,
    },
  );
  const bundle = data as RawPastoralDashboardBundle | null;
  const networks = bundle?.networks ?? [];
  const cellTypes = bundle?.cellTypes ?? [];
  const baseHasError = Boolean(bundleError || !bundle);
  const selectedNetworkId = networks.some(
    (network) => network.id === requestedFilters.networkId,
  )
    ? (requestedFilters.networkId ?? "")
    : "";
  const availableCellTypes = selectedNetworkId
    ? cellTypes.filter((cellType) => cellType.network_id === selectedNetworkId)
    : cellTypes;
  const selectedCellTypeId = availableCellTypes.some(
    (cellType) => cellType.id === requestedFilters.cellTypeId,
  )
    ? (requestedFilters.cellTypeId ?? "")
    : "";

  if (baseHasError) {
    return {
      month,
      monthLabel: formatMonthLabel(range.startsOn),
      networks,
      cellTypes: availableCellTypes,
      selectedNetworkId,
      selectedCellTypeId,
      selectedCellId: "",
      selectedWeekday: "",
      selectedSubmitterProfileId: "",
      cells: [],
      submitters: [],
      historyMonths: historyMonthsCount,
      activeCells: 0,
      metrics: emptyMetrics,
      firstTimeHistory: emptyHistory,
      cellSummaries: [],
      overdueWeeks: [],
      evangelismParticipation: emptyEvangelismParticipation,
      evangelismHistory: emptyEvangelismHistory,
      hasError: true,
    };
  }

  const allowedCellTypeIds = selectedCellTypeId
    ? new Set([selectedCellTypeId])
    : selectedNetworkId
      ? new Set(
          cellTypes
            .filter((cellType) => cellType.network_id === selectedNetworkId)
            .map((cellType) => cellType.id),
        )
      : null;
  const classifications = bundle?.classifications ?? [];
  const cellTypeByCellId = new Map(
    classifications.map((classification) => [
      classification.cell_id,
      classification.cell_type_id,
    ]),
  );
  const scheduleByCellId = new Map(
    (bundle?.schedules ?? []).map((schedule) => [
      schedule.cell_id,
      schedule.weekday,
    ]),
  );
  const selectedWeekday = ["4", "5", "6"].includes(
    requestedFilters.weekday ?? "",
  )
    ? (requestedFilters.weekday ?? "")
    : "";
  const organizationFilteredCells = (bundle?.cells ?? []).filter(
    (cell) => {
      if (!allowedCellTypeIds) {
        return true;
      }

      const cellTypeId = cellTypeByCellId.get(cell.id);
      return Boolean(cellTypeId && allowedCellTypeIds.has(cellTypeId));
    },
  ).filter(
    (cell) =>
      !selectedWeekday ||
      scheduleByCellId.get(cell.id) === Number(selectedWeekday),
  );
  const selectedCellId = organizationFilteredCells.some(
    (cell) => cell.id === requestedFilters.cellId,
  )
    ? (requestedFilters.cellId ?? "")
    : "";
  const filteredCells = selectedCellId
    ? organizationFilteredCells.filter((cell) => cell.id === selectedCellId)
    : organizationFilteredCells;
  let submitters: Array<{ id: string; name: string }> = [];
  let selectedSubmitterProfileId = "";
  const filteredCellIds = filteredCells.map((cell) => cell.id);
  const filteredCellIdSet = new Set(filteredCellIds);
  const scopedReports = (bundle?.reports ?? []).filter((report) =>
    filteredCellIdSet.has(report.cell_id),
  );
  const reportIds = scopedReports.map((report) => report.id);
  const reportIdSet = new Set(reportIds);
  const reportCellByReportId = new Map<string, string>();
  for (const report of scopedReports) {
    reportCellByReportId.set(report.id, report.cell_id);
  }

  const unfilteredVersions = (bundle?.versions ?? []).filter((version) =>
    reportIdSet.has(version.report_id),
  );
  const overdueWeeks = calculateOverdueCellWeeks(
    filteredCells.map((cell) => ({
      id: cell.id,
      reportingStartsOn: cell.reporting_starts_on,
    })),
    (bundle?.deadlineReports ?? []).map((report) => ({
      cellId: report.cell_id,
      meetingOn: report.meeting_on,
      submittedOn: getSaoPauloDate(new Date(report.created_at)),
    })),
    month,
    today,
  ).map((week) => ({
    ...week,
    cellName:
      filteredCells.find((cell) => cell.id === week.cellId)?.name ??
      "Célula não informada",
  }));
  submitters = (bundle?.submitters ?? [])
    .map((profile) => ({
      id: profile.profile_id,
      name: profile.full_name ?? "Nome não informado",
    }))
    .sort((first, second) => first.name.localeCompare(second.name, "pt-BR"));
  selectedSubmitterProfileId = submitters.some(
    (submitter) => submitter.id === requestedFilters.submitterProfileId,
  )
    ? (requestedFilters.submitterProfileId ?? "")
    : "";
  const versions = selectedSubmitterProfileId
    ? unfilteredVersions.filter(
        (version) => version.submitted_by === selectedSubmitterProfileId,
      )
    : unfilteredVersions;
  const submittedCellIds = new Set(
    versions.map(
      (version) => reportCellByReportId.get(version.report_id) ?? "",
    ),
  );
  const dashboardCells = selectedSubmitterProfileId
    ? filteredCells.filter((cell) => submittedCellIds.has(cell.id))
    : filteredCells;
  const monthlyVersions = versions.filter(
    (version) => version.meeting_on.slice(0, 7) === month,
  );
  const metrics = calculatePastoralDashboardMetrics(
    monthlyVersions.map((version) => ({
      membersCount: version.members_count,
      guestsCount: version.guests_count,
      firstTimeGuestsCount: version.first_time_guests_count,
    })),
  );
  const versionIds = versions.map((version) => version.id);
  const versionIdSet = new Set(versionIds);
  const evangelismEntries = (bundle?.evangelismEntries ?? []).filter((entry) =>
    versionIdSet.has(entry.report_version_id),
  );
  const positiveEntryIds = evangelismEntries
    .filter((entry) => entry.did_evangelize)
    .map((entry) => entry.id);
  const positiveEntryIdSet = new Set(positiveEntryIds);
  const leadershipParticipants = (bundle?.leadershipParticipants ?? []).filter(
    (participant) =>
      positiveEntryIdSet.has(participant.evangelism_entry_id),
  );
  const meetingOnByVersionId = new Map(
    versions.map((version) => [version.id, version.meeting_on]),
  );
  const selectedVersionIds = new Set(
    monthlyVersions.map((version) => version.id),
  );
  const monthlyEvangelismEntries = evangelismEntries.filter((entry) =>
    selectedVersionIds.has(entry.report_version_id),
  );
  const monthlyEvangelismEntryIds = new Set(
    monthlyEvangelismEntries.map((entry) => entry.id),
  );
  const monthlyLeadershipParticipants = leadershipParticipants.filter(
    (participant) =>
      monthlyEvangelismEntryIds.has(participant.evangelism_entry_id),
  );
  const evangelismParticipation = calculateMonthlyEvangelismParticipation(
    monthlyEvangelismEntries.map((entry) => ({
      didEvangelize: entry.did_evangelize,
      leadershipId: entry.cell_leadership_id,
    })),
    monthlyLeadershipParticipants.map(
      (participant) => participant.cell_leadership_id,
    ),
  );
  const evangelismHistory = calculatePastoralEvangelismHistory(
    historyMonths,
    evangelismEntries.map((entry) => ({
      id: entry.id,
      meetingOn: meetingOnByVersionId.get(entry.report_version_id) ?? "",
      didEvangelize: entry.did_evangelize,
      leadershipId: entry.cell_leadership_id,
    })),
    leadershipParticipants.map((participant) => ({
      entryId: participant.evangelism_entry_id,
      leadershipId: participant.cell_leadership_id,
    })),
  ).map((item) => ({
    ...item,
    monthLabel: formatMonthLabel(`${item.month}-01`).replace(" de ", " "),
  }));
  const networkById = new Map(
    networks.map((network) => [network.id, network.name]),
  );
  const cellTypeById = new Map(cellTypes.map((cellType) => [cellType.id, cellType]));
  const baseCellSummaries = calculatePastoralCellSummaries(
    dashboardCells.map((cell) => {
      const cellType = cellTypeById.get(cellTypeByCellId.get(cell.id) ?? "");

      return {
        id: cell.id,
        name: cell.name,
        networkName: cellType
          ? (networkById.get(cellType.network_id) ?? "Rede não informada")
          : "Rede não informada",
        cellTypeName: cellType?.name ?? "Tipo não informado",
      };
    }),
    monthlyVersions.map((version) => ({
      cellId: reportCellByReportId.get(version.report_id) ?? "",
      membersCount: version.members_count,
      guestsCount: version.guests_count,
      firstTimeGuestsCount: version.first_time_guests_count,
    })),
  );
  const cellIdByVersionId = new Map(
    monthlyVersions.map((version) => [
      version.id,
      reportCellByReportId.get(version.report_id) ?? "",
    ]),
  );
  const cellSummaries = baseCellSummaries.map((cell) => {
    const cellEntries = monthlyEvangelismEntries.filter(
      (entry) => cellIdByVersionId.get(entry.report_version_id) === cell.id,
    );
    const cellEntryIds = new Set(cellEntries.map((entry) => entry.id));
    const cellParticipants = monthlyLeadershipParticipants.filter((participant) =>
      cellEntryIds.has(participant.evangelism_entry_id),
    );

    return {
      ...cell,
      evangelismParticipation: calculateMonthlyEvangelismParticipation(
        cellEntries.map((entry) => ({
          didEvangelize: entry.did_evangelize,
          leadershipId: entry.cell_leadership_id,
        })),
        cellParticipants.map((participant) => participant.cell_leadership_id),
      ),
    };
  });
  const firstTimeHistory = calculatePastoralFirstTimeHistory(
    historyMonths,
    versions.map((version) => ({
      meetingOn: version.meeting_on,
      membersCount: version.members_count,
      guestsCount: version.guests_count,
      firstTimeGuestsCount: version.first_time_guests_count,
    })),
  ).map((item) => ({
    ...item,
    monthLabel: formatMonthLabel(`${item.month}-01`).replace(" de ", " "),
  }));

  return {
    month,
    monthLabel: formatMonthLabel(range.startsOn),
    networks,
    cellTypes: availableCellTypes,
    selectedNetworkId,
    selectedCellTypeId,
    selectedCellId,
    selectedWeekday,
    selectedSubmitterProfileId,
    cells: organizationFilteredCells,
    submitters,
    historyMonths: historyMonthsCount,
    activeCells: dashboardCells.length,
    metrics,
    firstTimeHistory,
    cellSummaries,
    overdueWeeks,
    evangelismParticipation,
    evangelismHistory,
    hasError: false,
  };
}
