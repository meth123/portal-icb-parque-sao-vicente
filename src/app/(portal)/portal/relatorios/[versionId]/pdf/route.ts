import { getCellReportVersionDetail } from "@/lib/data/cell-report-detail";
import { createCellReportPdf } from "@/lib/pdf/cell-report-pdf";

function fileSafeName(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ versionId: string }> },
) {
  const { versionId } = await params;
  const detail = await getCellReportVersionDetail(versionId);

  if (!detail) {
    return new Response("Ficha não encontrada.", {
      status: 404,
      headers: {
        "Cache-Control": "private, no-store",
      },
    });
  }

  const pdf = createCellReportPdf(detail);
  const cellName = fileSafeName(detail.cellName) || "celula";
  const fileName = `ficha-organizacao-${cellName}-${detail.meetingOn}-v${detail.versionNumber}.pdf`;

  return new Response(pdf, {
    status: 200,
    headers: {
      "Cache-Control": "private, no-store",
      "Content-Disposition": `attachment; filename="${fileName}"`,
      "Content-Length": String(pdf.byteLength),
      "Content-Type": "application/pdf",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
