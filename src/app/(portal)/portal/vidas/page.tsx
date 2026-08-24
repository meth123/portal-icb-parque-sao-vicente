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
              className="overflow-hidden rounded-2xl bg-theme-primary-active p-6 text-theme-primary-foreground sm:p-8"
            >
              <div className="flex items-center justify-between gap-6">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.1em] text-white/70">
                    Desde o início dos registros
                  </p>
                  <p className="mt-3 text-5xl font-semibold leading-none sm:text-6xl">
                    {numberFormatter.format(history.accumulatedTotal)}
                  </p>
                  <h2
                    id="accumulated-total-title"
                    className="mt-3 text-lg font-semibold"
                  >
                    {history.accumulatedTotal === 1
                      ? "vida pela primeira vez"
                      : "vidas pela primeira vez"}
                  </h2>
                  <p className="mt-2 text-sm text-white/75">
                    Total histórico das Fichas de Organização
                  </p>
                </div>
                <span
                  aria-hidden="true"
                  className="flex size-16 shrink-0 items-center justify-center rounded-2xl bg-white/12"
                >
                  <Users size={31} strokeWidth={1.7} />
                </span>
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
