import { FileBarChart, Info } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Alert } from "@/components/ui/alert";
import { buttonClassName } from "@/components/ui/button";
import { PageContainer } from "@/components/ui/page-container";
import { PageHeader } from "@/components/ui/page-header";
import { SectionHeader } from "@/components/ui/section-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { Surface } from "@/components/ui/surface";
import {
  canAccessPastoralDashboard,
  getCurrentUser,
} from "@/lib/auth/current-user";
import {
  getWeeklyChecklistData,
  type WeeklyChecklistPerson,
} from "@/lib/data/weekly-checklist";
import { ChecklistForm } from "./checklist-form";
import { NetworkResult } from "./checklist-results";

export const metadata: Metadata = {
  title: "Checklist semanal | ICB Conecta",
};

function formatClosingDate(date: string) {
  return new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" }).format(
    new Date(`${date}T12:00:00Z`),
  );
}

export default async function WeeklyChecklistPage() {
  const user = await getCurrentUser();

  if (!user) redirect("/login?erro=perfil");
  if (!user.isActive) redirect("/portal");

  const checklist = await getWeeklyChecklistData();

  if (!checklist) redirect("/portal");

  const networks = new Map<string, WeeklyChecklistPerson[]>();
  for (const person of checklist.people) {
    const people = networks.get(person.networkId) ?? [];
    people.push(person);
    networks.set(person.networkId, people);
  }

  return (
    <main>
      <PageContainer width="wide" className="py-6 sm:py-8 lg:py-10">
        <PageHeader
          eyebrow={checklist.periodLabel}
          title="Checklist semanal"
          actions={
            <div className="flex flex-wrap items-center gap-3">
              {canAccessPastoralDashboard(user) ? (
                <Link
                  href="/portal/checklist/resultados"
                  className={buttonClassName({ variant: "secondary", size: "compact" })}
                >
                  <FileBarChart aria-hidden="true" className="size-4" />
                  Histórico e PDF
                </Link>
              ) : null}
              <StatusBadge tone={checklist.period.isOpen ? "success" : "neutral"}>
                {checklist.period.isOpen
                  ? `Aberto até ${formatClosingDate(checklist.period.closesOn)}`
                  : "Encerrado"}
              </StatusBadge>
            </div>
          }
        />

        {checklist.hasError ? (
          <Alert tone="danger" className="mt-6">
            Não foi possível carregar o checklist. Tente novamente.
          </Alert>
        ) : null}

        {checklist.currentPerson && checklist.canRespond ? (
          <Surface tone="theme" className="mt-7 max-w-2xl border-theme-primary-border p-5 sm:p-7">
            <ChecklistForm
              initialPrayer={checklist.currentPerson.prayedInGroup}
              initialFasting={checklist.currentPerson.fastedForCell}
            />
          </Surface>
        ) : null}

        {checklist.currentPerson && !checklist.period.isOpen ? (
          <Alert tone="warning" className="mt-6">
            O prazo terminou. Os resultados continuam disponíveis abaixo.
          </Alert>
        ) : null}

        {!checklist.hasError && networks.size > 0 ? (
          <section className="mt-8" aria-labelledby="checklist-results-title">
            <SectionHeader id="checklist-results-title" title="Resultados" />
            <div className="mt-4 space-y-4">
              {[...networks.entries()].map(([networkId, people]) => (
                <NetworkResult key={networkId} people={people} />
              ))}
            </div>
          </section>
        ) : null}

        {!checklist.hasError && networks.size === 0 ? (
          <Alert className="mt-7">
            Ainda não existem lideranças para este período.
          </Alert>
        ) : null}

        <div className="mt-6 flex items-start gap-2 text-sm leading-6 text-app-secondary">
          <Info
            aria-hidden="true"
            className="mt-0.5 shrink-0 text-theme-primary"
            size={17}
            strokeWidth={1.8}
          />
          <p>O Evangelismo é atualizado automaticamente pela Ficha.</p>
        </div>
      </PageContainer>
    </main>
  );
}
