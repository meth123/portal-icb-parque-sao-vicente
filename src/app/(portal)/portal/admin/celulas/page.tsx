import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  canManageCellAdministration,
  getCurrentUser,
} from "@/lib/auth/current-user";
import { getManagedCells } from "@/lib/data/cell-administration";
import { ManagedCellDirectory } from "./managed-cell-directory";

export const metadata: Metadata = {
  title: "Gerenciar células | Portal ICB Parque São Vicente",
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
  const returnPath = "/portal/admin";

  if (!overview || overview.hasError) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-zinc-100 px-4 py-10">
        <section className="w-full max-w-lg rounded-3xl border border-zinc-200 bg-white p-6 text-center shadow-sm sm:p-10">
          <h1 className="text-3xl font-semibold text-zinc-950">
            Células indisponíveis
          </h1>
          <p className="mt-4 leading-7 text-zinc-700">
            Não foi possível carregar as células ativas.
          </p>
          <Link
            href={returnPath}
            className="mt-7 flex min-h-12 items-center justify-center rounded-xl border border-zinc-300 px-5 font-semibold text-zinc-900"
          >
            Voltar
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-100 px-4 py-10 sm:px-6">
      <section className="mx-auto w-full max-w-5xl rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-10">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-zinc-600">
          Gestão de células
        </p>
        <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-zinc-950 sm:text-4xl">
              Células
            </h1>
            <p className="mt-3 max-w-2xl leading-7 text-zinc-700">
              Atualize o nome e os vínculos atuais sem apagar o histórico.
            </p>
          </div>
          <Link
            href="/portal/admin/celulas/nova"
            className="flex min-h-12 items-center justify-center rounded-xl bg-zinc-950 px-5 font-semibold text-white hover:bg-zinc-800"
          >
            Cadastrar célula
          </Link>
        </div>

        {resolvedSearchParams.status === "atualizada" ? (
          <p
            role="status"
            className="mt-6 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-green-900"
          >
            Célula atualizada com sucesso.
          </p>
        ) : null}

        <ManagedCellDirectory cells={overview.cells} />

        <Link
          href={returnPath}
          className="mt-8 flex min-h-12 w-full items-center justify-center rounded-xl border border-zinc-300 px-5 font-semibold text-zinc-900 hover:bg-zinc-100 sm:w-auto sm:min-w-48"
        >
          Voltar
        </Link>
      </section>
    </main>
  );
}
