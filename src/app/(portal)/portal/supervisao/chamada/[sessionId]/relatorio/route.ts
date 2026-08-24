import { getSupervisionAttendanceSession } from "@/lib/data/supervision-attendance";
import { createSupervisionAttendancePdf } from "@/lib/pdf/supervision-attendance-pdf";
import { supervisionNetworkLabel } from "@/lib/supervision-attendance";

type SupervisionAttendanceReportRouteProps = {
  params: Promise<{ sessionId: string }>;
};

export async function GET(
  _request: Request,
  { params }: SupervisionAttendanceReportRouteProps,
) {
  const { sessionId } = await params;
  const result = await getSupervisionAttendanceSession(sessionId);

  if (!result) {
    return new Response("Acesso não autorizado.", {
      status: 403,
      headers: { "Cache-Control": "private, no-store" },
    });
  }

  if (result.hasError || !result.session) {
    return new Response("Chamada não encontrada.", {
      status: 404,
      headers: { "Cache-Control": "private, no-store" },
    });
  }

  if (result.session.status !== "finalized") {
    return new Response("A chamada ainda não foi finalizada.", {
      status: 409,
      headers: { "Cache-Control": "private, no-store" },
    });
  }

  const pdf = createSupervisionAttendancePdf(result.session);
  const network = supervisionNetworkLabel(result.session.networkCode).toLowerCase();
  const fileName = `chamada-supervisao-${network}-${result.session.sessionOn}.pdf`;

  return new Response(pdf, {
    headers: {
      "Cache-Control": "private, no-store",
      "Content-Disposition": `attachment; filename="${fileName}"`,
      "Content-Length": String(pdf.byteLength),
      "Content-Type": "application/pdf",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
