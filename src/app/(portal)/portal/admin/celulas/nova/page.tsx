import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  canManageCellAdministration,
  getCurrentUser,
} from "@/lib/auth/current-user";
import { getCellAdministrationOptions } from "@/lib/data/cell-administration";
import { CellForm } from "./cell-form";

export const metadata: Metadata = {
  title: "Cadastrar célula | ICB Conecta",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function NewCellPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login?erro=perfil");
  }

  if (!canManageCellAdministration(user)) {
    redirect("/portal");
  }

  const returnPath = "/portal/admin";

  const options = await getCellAdministrationOptions();

  if (!options || options.hasError) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-zinc-100 px-4 py-10 sm:px-6">
        <section className="w-full max-w-lg rounded-3xl border border-zinc-200 bg-white p-6 text-center shadow-sm sm:p-10">
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-950">
            Cadastro indisponível
          </h1>
          <p className="mt-4 leading-7 text-zinc-700">
            Não foi possível carregar Redes, localidades ou contas ativas.
            Tente novamente mais tarde.
          </p>
          <Link
            href={returnPath}
            className="mt-8 flex min-h-12 items-center justify-center rounded-xl border border-zinc-300 px-5 font-semibold text-zinc-900 hover:bg-zinc-100"
          >
            Voltar
          </Link>
        </section>
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
    <main className="min-h-screen bg-zinc-100 px-4 py-10 sm:px-6">
      <section className="mx-auto w-full max-w-4xl rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-10">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-zinc-600">
          Gestão de células
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-zinc-950 sm:text-4xl">
          Cadastrar célula
        </h1>
        <p className="mt-4 max-w-3xl leading-7 text-zinc-700">
          Este formulário cria uma célula ativa com classificação, encontro,
          localidade e liderança em uma única operação.
        </p>

        <CellForm
          cellTypes={options.cellTypes}
          neighborhoods={options.neighborhoods}
          leaders={options.leaders}
          defaultDate={defaultDate}
        />

        <Link
          href={returnPath}
          className="mt-6 flex min-h-12 w-full items-center justify-center rounded-xl border border-zinc-300 bg-white px-5 font-semibold text-zinc-900 hover:bg-zinc-100 sm:w-auto sm:min-w-52"
        >
          Cancelar e voltar
        </Link>
      </section>
    </main>
  );
}
