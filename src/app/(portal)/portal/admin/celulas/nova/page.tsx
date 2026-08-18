import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, HousePlus } from "lucide-react";
import { buttonClassName } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageContainer } from "@/components/ui/page-container";
import { PageHeader } from "@/components/ui/page-header";
import { Surface } from "@/components/ui/surface";
import {
  canManageCellAdministration,
  getCurrentUser,
} from "@/lib/auth/current-user";
import { getCellAdministrationOptions } from "@/lib/data/cell-administration";
import { CellForm } from "./cell-form";

export const metadata: Metadata = {
  title: "Cadastrar célula | ICB Conecta",
  robots: { index: false, follow: false },
};

export default async function NewCellPage() {
  const user = await getCurrentUser();

  if (!user) redirect("/login?erro=perfil");
  if (!canManageCellAdministration(user)) redirect("/portal");

  const options = await getCellAdministrationOptions();

  if (!options || options.hasError) {
    return (
      <main className="min-h-full bg-app-background py-6 sm:py-8">
        <PageContainer width="narrow">
          <EmptyState
            icon={<HousePlus className="size-8" />}
            title="Cadastro indisponível"
            description="Não foi possível carregar Redes, localidades ou contas ativas. Tente novamente mais tarde."
            action={
              <Link
                href="/portal/admin/celulas"
                className={buttonClassName({ variant: "secondary" })}
              >
                Voltar às células
              </Link>
            }
          />
        </PageContainer>
      </main>
    );
  }

  const defaultDate = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

  return (
    <main className="min-h-full bg-app-background py-6 sm:py-8">
      <PageContainer width="default">
        <PageHeader
          eyebrow="Gestão de células"
          title="Cadastrar célula"
          description="Crie a célula, defina o encontro e escolha a liderança em uma única operação."
          actions={
            <Link
              href="/portal/admin/celulas"
              className={buttonClassName({
                variant: "secondary",
                size: "compact",
              })}
            >
              <ArrowLeft aria-hidden="true" className="size-4" />
              Voltar
            </Link>
          }
        />

        <Surface className="mt-6 p-5 sm:p-7">
          <CellForm
            cellTypes={options.cellTypes}
            neighborhoods={options.neighborhoods}
            leaders={options.leaders}
            defaultDate={defaultDate}
          />
        </Surface>
      </PageContainer>
    </main>
  );
}
