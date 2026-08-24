import { getChecklistResultsReport } from "@/lib/data/checklist-results";
import { createChecklistResultsPdf } from "@/lib/pdf/checklist-results-pdf";

function fileSafeName(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 70);
}

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const result = await getChecklistResultsReport({
    periodType: params.get("periodo") ?? undefined,
    month: params.get("mes") ?? undefined,
    week: params.get("semana") ?? undefined,
    networkCode: params.get("rede") ?? undefined,
  });

  if (!result) {
    return new Response("Acesso não autorizado.", {
      status: 403,
      headers: { "Cache-Control": "private, no-store" },
    });
  }

  if (result.hasError || !result.report) {
    return new Response("Resultados não encontrados.", {
      status: 404,
      headers: { "Cache-Control": "private, no-store" },
    });
  }

  if (!result.report.isComplete) {
    return new Response("O período ainda não está fechado.", {
      status: 409,
      headers: { "Cache-Control": "private, no-store" },
    });
  }

  const pdf = createChecklistResultsPdf(result.report);
  const period = fileSafeName(
    result.report.periodType === "monthly"
      ? result.filters.month
      : result.filters.week,
  );
  const network = fileSafeName(result.report.selectedNetworkCode ?? "todas");
  const fileName = `resultados-checklist-${period}-${network}.pdf`;

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
