import "server-only";

import { getCurrentUser } from "@/lib/auth/current-user";
import { createClient } from "@/lib/supabase/server";

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const datePattern = /^\d{4}-\d{2}-\d{2}$/;

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

export type CellReportHistoryFilters = {
  cellId?: string;
  dateFrom?: string;
  dateTo?: string;
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
};

export async function getCellReportHistory(
  filters: CellReportHistoryFilters = {},
) {
  const user = await getCurrentUser();

  if (!user?.isActive) {
    return null;
  }

  const supabase = await createClient();
  const accessibleReportCellsResult = await supabase
    .from("cell_reports")
    .select("cell_id")
    .limit(5000);

  if (accessibleReportCellsResult.error) {
    return {
      reports: [] as CellReportHistoryItem[],
      cells: [] as Array<{ id: string; name: string }>,
      hasError: true,
    };
  }

  const accessibleCellIds = [
    ...new Set(
      (accessibleReportCellsResult.data ?? []).map((report) => report.cell_id),
    ),
  ];
  const cellsResult =
    accessibleCellIds.length > 0
      ? await supabase
          .from("cells")
          .select("id, name")
          .in("id", accessibleCellIds)
          .order("name")
      : { data: [], error: null };

  if (cellsResult.error) {
    return {
      reports: [] as CellReportHistoryItem[],
      cells: [] as Array<{ id: string; name: string }>,
      hasError: true,
    };
  }

  const cells = (cellsResult.data ?? []).map((cell) => ({
    id: cell.id,
    name: cell.name,
  }));
  const allowedCellIds = new Set(cells.map((cell) => cell.id));
  let reportsQuery = supabase
    .from("cell_reports")
    .select("id, cell_id, meeting_on")
    .order("meeting_on", { ascending: false })
    .limit(100);

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
  const history = reports.flatMap((report) => {
    const version = versionsByReportId.get(report.id);

    if (!version) {
      return [];
    }

    return [
      {
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
      } satisfies CellReportHistoryItem,
    ];
  });

  return {
    reports: history,
    cells,
    hasError: false,
  };
}
