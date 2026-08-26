import type { Metadata } from "next";
import Link from "next/link";
import { ClipboardCheck, UsersRound } from "lucide-react";
import { redirect } from "next/navigation";
import { buttonClassName } from "@/components/ui/button";
import { PageContainer } from "@/components/ui/page-container";
import { PageHeader } from "@/components/ui/page-header";
import {
  canAccessAdministration,
  getCurrentUser,
} from "@/lib/auth/current-user";
import { getSaoPauloDate } from "@/lib/dates/sao-paulo";
import { MemberRegistrationForm } from "./member-registration-form";

export const metadata: Metadata = {
  title: "Ficha de Membro | ICB Conecta",
  robots: { index: false, follow: false },
};

export default async function MemberRegistrationPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?erro=perfil");
  if (!user.isActive || user.mustChangePassword) redirect("/portal");

  const canViewRegistrations = canAccessAdministration(user);

  return (
    <main className="min-h-full bg-app-background py-6 sm:py-8">
      <PageContainer>
        <PageHeader
          eyebrow="Cadastro"
          title="Ficha de Membro"
          actions={
            canViewRegistrations ? (
              <Link
                href="/portal/ficha-de-membro/cadastros"
                className={buttonClassName({ variant: "secondary" })}
              >
                <UsersRound aria-hidden="true" className="size-5" />
                Consultar cadastros
              </Link>
            ) : null
          }
        />

        <div className="mt-7 grid gap-5 lg:grid-cols-[minmax(0,1fr)_17rem] lg:items-start">
          <section className="rounded-[var(--radius-surface)] border border-app-border bg-surface p-5 shadow-[var(--shadow-subtle)] sm:p-7">
            <MemberRegistrationForm
              currentUserId={user.id}
              currentDate={getSaoPauloDate()}
              defaultDisciplerName={user.fullName ?? ""}
            />
          </section>

          <aside className="lg:sticky lg:top-8">
            <div className="flex gap-3 rounded-2xl border border-theme-primary-border bg-theme-primary-subtle p-4 text-sm leading-6 text-app-secondary">
              <ClipboardCheck
                aria-hidden="true"
                className="mt-0.5 size-5 shrink-0 text-theme-primary-active"
              />
              <p><strong className="text-app-foreground">Antes de enviar:</strong> confira se os dados e a foto estão corretos.</p>
            </div>
          </aside>
        </div>
      </PageContainer>
    </main>
  );
}
