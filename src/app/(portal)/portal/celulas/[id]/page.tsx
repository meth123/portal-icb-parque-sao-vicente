import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import { getCellDetails } from "@/lib/data/organization";

export const metadata: Metadata = {
  title: "Detalhes da célula | Portal ICB Parque São Vicente",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function CellDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login?erro=perfil");
  }

  if (!user.isActive) {
    redirect("/portal");
  }

  const { id } = await params;
  const cell = await getCellDetails(id);

  if (!cell) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-zinc-100 px-4 py-10 sm:px-6">
      <div className="mx-auto w-full max-w-3xl">
        <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-10">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-zinc-600">
                Célula
              </p>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight text-zinc-950 sm:text-4xl">
                {cell.name}
              </h1>
            </div>
            <span className="rounded-full border border-zinc-300 bg-zinc-100 px-3 py-1 text-sm text-zinc-700">
              {cell.isActive ? "Ativa" : "Inativa"}
            </span>
          </div>

          {cell.hasError ? (
            <p
              role="alert"
              className="mt-8 rounded-xl border border-red-200 bg-red-50 px-4 py-4 text-red-800"
            >
              Parte dos dados não pôde ser carregada. Tente novamente antes de
              considerar estas informações completas.
            </p>
          ) : null}

          <dl className="mt-8 grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl bg-zinc-100 p-4">
              <dt className="font-semibold text-zinc-950">Rede e tipo</dt>
              <dd className="mt-2 text-zinc-700">{cell.classification}</dd>
            </div>
            <div className="rounded-2xl bg-zinc-100 p-4">
              <dt className="font-semibold text-zinc-950">Encontro</dt>
              <dd className="mt-2 capitalize text-zinc-700">{cell.schedule}</dd>
            </div>
            <div className="rounded-2xl bg-zinc-100 p-4">
              <dt className="font-semibold text-zinc-950">Localidade</dt>
              <dd className="mt-2 text-zinc-700">{cell.location}</dd>
            </div>
            <div className="rounded-2xl bg-zinc-100 p-4">
              <dt className="font-semibold text-zinc-950">Início registrado</dt>
              <dd className="mt-2 text-zinc-700">
                {cell.startedOn ?? "Não informado"}
              </dd>
            </div>
          </dl>

          <section className="mt-8 rounded-2xl border border-zinc-200 p-5 sm:p-6">
            <h2 className="text-xl font-semibold text-zinc-950">Liderança</h2>
            {cell.leaderships.length > 0 ? (
              <ul className="mt-4 divide-y divide-zinc-200">
                {cell.leaderships.map((leadership) => (
                  <li
                    key={leadership.profileId}
                    className="flex flex-col gap-1 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
                  >
                    <div>
                      <p className="font-semibold text-zinc-950">
                        {leadership.name}
                      </p>
                      <p className="mt-1 text-sm text-zinc-600">
                        Desde {leadership.startsOn}
                      </p>
                    </div>
                    <span className="text-sm font-medium text-zinc-700">
                      {leadership.role}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-4 text-zinc-700">
                Nenhuma liderança vigente encontrada.
              </p>
            )}
          </section>

          <Link
            href="/portal/organizacao"
            className="mt-8 flex min-h-12 w-full items-center justify-center rounded-xl border border-zinc-300 bg-white px-5 text-base font-semibold text-zinc-900 transition-colors hover:bg-zinc-100 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-zinc-900 sm:w-auto sm:min-w-52"
          >
            Voltar às células
          </Link>
        </section>
      </div>
    </main>
  );
}
