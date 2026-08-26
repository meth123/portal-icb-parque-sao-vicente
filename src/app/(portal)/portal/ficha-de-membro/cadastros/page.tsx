import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { redirect } from "next/navigation";
import { Alert } from "@/components/ui/alert";
import { buttonClassName } from "@/components/ui/button";
import { PageContainer } from "@/components/ui/page-container";
import { PageHeader } from "@/components/ui/page-header";
import { getCurrentUser } from "@/lib/auth/current-user";
import {
  canAccessMemberRegistrations,
  getMemberRegistrations,
} from "@/lib/data/member-registrations";
import { MemberRegistrationDirectory } from "./member-registration-directory";

export const metadata: Metadata = {
  title: "Membros cadastrados | ICB Conecta",
  robots: { index: false, follow: false },
};

export default async function MemberRegistrationsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?erro=perfil");
  if (!(await canAccessMemberRegistrations())) redirect("/portal");

  const result = await getMemberRegistrations();
  if (!result) redirect("/portal");

  return (
    <main className="min-h-full bg-app-background py-6 sm:py-8">
      <PageContainer width="wide">
        <PageHeader
          eyebrow="Acesso restrito"
          title="Membros cadastrados"
          description="Consulte as fichas enviadas e encontre rapidamente os dados necessários para o acompanhamento."
          actions={
            <Link
              href="/portal/ficha-de-membro"
              className={buttonClassName({ variant: "secondary" })}
            >
              <ArrowLeft aria-hidden="true" className="size-5" />
              Nova ficha
            </Link>
          }
        />

        <div className="mt-6 flex items-start gap-3 rounded-2xl border border-theme-primary-border bg-theme-primary-subtle p-4 text-sm leading-6 text-app-secondary">
          <ShieldCheck
            aria-hidden="true"
            className="mt-0.5 size-5 shrink-0 text-theme-primary-active"
          />
          <p>
            Estes dados são privados. Use-os somente para atividades da igreja e não compartilhe fora da equipe autorizada.
          </p>
        </div>

        {result.hasError ? (
          <Alert tone="danger" className="mt-6">
            Não foi possível carregar todos os cadastros. Atualize a página e tente novamente.
          </Alert>
        ) : (
          <MemberRegistrationDirectory registrations={result.registrations} />
        )}
      </PageContainer>
    </main>
  );
}
