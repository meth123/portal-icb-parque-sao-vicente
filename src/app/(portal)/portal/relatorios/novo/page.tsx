import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { buttonClassName } from "@/components/ui/button";
import { PageContainer } from "@/components/ui/page-container";
import { PageHeader } from "@/components/ui/page-header";
import { Surface } from "@/components/ui/surface";
import { getCurrentUser } from "@/lib/auth/current-user";
import { getCellReportDraftKey } from "@/lib/cell-report-draft";
import { getCellReportFormContext } from "@/lib/data/cell-reports";
import { ReportForm } from "./report-form";
import { ReportThemeIntroduction } from "./components/report-theme-introduction";

export const metadata: Metadata = {
  title: "Preencher Ficha de Organização | ICB Conecta",
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
    <main>
      <PageContainer className="py-6 sm:py-8 lg:py-10">
        <PageHeader
          title="Ficha de Organização"
          description={reportContext.cellName}
        />

        <ReportThemeIntroduction priority />

        <Surface className="mt-5 border-0 bg-transparent p-0 shadow-none sm:border sm:bg-surface sm:p-7 sm:shadow-[var(--shadow-subtle)] lg:p-8">
          <ReportForm
            cellId={reportContext.cellId}
            defaultDate={defaultDate}
            draftKey={getCellReportDraftKey(user.id, reportContext.cellId)}
            leader={reportContext.leader}
            viceLeaders={reportContext.viceLeaders}
            leadership={reportContext.leadership}
          />
        </Surface>

        <Link
          href="/portal"
          className={buttonClassName({
            variant: "ghost",
            className: "mt-4 w-full sm:w-auto",
          })}
        >
          Cancelar e voltar
        </Link>
      </PageContainer>
    </main>
  );
}
