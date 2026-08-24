import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, CalendarDays, Users } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { buttonClassName } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageContainer } from "@/components/ui/page-container";
import { PageHeader } from "@/components/ui/page-header";
import { SectionHeader } from "@/components/ui/section-header";
import { getCurrentUser } from "@/lib/auth/current-user";
import {
  getFirstTimeGuestHistory,
  type FirstTimeGuestMonth,
} from "@/lib/data/first-time-guests";

export const metadata: Metadata = {
  title: "Vidas pela primeira vez | ICB Conecta",
  robots: {
    index: false,
    follow: false,
  },
};

const numberFormatter = new Intl.NumberFormat("pt-BR");

function groupMonthsByYear(months: FirstTimeGuestMonth[]) {
  const groups = new Map<
    string,
    { year: string; total: number; months: FirstTimeGuestMonth[] }
  >();

  for (const month of months) {
    const year = month.monthStart.slice(0, 4);
    const current = groups.get(year) ?? { year, total: 0, months: [] };

    current.total += month.total;
    current.months.push(month);
    groups.set(year, current);
  }

  return Array.from(groups.values());
}

export default async function FirstTimeGuestsPage() {
  const user = await getCurrentUser();

  if (!user) redirect("/login?erro=perfil");
  if (!user.isActive) redirect("/portal");

  const history = await getFirstTimeGuestHistory();

  if (!history) redirect("/portal");

  const years = groupMonthsByYear(history.months);
  const networkTotals = new Map(
    history.networkTotals.map((network) => [network.networkCode, network.total]),
  );
  const hasNetworkTotals = history.networkTotals.length > 0;
  const rjTotal = networkTotals.get("RJ") ?? 0;
  const hmTotal = networkTotals.get("H.M") ?? 0;

  return (
    <main className="min-h-full bg-app-background py-6 sm:py-8">
      <PageContainer className="space-y-6 sm:space-y-8">
        <PageHeader
          eyebrow="Vidas pela primeira vez"
          title="Uma história de vidas alcançadas"
          description="Acompanhe a evolução mensal dos registros enviados pelas células."
        />

        {history.hasError ? (
          <Alert tone="danger">
            Não foi possível carregar o histórico. Tente novamente mais tarde.
          </Alert>
        ) : (
          <>
            <section
              aria-labelledby="accumulated-total-title"
              className="border-y border-app-border py-6 sm:py-8"
            >
              <div className="grid gap-6 sm:grid-cols-[minmax(0,0.9fr)_minmax(16rem,1.1fr)] sm:items-center sm:gap-10">
                <div className="relative pl-5 sm:pl-6">
                  <span
                    aria-hidden="true"
                    className="absolute inset-y-0 left-0 w-1 rounded-full bg-theme-primary"
                  />
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-theme-primary-active">
                    Acumulado histórico
                  </p>
                  <p className="mt-3 text-6xl font-semibold leading-none tracking-[-0.05em] text-theme-primary-active sm:text-7xl">
                    {numberFormatter.format(history.accumulatedTotal)}
                  </p>
                  <h2
                    id="accumulated-total-title"
                    className="mt-3 text-lg font-semibold text-app-foreground"
                  >
                    {history.accumulatedTotal === 1
                      ? "primeira visita registrada"
                      : "primeiras visitas registradas"}
                  </h2>
                </div>

                <div className="border-t border-app-border pt-5 sm:border-l sm:border-t-0 sm:py-2 sm:pl-8">
                  {hasNetworkTotals ? (
                    <>
                      <div className="flex items-center gap-3">
                        <span
                          aria-hidden="true"
                          className="flex size-10 shrink-0 items-center justify-center rounded-full bg-theme-primary-soft text-theme-primary-active"
                        >
                          <Users className="size-5" strokeWidth={1.8} />
                        </span>
                        <p className="text-xs font-semibold uppercase tracking-[0.1em] text-app-secondary">
                          Distribuição por Rede
                        </p>
                      </div>
                      <dl className="mt-5 grid grid-cols-2 divide-x divide-app-border">
                        <div className="pr-5">
                          <dt className="text-sm font-medium text-app-secondary">
                            RJ
                          </dt>
                          <dd className="mt-1 text-3xl font-semibold tracking-[-0.03em] text-app-foreground">
                            {numberFormatter.format(rjTotal)}
                          </dd>
                        </div>
                        <div className="pl-5">
                          <dt className="text-sm font-medium text-app-secondary">
                            H.M
                          </dt>
                          <dd className="mt-1 text-3xl font-semibold tracking-[-0.03em] text-app-foreground">
                            {numberFormatter.format(hmTotal)}
                          </dd>
                        </div>
                      </dl>
                      <p className="mt-4 text-sm leading-6 text-app-secondary">
                        Totais desde o início, conforme a Rede de cada célula na
                        data da Ficha.
                      </p>
                    </>
                  ) : (
                    <>
                      <div className="flex items-center gap-3">
                        <span
                          aria-hidden="true"
                          className="flex size-10 shrink-0 items-center justify-center rounded-full bg-theme-primary-soft text-theme-primary-active"
                        >
                          <Users className="size-5" strokeWidth={1.8} />
                        </span>
                        <p className="text-sm font-semibold text-app-foreground">
                          Desde o início dos registros
                        </p>
                      </div>
                      <p className="mt-3 max-w-xl leading-7 text-app-secondary">
                        Convidados informados pelas células em sua primeira
                        visita, somados a partir das Fichas de Organização.
                      </p>
                    </>
                  )}
                </div>
              </div>
            </section>

            {years.length > 0 ? (
              <section aria-labelledby="monthly-history-title">
                <SectionHeader
                  id="monthly-history-title"
                  title="Histórico mensal"
                  description="Do mês mais recente ao mais antigo."
                />
                <div className="mt-4 space-y-4">
                  {years.map((group) => (
                    <section
                      key={group.year}
                      aria-labelledby={`year-${group.year}`}
                      className="overflow-hidden rounded-2xl border border-app-border bg-surface"
                    >
                      <header className="flex items-center justify-between gap-4 border-b border-app-border bg-surface-muted px-5 py-4 sm:px-6">
                        <h3
                          id={`year-${group.year}`}
                          className="text-lg font-semibold text-app-foreground"
                        >
                          {group.year}
                        </h3>
                        <p className="text-sm font-medium text-app-secondary">
                          {numberFormatter.format(group.total)} no ano
                        </p>
                      </header>
                      <ul className="divide-y divide-app-border">
                        {group.months.map((month) => (
                          <li
                            key={month.monthStart}
                            className="flex items-center justify-between gap-4 px-5 py-4 sm:px-6"
                          >
                            <time
                              dateTime={month.monthStart}
                              className="flex min-w-0 items-center gap-3 font-medium text-app-foreground"
                            >
                              <CalendarDays
                                aria-hidden="true"
                                className="size-5 shrink-0 text-theme-primary"
                                strokeWidth={1.8}
                              />
                              {month.monthLabel}
                            </time>
                            <span className="shrink-0 text-lg font-semibold text-app-foreground">
                              {numberFormatter.format(month.total)}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </section>
                  ))}
                </div>
              </section>
            ) : (
              <EmptyState
                icon={<Users className="size-8" />}
                title="Ainda não há registros"
                description="Os registros aparecerão aqui quando forem enviados nas Fichas."
              />
            )}
          </>
        )}

        <Link
          href="/portal"
          className={buttonClassName({
            variant: "ghost",
            size: "compact",
            className: "w-full sm:w-auto",
          })}
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
          Voltar ao ICB Conecta
        </Link>
      </PageContainer>
    </main>
  );
}
