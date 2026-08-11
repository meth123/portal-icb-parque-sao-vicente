import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import { getCellReportDraftKey } from "@/lib/cell-report-draft";
import { getCellReportFormContext } from "@/lib/data/cell-reports";
import { ReportForm } from "./report-form";

export const metadata: Metadata = {
  title: "Preencher Ficha de Organização | Portal ICB Parque São Vicente",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function NewCellReportPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login?erro=perfil");
  }

  if (!user.isActive) {
    redirect("/portal");
  }

  const reportContext = await getCellReportFormContext();

  if (!reportContext) {
    redirect("/portal");
  }

  const defaultDate = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

  return (
    <main className="min-h-screen bg-zinc-100 px-4 py-10 sm:px-6">
      <section className="mx-auto w-full max-w-4xl rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-10">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-zinc-600">
          Relatórios · Fase 5
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-zinc-950 sm:text-4xl">
          Ficha de Organização
        </h1>
        <p className="mt-4 max-w-3xl leading-7 text-zinc-700">
          Preencha a organização da célula e depois o Relatório de Evangelismo.
          Se já existir uma Ficha para a mesma célula e data, este envio será
          registrado como uma correção e o histórico anterior será preservado.
        </p>

        <ReportForm
          cellId={reportContext.cellId}
          cellName={reportContext.cellName}
          defaultDate={defaultDate}
          draftKey={getCellReportDraftKey(user.id, reportContext.cellId)}
          leader={reportContext.leader}
          viceLeaders={reportContext.viceLeaders}
          leadership={reportContext.leadership}
        />

        <Link
          href="/portal"
          className="mt-6 flex min-h-12 w-full items-center justify-center rounded-xl border border-zinc-300 bg-white px-5 font-semibold text-zinc-900 hover:bg-zinc-100 sm:w-auto sm:min-w-52"
        >
          Cancelar e voltar
        </Link>
      </section>
    </main>
  );
}
