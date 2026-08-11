const cellReportDraftPrefix = "portal-icb:cell-report-draft:v1";

export function getCellReportDraftKey(userId: string, cellId: string) {
  return `${cellReportDraftPrefix}:${userId}:${cellId}`;
}
