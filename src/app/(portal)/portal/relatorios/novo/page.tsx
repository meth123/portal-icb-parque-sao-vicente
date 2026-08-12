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
    <main className="min-h-screen bg-zinc-100 px-3 py-6 sm:px-6 sm:py-10">
      <section className="mx-auto w-full max-w-4xl rounded-3xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-10">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-zinc-600">
          Relatórios · Fase 5
        </p>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight text-zinc-950 sm:text-4xl">
          Ficha de Organização
        </h1>
        <blockquote className="mt-4 border-l-4 border-zinc-300 pl-4 text-zinc-700">
          <p className="italic leading-7">
            “Tudo, porém, seja feito com decência e ordem.”
          </p>
          <cite className="mt-1 block text-sm not-italic text-zinc-600">
            I Co 14:40
          </cite>
        </blockquote>

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
