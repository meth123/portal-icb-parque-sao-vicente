import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, UserPlus } from "lucide-react";
import { buttonClassName } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageContainer } from "@/components/ui/page-container";
import { Surface } from "@/components/ui/surface";
import {
  canAccessAdministration,
  getCurrentUser,
} from "@/lib/auth/current-user";
import { getManagedCells } from "@/lib/data/cell-administration";
import { InviteForm } from "./invite-form";

export const metadata: Metadata = {
  title: "Cadastrar usuário | ICB Conecta",
  robots: { index: false, follow: false },
};

export default async function NewLeadershipInvitePage() {
  const user = await getCurrentUser();

  if (!user) redirect("/login?erro=perfil");
  if (!canAccessAdministration(user)) redirect("/portal");

  const overview = await getManagedCells();
  const activeCells = overview?.cells.filter((cell) => cell.isActive) ?? [];

  if (!overview || overview.hasError) {
    return (
      <main className="min-h-full bg-app-background py-6 sm:py-8">
        <PageContainer width="narrow">
          <EmptyState
            icon={<UserPlus className="size-8" />}
            title="Cadastro indisponível"
            description="Não foi possível carregar as células ativas."
            action={
              <Link
                href="/portal/admin"
                className={buttonClassName({ variant: "secondary" })}
              >
                Voltar à administração
              </Link>
            }
          />
        </PageContainer>
      </main>
    );
  }

  return (
    <main className="min-h-full bg-app-background py-6 sm:py-8">
      <PageContainer width="narrow">
        <div className="mb-4">
          <Link
            href="/portal/admin"
            className={buttonClassName({
              variant: "ghost",
              size: "compact",
            })}
          >
            <ArrowLeft aria-hidden="true" className="size-4" />
            Voltar
          </Link>
        </div>
        <Surface className="mx-auto max-w-xl p-5 sm:p-7">
          <InviteForm cells={activeCells} />
        </Surface>
      </PageContainer>
    </main>
  );
}
