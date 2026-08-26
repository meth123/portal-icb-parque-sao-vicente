import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound, redirect } from "next/navigation";
import { buttonClassName } from "@/components/ui/button";
import { PageContainer } from "@/components/ui/page-container";
import { PageHeader } from "@/components/ui/page-header";
import { getCurrentUser } from "@/lib/auth/current-user";
import {
  canAccessMemberRegistrations,
  getMemberRegistration,
} from "@/lib/data/member-registrations";
import { getSaoPauloDate } from "@/lib/dates/sao-paulo";
import { MemberRegistrationEditForm } from "./member-registration-edit-form";

export const metadata: Metadata = {
  title: "Editar ficha de membro | ICB Conecta",
  robots: { index: false, follow: false },
};

export default async function EditMemberRegistrationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?erro=perfil");
  if (!(await canAccessMemberRegistrations())) redirect("/portal");

  const { id } = await params;
  const registration = await getMemberRegistration(id);
  if (!registration) notFound();

  return (
    <main className="min-h-full bg-app-background py-6 sm:py-8">
      <PageContainer>
        <PageHeader
          eyebrow="Membros cadastrados"
          title={`Editar ${registration.fullName}`}
          actions={
            <Link href="/portal/ficha-de-membro/cadastros" className={buttonClassName({ variant: "secondary" })}>
              <ArrowLeft aria-hidden="true" className="size-5" />
              Voltar
            </Link>
          }
        />
        <section className="mt-7 rounded-[var(--radius-surface)] border border-app-border bg-surface p-5 shadow-[var(--shadow-subtle)] sm:p-7">
          <MemberRegistrationEditForm registration={registration} currentUserId={user.id} currentDate={getSaoPauloDate()} />
        </section>
      </PageContainer>
    </main>
  );
}
