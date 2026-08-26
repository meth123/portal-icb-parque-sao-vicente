import "server-only";

import {
  canAccessPastoralDashboard,
  getCurrentUser,
} from "@/lib/auth/current-user";
import { createClient } from "@/lib/supabase/server";

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const datePattern = /^\d{4}-\d{2}-\d{2}$/;
export const CELL_REPORT_HISTORY_LIMIT = 5;

type RawReport = {
  id: string;
  cell_id: string;
  meeting_on: string;
};

type RawVersion = {
  id: string;
  report_id: string;
  version_number: number;
  meeting_format: "in_person" | "online";
  members_count: number;
  guests_count: number;
  first_time_guests_count: number;
  submitted_at: string;
};

type RawClassification = {
  cell_id: string;
  cell_type_id: string;
  starts_on: string;
  ends_on: string | null;
};

export type CellReportHistoryFilters = {
  cellId?: string;
  dateFrom?: string;
  dateTo?: string;
  networkId?: string;
  cellTypeId?: string;
};

export type CellReportHistoryItem = {
  versionId: string;
  reportId: string;
  cellId: string;
  cellName: string;
  meetingOn: string;
  versionNumber: number;
  meetingFormat: "in_person" | "online";
  membersCount: number;
  guestsCount: number;
  firstTimeGuestsCount: number;
  submittedAt: string;
  networkId: string | null;
  cellTypeId: string | null;
};

export async function getCellReportHistory(
  filters: CellReportHistoryFilters = {},
) {
  const user = await getCurrentUser();

  if (!user?.isActive) {
    return null;
  }

  const supabase = await createClient();
  const canUseOrganizationFilters = canAccessPastoralDashboard(user);
  const accessibleReportCellsResult = await supabase
    .from("cell_reports")
    .select("cell_id")
    .limit(5000);

  if (accessibleReportCellsResult.error) {
    return {
      reports: [] as CellReportHistoryItem[],
      cells: [] as Array<{ id: string; name: string }>,
      networks: [] as Array<{ id: string; name: string }>,
      cellTypes: [] as Array<{ id: string; name: string; networkId: string }>,
      canUseOrganizationFilters,
      hasError: true,
    };
  }

  const accessibleCellIds = [
    ...new Set(
      (accessibleReportCellsResult.data ?? []).map((report) => report.cell_id),
    ),
  ];
  const [cellsResult, classificationsResult] = await Promise.all([
    accessibleCellIds.length > 0
      ? await supabase
          .from("cells")
          .select("id, name")
          .in("id", accessibleCellIds)
          .order("name")
      : { data: [], error: null },
    canUseOrganizationFilters && accessibleCellIds.length > 0
      ? supabase
          .from("cell_classifications")
          .select("cell_id, cell_type_id, starts_on, ends_on")
          .in("cell_id", accessibleCellIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (cellsResult.error || classificationsResult.error) {
    return {
      reports: [] as CellReportHistoryItem[],
      cells: [] as Array<{ id: string; name: string }>,
      networks: [] as Array<{ id: string; name: string }>,
      cellTypes: [] as Array<{ id: string; name: string; networkId: string }>,
      canUseOrganizationFilters,
      hasError: true,
    };
  }

  const cells = (cellsResult.data ?? []).map((cell) => ({
    id: cell.id,
    name: cell.name,
  }));
  const allowedCellIds = new Set(cells.map((cell) => cell.id));
  const classifications = (classificationsResult.data ?? []) as RawClassification[];
  const cellTypesResult =
    canUseOrganizationFilters
      ? await supabase
          .from("cell_types")
          .select("id, name, network_id")
          .eq("is_active", true)
          .order("name")
      : { data: [], error: null };
  const networksResult =
    canUseOrganizationFilters
      ? await supabase
          .from("networks")
          .select("id, name, code")
          .eq("is_active", true)
          .order("name")
      : { data: [], error: null };

  if (cellTypesResult.error || networksResult.error) {
    return {
      reports: [] as CellReportHistoryItem[],
      cells,
      networks: [] as Array<{ id: string; name: string }>,
      cellTypes: [] as Array<{ id: string; name: string; networkId: string }>,
      canUseOrganizationFilters,
      hasError: true,
    };
  }

  const cellTypes = (cellTypesResult.data ?? []).map((cellType) => ({
    id: cellType.id,
    name: cellType.name,
    networkId: cellType.network_id,
  }));
  const networks = (networksResult.data ?? []).map((network) => ({
    id: network.id,
    name:
      network.code === "RJ"
        ? "Rede de Jovens"
        : network.code === "H.M"
          ? "Rede H.M"
          : network.name,
  }));
  const allowedNetworkIds = new Set(networks.map((network) => network.id));
  const allowedCellTypeIds = new Set(cellTypes.map((cellType) => cellType.id));
  let reportsQuery = supabase
    .from("cell_reports")
    .select("id, cell_id, meeting_on")
    .order("meeting_on", { ascending: false })
    .limit(CELL_REPORT_HISTORY_LIMIT);

  if (filters.cellId && uuidPattern.test(filters.cellId) && allowedCellIds.has(filters.cellId)) {
    reportsQuery = reportsQuery.eq("cell_id", filters.cellId);
  }

  if (filters.dateFrom && datePattern.test(filters.dateFrom)) {
    reportsQuery = reportsQuery.gte("meeting_on", filters.dateFrom);
  }

  if (filters.dateTo && datePattern.test(filters.dateTo)) {
    reportsQuery = reportsQuery.lte("meeting_on", filters.dateTo);
  }

  const reportsResult = await reportsQuery;
  const reports = (reportsResult.data ?? []) as RawReport[];

  if (reportsResult.error || reports.length === 0) {
    return {
      reports: [] as CellReportHistoryItem[],
      cells,
      networks,
      cellTypes,
      canUseOrganizationFilters,
      hasError: Boolean(reportsResult.error),
    };
  }

  const versionsResult = await supabase
    .from("cell_report_versions")
    .select(
      "id, report_id, version_number, meeting_format, members_count, guests_count, first_time_guests_count, submitted_at",
    )
    .in(
      "report_id",
      reports.map((report) => report.id),
    )
    .eq("is_current", true);

  if (versionsResult.error) {
    return {
      reports: [] as CellReportHistoryItem[],
      cells,
      networks,
      cellTypes,
      canUseOrganizationFilters,
      hasError: true,
    };
  }

  const cellNames = new Map(cells.map((cell) => [cell.id, cell.name]));
  const versionsByReportId = new Map(
    ((versionsResult.data ?? []) as RawVersion[]).map((version) => [
      version.report_id,
      version,
    ]),
  );
  const cellTypeById = new Map(cellTypes.map((cellType) => [cellType.id, cellType]));
  const history = reports.flatMap((report) => {
    const version = versionsByReportId.get(report.id);

    if (!version) {
      return [];
    }

    const classification = classifications.find(
      (item) =>
        item.cell_id === report.cell_id &&
        item.starts_on <= report.meeting_on &&
        (!item.ends_on || item.ends_on > report.meeting_on),
    );
    const cellType = classification
      ? cellTypeById.get(classification.cell_type_id)
      : undefined;
    const item = {
        versionId: version.id,
        reportId: report.id,
        cellId: report.cell_id,
        cellName: cellNames.get(report.cell_id) ?? "Célula",
        meetingOn: report.meeting_on,
        versionNumber: version.version_number,
        meetingFormat: version.meeting_format,
        membersCount: version.members_count,
        guestsCount: version.guests_count,
        firstTimeGuestsCount: version.first_time_guests_count,
        submittedAt: version.submitted_at,
        networkId: cellType?.networkId ?? null,
        cellTypeId: cellType?.id ?? null,
      } satisfies CellReportHistoryItem;

    if (
      canUseOrganizationFilters &&
      filters.networkId &&
      allowedNetworkIds.has(filters.networkId) &&
      item.networkId !== filters.networkId
    ) {
      return [];
    }

    if (
      canUseOrganizationFilters &&
      filters.cellTypeId &&
      allowedCellTypeIds.has(filters.cellTypeId) &&
      item.cellTypeId !== filters.cellTypeId
    ) {
      return [];
    }

    return [item];
  });

  return {
    reports: history,
    cells,
    networks,
    cellTypes,
    canUseOrganizationFilters,
    hasError: false,
  };
}
