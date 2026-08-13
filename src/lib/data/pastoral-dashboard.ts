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
  started_on: string;
};

type RawReport = {
  id: string;
  cell_id: string;
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

const emptyEvangelismParticipation = {
  accompanied: 0,
  evangelized: 0,
  percentage: null,
};

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
  const [
    networksResult,
    cellTypesResult,
    cellsResult,
    classificationsResult,
    schedulesResult,
  ] =
    await Promise.all([
      supabase
        .from("networks")
        .select("id, name, code")
        .eq("is_active", true)
        .order("name"),
      supabase
        .from("cell_types")
        .select("id, network_id, name")
        .eq("is_active", true)
        .order("name"),
      supabase
        .from("cells")
        .select("id, name, started_on")
        .eq("is_active", true)
        .order("name"),
      supabase
        .from("cell_classifications")
        .select("cell_id, cell_type_id")
        .is("ends_on", null),
      supabase
        .from("cell_schedules")
        .select("cell_id, weekday")
        .is("ends_on", null),
    ]);

  const networks = (networksResult.data ?? []) as RawNetwork[];
  const cellTypes = (cellTypesResult.data ?? []) as RawCellType[];
  const baseHasError = Boolean(
    networksResult.error ||
      cellTypesResult.error ||
      cellsResult.error ||
      classificationsResult.error ||
      schedulesResult.error,
  );
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
  const classifications = (classificationsResult.data ??
    []) as RawClassification[];
  const cellTypeByCellId = new Map(
    classifications.map((classification) => [
      classification.cell_id,
      classification.cell_type_id,
    ]),
  );
  const scheduleByCellId = new Map(
    ((schedulesResult.data ?? []) as RawSchedule[]).map((schedule) => [
      schedule.cell_id,
      schedule.weekday,
    ]),
  );
  const selectedWeekday = ["4", "5", "6"].includes(
    requestedFilters.weekday ?? "",
  )
    ? (requestedFilters.weekday ?? "")
    : "";
  const organizationFilteredCells = ((cellsResult.data ?? []) as RawCell[]).filter(
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
  let directoryHasError = false;
  const filteredCellIds = filteredCells.map((cell) => cell.id);
  const reportIds: string[] = [];
  const reportCellByReportId = new Map<string, string>();
  const reportCreatedOnByReportId = new Map<string, string>();
  let reportsHaveError = false;

  if (filteredCellIds.length > 0) {
    const pageSize = 500;
    let offset = 0;
    let shouldContinue = true;

    while (shouldContinue) {
      const reportsResult = await supabase
        .from("cell_reports")
        .select("id, cell_id, created_at")
        .in("cell_id", filteredCellIds)
        .gte("meeting_on", historyRange.startsOn)
        .lt("meeting_on", range.endsBefore)
        .order("meeting_on")
        .order("id")
        .range(offset, offset + pageSize - 1);

      if (reportsResult.error) {
        reportsHaveError = true;
        break;
      }

      const page = reportsResult.data ?? [];
      for (const report of page as RawReport[]) {
        reportIds.push(report.id);
        reportCellByReportId.set(report.id, report.cell_id);
        reportCreatedOnByReportId.set(
          report.id,
          getSaoPauloDate(new Date(report.created_at)),
        );
      }
      shouldContinue = page.length === pageSize;
      offset += pageSize;
    }
  }

  if (reportsHaveError) {
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
      activeCells: filteredCellIds.length,
      metrics: emptyMetrics,
      firstTimeHistory: emptyHistory,
      cellSummaries: [],
      overdueWeeks: [],
      evangelismParticipation: emptyEvangelismParticipation,
      evangelismHistory: emptyEvangelismHistory,
      hasError: true,
    };
  }

  const reportIdBatches = Array.from(
    { length: Math.ceil(reportIds.length / 200) },
    (_, index) => reportIds.slice(index * 200, index * 200 + 200),
  );
  const versionResults = await Promise.all(
    reportIdBatches.map((batch) =>
      supabase
        .from("cell_report_versions")
        .select(
          "id, report_id, submitted_by, meeting_on, members_count, guests_count, first_time_guests_count",
        )
        .in("report_id", batch)
        .eq("is_current", true),
    ),
  );

  if (versionResults.some((result) => result.error)) {
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
      activeCells: filteredCellIds.length,
      metrics: emptyMetrics,
      firstTimeHistory: emptyHistory,
      cellSummaries: [],
      overdueWeeks: [],
      evangelismParticipation: emptyEvangelismParticipation,
      evangelismHistory: emptyEvangelismHistory,
      hasError: true,
    };
  }

  const unfilteredVersions = versionResults.flatMap(
    (result) => (result.data ?? []) as RawReportVersion[],
  );
  const overdueWeeks = calculateOverdueCellWeeks(
    filteredCells.map((cell) => ({
      id: cell.id,
      startedOn: cell.started_on,
    })),
    unfilteredVersions.map((version) => ({
      cellId: reportCellByReportId.get(version.report_id) ?? "",
      meetingOn: version.meeting_on,
      submittedOn:
        reportCreatedOnByReportId.get(version.report_id) ?? version.meeting_on,
    })),
    month,
    today,
  ).map((week) => ({
    ...week,
    cellName:
      filteredCells.find((cell) => cell.id === week.cellId)?.name ??
      "Célula não informada",
  }));
  const selectedMonthSubmitterIds = Array.from(
    new Set(
      unfilteredVersions
        .filter((version) => version.meeting_on.slice(0, 7) === month)
        .map((version) => version.submitted_by),
    ),
  );
  const leadershipDirectoryResult =
    selectedMonthSubmitterIds.length > 0
      ? await supabase.rpc("get_accessible_leadership_directory")
      : { data: [] as RawLeadershipDirectoryEntry[], error: null };
  const leadershipNames = new Map(
    ((leadershipDirectoryResult.data ?? []) as RawLeadershipDirectoryEntry[]).map(
      (profile) => [profile.profile_id, profile.full_name],
    ),
  );
  submitters = selectedMonthSubmitterIds
    .map((profileId) => ({
      id: profileId,
      name: leadershipNames.get(profileId) ?? "Nome não informado",
    }))
    .sort((first, second) => first.name.localeCompare(second.name, "pt-BR"));
  selectedSubmitterProfileId = submitters.some(
    (submitter) => submitter.id === requestedFilters.submitterProfileId,
  )
    ? (requestedFilters.submitterProfileId ?? "")
    : "";
  directoryHasError = Boolean(leadershipDirectoryResult.error);
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
  const versionIdBatches = Array.from(
    { length: Math.ceil(versionIds.length / 200) },
    (_, index) => versionIds.slice(index * 200, index * 200 + 200),
  );
  const evangelismEntryResults = await Promise.all(
    versionIdBatches.map((batch) =>
      supabase
        .from("cell_report_evangelism_entries")
        .select(
          "id, report_version_id, cell_leadership_id, did_evangelize",
        )
        .in("report_version_id", batch),
    ),
  );

  if (evangelismEntryResults.some((result) => result.error)) {
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
      firstTimeHistory: emptyHistory,
      cellSummaries: [],
      overdueWeeks,
      evangelismParticipation: emptyEvangelismParticipation,
      evangelismHistory: emptyEvangelismHistory,
      hasError: true,
    };
  }

  const evangelismEntries = evangelismEntryResults.flatMap(
    (result) => (result.data ?? []) as RawEvangelismEntry[],
  );
  const positiveEntryIds = evangelismEntries
    .filter((entry) => entry.did_evangelize)
    .map((entry) => entry.id);
  const positiveEntryIdBatches = Array.from(
    { length: Math.ceil(positiveEntryIds.length / 200) },
    (_, index) => positiveEntryIds.slice(index * 200, index * 200 + 200),
  );
  const leadershipParticipantResults = await Promise.all(
    positiveEntryIdBatches.map((batch) =>
      supabase
        .from("cell_report_evangelism_leadership_participants")
        .select("evangelism_entry_id, cell_leadership_id")
        .in("evangelism_entry_id", batch),
    ),
  );

  if (leadershipParticipantResults.some((result) => result.error)) {
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
      firstTimeHistory: emptyHistory,
      cellSummaries: [],
      overdueWeeks,
      evangelismParticipation: emptyEvangelismParticipation,
      evangelismHistory: emptyEvangelismHistory,
      hasError: true,
    };
  }

  const leadershipParticipants = leadershipParticipantResults.flatMap(
    (result) => (result.data ?? []) as RawLeadershipParticipant[],
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
    hasError: directoryHasError,
  };
}
