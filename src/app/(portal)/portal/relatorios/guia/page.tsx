import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { redirect } from "next/navigation";
import { ReportTutorialGuide } from "@/app/(portal)/portal/report-tutorial";
import { buttonClassName } from "@/components/ui/button";
import { PageContainer } from "@/components/ui/page-container";
import { PageHeader } from "@/components/ui/page-header";
import { getCurrentUser } from "@/lib/auth/current-user";

export const metadata: Metadata = {
  title: "Guia da Ficha de Organização | ICB Conecta",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function ReportGuidePage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login?erro=perfil");
  }

  if (!user.isActive) {
    redirect("/portal");
  }

  return (
    <main>
      <PageContainer width="wide" className="py-6 sm:py-8 lg:py-10">
        <PageHeader
          title="Como preencher a Ficha"
          description="Um guia prático para registrar tudo com clareza e sem retrabalho."
        />

        <ReportTutorialGuide />

        <Link
          href="/portal"
          className={buttonClassName({
            variant: "secondary",
            className: "mt-5 w-full sm:w-auto",
          })}
        >
          <ArrowLeft aria-hidden="true" className="h-4 w-4" />
          Voltar ao início
        </Link>
      </PageContainer>
    </main>
  );
}
