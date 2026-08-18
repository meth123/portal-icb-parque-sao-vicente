import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus, UsersRound } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { buttonClassName } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageContainer } from "@/components/ui/page-container";
import { PageHeader } from "@/components/ui/page-header";
import {
  canManageCellAdministration,
  getCurrentUser,
} from "@/lib/auth/current-user";
import { getManagedCells } from "@/lib/data/cell-administration";
import { ManagedCellDirectory } from "./managed-cell-directory";

export const metadata: Metadata = {
  title: "Gerenciar células | ICB Conecta",
  robots: { index: false, follow: false },
};

type ManagedCellsPageProps = {
  searchParams: Promise<{ status?: string | string[] }>;
};

export default async function ManagedCellsPage({
  searchParams,
}: ManagedCellsPageProps) {
  const user = await getCurrentUser();

  if (!user) redirect("/login?erro=perfil");
  if (!canManageCellAdministration(user)) redirect("/portal");

  const [overview, resolvedSearchParams] = await Promise.all([
    getManagedCells(),
    searchParams,
  ]);

  if (!overview || overview.hasError) {
    return (
      <main className="min-h-full bg-app-background py-6 sm:py-8">
        <PageContainer width="narrow">
          <EmptyState
            icon={<UsersRound className="size-8" />}
            title="Células indisponíveis"
            description="Não foi possível carregar as células cadastradas."
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
      <PageContainer width="wide" className="space-y-6 sm:space-y-8">
        <PageHeader
          eyebrow="Gestão de células"
          title="Células"
          description="Atualize configurações e vínculos sem apagar o histórico."
          actions={
            <Link
              href="/portal/admin/celulas/nova"
              className={buttonClassName({ size: "compact" })}
            >
              <Plus aria-hidden="true" className="size-4" />
              Cadastrar célula
            </Link>
          }
        />

        {resolvedSearchParams.status === "atualizada" ? (
          <Alert tone="success">Célula atualizada com sucesso.</Alert>
        ) : null}

        {resolvedSearchParams.status === "desativada" ? (
          <Alert tone="success">
            Célula desativada. O histórico foi preservado.
          </Alert>
        ) : null}

        <ManagedCellDirectory cells={overview.cells} />
      </PageContainer>
    </main>
  );
}
