const cellReportDraftPrefix = "portal-icb:cell-report-draft:v1";

export function getCellReportDraftKey(userId: string, cellId: string) {
  return `${cellReportDraftPrefix}:${userId}:${cellId}`;
}

export function getCellReportCorrectionDraftKey(
  userId: string,
  cellId: string,
  sourceVersionId: string,
) {
  return `${getCellReportDraftKey(userId, cellId)}:correction:${sourceVersionId}`;
}
