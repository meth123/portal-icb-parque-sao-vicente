import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  canManageCellAdministration,
  getCurrentUser,
} from "@/lib/auth/current-user";
import { getManagedCell } from "@/lib/data/cell-administration";
import { EditCellLeadershipForm } from "./edit-cell-leadership-form";
import { DeactivateCellForm } from "./deactivate-cell-form";

export const metadata: Metadata = {
  title: "Editar célula | Portal ICB Parque São Vicente",
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
      <main className="flex min-h-screen items-center justify-center bg-zinc-100 px-4 py-10">
        <section className="w-full max-w-lg rounded-3xl border border-zinc-200 bg-white p-6 text-center shadow-sm sm:p-10">
          <h1 className="text-3xl font-semibold text-zinc-950">
            Edição indisponível
          </h1>
          <p className="mt-4 leading-7 text-zinc-700">
            Não foi possível carregar os dados desta célula.
          </p>
        </section>
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

  return (
    <main className="min-h-screen bg-zinc-100 px-4 py-10 sm:px-6">
      <section className="mx-auto w-full max-w-4xl rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-10">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-zinc-600">
          Gestão de células
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-zinc-950 sm:text-4xl">
          Editar {data.cell.name}
        </h1>
        <p className="mt-4 max-w-3xl leading-7 text-zinc-700">
          A célula continuará com um Líder. Vice-líderes são opcionais e os
          vínculos anteriores permanecerão no histórico.
        </p>

        <EditCellLeadershipForm
          cell={data.cell}
          cellTypes={data.cellTypes}
          neighborhoods={data.neighborhoods}
          leaders={data.leaders}
          defaultDate={defaultDate}
        />

        <DeactivateCellForm
          cellId={data.cell.id}
          cellName={data.cell.name}
          defaultDate={defaultDate}
          minimumDate={data.cell.startedOn ?? undefined}
        />

        <Link
          href="/portal/admin/celulas"
          className="mt-6 flex min-h-12 w-full items-center justify-center rounded-xl border border-zinc-300 px-5 font-semibold text-zinc-900 hover:bg-zinc-100 sm:w-auto sm:min-w-48"
        >
          Cancelar e voltar
        </Link>
      </section>
    </main>
  );
}
