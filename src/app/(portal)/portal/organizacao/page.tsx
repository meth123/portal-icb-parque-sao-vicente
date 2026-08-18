import type { Metadata } from "next";
import { Building2, House, MapPin, Network } from "lucide-react";
import { redirect } from "next/navigation";
import { Alert } from "@/components/ui/alert";
import { MetricCard } from "@/components/ui/metric-card";
import { PageContainer } from "@/components/ui/page-container";
import { PageHeader } from "@/components/ui/page-header";
import { SectionHeader } from "@/components/ui/section-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { getCurrentUser } from "@/lib/auth/current-user";
import { getOrganizationOverview } from "@/lib/data/organization";
import { OrganizationDirectory } from "./organization-directory";

export const metadata: Metadata = {
  title: "Estrutura organizacional | ICB Conecta",
  robots: { index: false, follow: false },
};

export default async function OrganizationPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?erro=perfil");
  if (!user.isActive) redirect("/portal");

  const overview = await getOrganizationOverview();
  if (!overview) redirect("/portal");

  const { networks, cities, neighborhoods, cells, hasError } = overview;
  const activeCells = cells.filter((cell) => cell.isActive).length;

  return (
    <main className="min-h-full bg-app-background py-6 sm:py-8">
      <PageContainer width="wide">
        <PageHeader
          eyebrow="Consulta"
          title="Estrutura organizacional"
          description="Encontre células, lideranças e localidades da igreja em um só lugar."
        />

        {hasError ? (
          <Alert tone="danger" className="mt-8">
            Não foi possível carregar todos os dados da estrutura. Tente novamente mais tarde.
          </Alert>
        ) : (
          <>
            <dl className="mt-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
              <MetricCard label="Células ativas" value={activeCells} note={`${cells.length} cadastradas`} tone="theme" icon={<House className="size-5" />} />
              <MetricCard label="Redes" value={networks.length} note="na estrutura" icon={<Network className="size-5" />} />
              <MetricCard label="Cidades" value={cities.length} note="atendidas" icon={<Building2 className="size-5" />} />
              <MetricCard label="Bairros" value={neighborhoods.length} note="cadastrados" icon={<MapPin className="size-5" />} />
            </dl>

            <section aria-labelledby="localities-heading" className="mt-10">
              <SectionHeader
                id="localities-heading"
                title="Localidades"
                description="Cidades e bairros presentes na estrutura atual."
              />
              {cities.length > 0 ? (
                <ul className="mt-4 grid gap-4 lg:grid-cols-2">
                  {cities.map((city) => {
                    const cityNeighborhoods = neighborhoods.filter((item) => item.cityId === city.id);
                    return (
                      <li key={city.id} className="rounded-2xl border border-app-border bg-surface p-5">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex min-w-0 items-center gap-3">
                            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-theme-primary-subtle text-theme-primary-active">
                              <MapPin aria-hidden="true" className="size-5" />
                            </span>
                            <div className="min-w-0">
                              <h3 className="truncate font-semibold text-app-foreground">{city.name} · {city.stateCode}</h3>
                              <p className="mt-0.5 text-sm text-app-secondary">
                                {cityNeighborhoods.length} {cityNeighborhoods.length === 1 ? "bairro" : "bairros"}
                              </p>
                            </div>
                          </div>
                          <StatusBadge tone={city.isActive ? "success" : "neutral"}>{city.isActive ? "Ativa" : "Inativa"}</StatusBadge>
                        </div>
                        {cityNeighborhoods.length > 0 ? (
                          <ul className="mt-4 flex flex-wrap gap-2 border-t border-app-border pt-4">
                            {cityNeighborhoods.map((neighborhood) => (
                              <li key={neighborhood.id}>
                                <StatusBadge tone={neighborhood.isActive ? "neutral" : "warning"}>
                                  {neighborhood.name}{neighborhood.isActive ? "" : " · inativo"}
                                </StatusBadge>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="mt-4 border-t border-app-border pt-4 text-sm text-app-secondary">Nenhum bairro cadastrado.</p>
                        )}
                      </li>
                    );
                  })}
                </ul>
              ) : null}
            </section>

            <section aria-labelledby="cells-heading" className="mt-10">
              <SectionHeader id="cells-heading" title="Células" description="Pesquise pelos dados que você já conhece." />
              <OrganizationDirectory cells={cells} />
            </section>
          </>
        )}
      </PageContainer>
    </main>
  );
}
