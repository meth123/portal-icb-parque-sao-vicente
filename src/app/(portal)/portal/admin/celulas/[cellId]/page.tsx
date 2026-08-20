import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, House } from "lucide-react";
import { buttonClassName } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageContainer } from "@/components/ui/page-container";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { Surface } from "@/components/ui/surface";
import {
  canManageCellAdministration,
  getCurrentUser,
} from "@/lib/auth/current-user";
import { getManagedCell } from "@/lib/data/cell-administration";
import { DeactivateCellForm } from "./deactivate-cell-form";
import { CellHistoryDatesForm } from "./cell-history-dates-form";
import { EditCellLeadershipForm } from "./edit-cell-leadership-form";

export const metadata: Metadata = {
  title: "Editar célula | ICB Conecta",
  robots: { index: false, follow: false },
};

export default async function EditManagedCellPage({
  params,
}: PageProps<"/portal/admin/celulas/[cellId]">) {
  const user = await getCurrentUser();

  if (!user) redirect("/login?erro=perfil");
  if (!canManageCellAdministration(user)) redirect("/portal");

  const { cellId } = await params;
  const data = await getManagedCell(cellId);

  if (!data || data.hasError) {
    return (
      <main className="min-h-full bg-app-background py-6 sm:py-8">
        <PageContainer width="narrow">
          <EmptyState
            icon={<House className="size-8" />}
            title="Edição indisponível"
            description="Não foi possível carregar os dados desta célula."
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

  if (!data.cell) notFound();

  const defaultDate = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  const minimumDate = data.cell.isActive
    ? (data.cell.startedOn ?? defaultDate)
    : data.cell.endedOn
      ? (() => {
          const endedOn = new Date(`${data.cell.endedOn}T12:00:00Z`);
          endedOn.setUTCDate(endedOn.getUTCDate() + 1);
          return endedOn.toISOString().slice(0, 10);
        })()
      : defaultDate;

  return (
    <main className="min-h-full bg-app-background py-6 sm:py-8">
      <PageContainer width="default">
        <PageHeader
          eyebrow="Gestão de células"
          title={`${data.cell.isActive ? "Editar" : "Reativar"} ${data.cell.name}`}
          description={
            data.cell.isActive
              ? "Atualize a configuração atual sem apagar os vínculos anteriores."
              : "Inicie um novo período preservando todo o histórico anterior."
          }
          actions={
            <div className="flex flex-wrap items-center gap-3">
              <StatusBadge tone={data.cell.isActive ? "success" : "neutral"}>
                {data.cell.isActive ? "Ativa" : "Desativada"}
              </StatusBadge>
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
            </div>
          }
        />

        <Surface className="mt-6 p-5 sm:p-7">
          <CellHistoryDatesForm
            cellId={data.cell.id}
            startedOn={data.cell.startedOn ?? defaultDate}
            reportingStartsOn={data.cell.reportingStartsOn}
            maximumDate={defaultDate}
          />
        </Surface>

        <Surface className="mt-6 p-5 sm:p-7">
          <EditCellLeadershipForm
            cell={data.cell}
            cellTypes={data.cellTypes}
            neighborhoods={data.neighborhoods}
            leaders={data.leaders}
            defaultDate={defaultDate}
            minimumDate={minimumDate}
          />
        </Surface>

        {data.cell.isActive ? (
          <DeactivateCellForm
            cellId={data.cell.id}
            cellName={data.cell.name}
            defaultDate={defaultDate}
            minimumDate={data.cell.startedOn ?? undefined}
          />
        ) : null}
      </PageContainer>
    </main>
  );
}
