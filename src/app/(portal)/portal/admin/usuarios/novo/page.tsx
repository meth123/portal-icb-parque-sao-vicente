import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { buttonClassName } from "@/components/ui/button";
import { PageContainer } from "@/components/ui/page-container";
import { Surface } from "@/components/ui/surface";
import {
  canAccessAdministration,
  getCurrentUser,
} from "@/lib/auth/current-user";
import { getManagedCells } from "@/lib/data/cell-administration";
import { getSaoPauloDate } from "@/lib/dates/sao-paulo";
import { QuickUserForm } from "./quick-user-form";

export const metadata: Metadata = {
  title: "Cadastrar usuário | ICB Conecta",
  robots: { index: false, follow: false },
};

export default async function NewUserPage() {
  const user = await getCurrentUser();

  if (!user) redirect("/login?erro=perfil");
  if (!canAccessAdministration(user)) redirect("/portal");

  const overview = await getManagedCells();
  const leadershipLinkingAvailable = Boolean(overview && !overview.hasError);
  const activeCells = leadershipLinkingAvailable
    ? (overview?.cells.filter((cell) => cell.isActive) ?? [])
    : [];

  return (
    <main className="min-h-full bg-app-background py-6 sm:py-8">
      <PageContainer width="narrow">
        <div className="mb-4">
          <Link
            href="/portal/admin"
            className={buttonClassName({ variant: "ghost", size: "compact" })}
          >
            <ArrowLeft aria-hidden="true" className="size-4" />
            Voltar
          </Link>
        </div>
        <Surface className="mx-auto max-w-xl p-5 sm:p-7">
          <QuickUserForm
            cells={activeCells}
            currentDate={getSaoPauloDate()}
            leadershipLinkingAvailable={leadershipLinkingAvailable}
          />
        </Surface>
      </PageContainer>
    </main>
  );
}
