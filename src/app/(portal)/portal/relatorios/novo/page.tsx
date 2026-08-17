import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { buttonClassName } from "@/components/ui/button";
import { PageContainer } from "@/components/ui/page-container";
import { PageHeader } from "@/components/ui/page-header";
import { Surface } from "@/components/ui/surface";
import { ThemeArtwork } from "@/components/ui/theme-artwork";
import { getCurrentUser } from "@/lib/auth/current-user";
import { getCellReportDraftKey } from "@/lib/cell-report-draft";
import { getCellReportFormContext } from "@/lib/data/cell-reports";
import { ReportForm } from "./report-form";

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
          eyebrow="Relatórios"
          title="Ficha de Organização"
          description="Registre a reunião em quatro etapas."
        />

        <ThemeArtwork
          decorative
          priority
          className="mt-6 min-h-24 sm:min-h-32"
          imageClassName="scale-[1.35] object-center lg:scale-100"
          sizes="(max-width: 1024px) 100vw, 896px"
        />

        <Surface className="mt-5 p-4 sm:p-7 lg:p-8">
        <ReportForm
          cellId={reportContext.cellId}
          cellName={reportContext.cellName}
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
