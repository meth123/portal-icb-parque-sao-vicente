import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import { getOrganizationOverview } from "@/lib/data/organization";

export const metadata: Metadata = {
  title: "Estrutura organizacional | Portal ICB Parque São Vicente",
  robots: {
    index: false,
    follow: false,
  },
};

function StatusLabel({ isActive }: { isActive: boolean }) {
  return (
    <span className="text-sm text-zinc-600">
      {isActive ? "Ativo" : "Inativo"}
    </span>
  );
}

export default async function OrganizationPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login?erro=perfil");
  }

  if (!user.isActive) {
    redirect("/portal");
  }

  const overview = await getOrganizationOverview();

  if (!overview) {
    redirect("/portal");
  }

  const { networks, cellTypes, cities, neighborhoods, cells, hasError } =
    overview;

  return (
    <main className="min-h-screen bg-zinc-100 px-4 py-10 sm:px-6">
      <div className="mx-auto w-full max-w-5xl">
        <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-10">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-zinc-600">
            Fase 3
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-zinc-950 sm:text-4xl">
            Estrutura organizacional
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-7 text-zinc-700">
            Esta página provisória confirma a leitura protegida das Redes,
            tipos de célula, cidades, bairros e células cadastrados no Supabase.
          </p>

          {hasError ? (
            <p
              role="alert"
              className="mt-8 rounded-xl border border-red-200 bg-red-50 px-4 py-4 text-red-800"
            >
              Não foi possível carregar a estrutura. Verifique a migração e as
              políticas de acesso.
            </p>
          ) : (
            <div className="mt-8 grid gap-6 lg:grid-cols-2">
              <section className="rounded-2xl border border-zinc-200 p-5 sm:p-6">
                <h2 className="text-xl font-semibold text-zinc-950">Redes</h2>
                <div className="mt-4 space-y-4">
                  {networks.map((network) => {
                    const types = cellTypes.filter(
                      (cellType) => cellType.networkId === network.id,
                    );

                    return (
                      <article
                        key={network.id}
                        className="rounded-xl bg-zinc-100 p-4"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <p className="font-semibold text-zinc-950">
                              {network.code} — {network.name}
                            </p>
                            <p className="mt-1 text-sm text-zinc-600">
                              {types.length} tipos cadastrados
                            </p>
                          </div>
                          <StatusLabel isActive={network.isActive} />
                        </div>

                        <ul className="mt-3 flex flex-wrap gap-2">
                          {types.map((cellType) => (
                            <li
                              key={cellType.id}
                              className="rounded-full border border-zinc-300 bg-white px-3 py-1 text-sm text-zinc-800"
                            >
                              {cellType.name}
                              {!cellType.isActive ? " — inativo" : ""}
                            </li>
                          ))}
                        </ul>
                      </article>
                    );
                  })}
                </div>
              </section>

              <section className="rounded-2xl border border-zinc-200 p-5 sm:p-6">
                <h2 className="text-xl font-semibold text-zinc-950">
                  Localidades
                </h2>
                <div className="mt-4 space-y-4">
                  {cities.map((city) => {
                    const cityNeighborhoods = neighborhoods.filter(
                      (neighborhood) => neighborhood.cityId === city.id,
                    );

                    return (
                      <article
                        key={city.id}
                        className="rounded-xl bg-zinc-100 p-4"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <p className="font-semibold text-zinc-950">
                              {city.name} — {city.stateCode}
                            </p>
                            <p className="mt-1 text-sm text-zinc-600">
                              {cityNeighborhoods.length} bairros cadastrados
                            </p>
                          </div>
                          <StatusLabel isActive={city.isActive} />
                        </div>

                        {cityNeighborhoods.length > 0 ? (
                          <ul className="mt-3 flex flex-wrap gap-2">
                            {cityNeighborhoods.map((neighborhood) => (
                              <li
                                key={neighborhood.id}
                                className="rounded-full border border-zinc-300 bg-white px-3 py-1 text-sm text-zinc-800"
                              >
                                {neighborhood.name}
                                {!neighborhood.isActive ? " — inativo" : ""}
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="mt-3 text-sm text-zinc-600">
                            Nenhum bairro cadastrado ainda.
                          </p>
                        )}
                      </article>
                    );
                  })}
                </div>
              </section>

              <section className="rounded-2xl border border-zinc-200 p-5 sm:p-6 lg:col-span-2">
                <div className="flex flex-wrap items-baseline justify-between gap-3">
                  <h2 className="text-xl font-semibold text-zinc-950">
                    Células
                  </h2>
                  <p className="text-sm text-zinc-600">
                    {cells.length} {cells.length === 1 ? "cadastrada" : "cadastradas"}
                  </p>
                </div>

                {cells.length > 0 ? (
                  <ul className="mt-4 grid gap-4 md:grid-cols-2">
                    {cells.map((cell) => (
                      <li
                        key={cell.id}
                        className="rounded-xl bg-zinc-100 p-4 sm:p-5"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <p className="font-semibold text-zinc-950">
                            {cell.name}
                          </p>
                          <StatusLabel isActive={cell.isActive} />
                        </div>
                        <dl className="mt-4 grid gap-3 text-sm text-zinc-700">
                          <div>
                            <dt className="font-semibold text-zinc-950">
                              Rede e tipo
                            </dt>
                            <dd className="mt-1">{cell.classification}</dd>
                          </div>
                          <div>
                            <dt className="font-semibold text-zinc-950">
                              Encontro
                            </dt>
                            <dd className="mt-1 capitalize">{cell.schedule}</dd>
                          </div>
                          <div>
                            <dt className="font-semibold text-zinc-950">
                              Localidade
                            </dt>
                            <dd className="mt-1">{cell.location}</dd>
                          </div>
                          <div>
                            <dt className="font-semibold text-zinc-950">
                              Líder
                            </dt>
                            <dd className="mt-1">{cell.leader}</dd>
                          </div>
                        </dl>
                        <Link
                          href={`/portal/celulas/${cell.id}`}
                          className="mt-5 flex min-h-11 w-full items-center justify-center rounded-xl border border-zinc-300 bg-white px-4 text-sm font-semibold text-zinc-900 transition-colors hover:bg-zinc-50 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-zinc-900"
                        >
                          Abrir célula
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-4 rounded-xl bg-zinc-100 p-4 text-zinc-700">
                    Nenhuma célula cadastrada ainda. Os dados fictícios serão
                    adicionados em uma etapa de teste separada.
                  </p>
                )}
              </section>
            </div>
          )}

          <Link
            href="/portal"
            className="mt-8 flex min-h-12 w-full items-center justify-center rounded-xl border border-zinc-300 bg-white px-5 text-base font-semibold text-zinc-900 transition-colors hover:bg-zinc-100 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-zinc-900 sm:w-auto sm:min-w-52"
          >
            Voltar ao portal
          </Link>
        </div>
      </div>
    </main>
  );
}
