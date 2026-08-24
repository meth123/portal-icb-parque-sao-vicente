import Link from "next/link";
import { redirect } from "next/navigation";
import {
  FileText,
  ShieldCheck,
  ShieldX,
  UserCheck,
  UserPlus,
  Users,
  UsersRound,
} from "lucide-react";
import { ActionCard } from "@/components/ui/action-card";
import { buttonClassName } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { MetricCard } from "@/components/ui/metric-card";
import { PageContainer } from "@/components/ui/page-container";
import { PageHeader } from "@/components/ui/page-header";
import { SectionHeader } from "@/components/ui/section-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { canAccessAdministration, getCurrentUser } from "@/lib/auth/current-user";
import { getAdministrationOverview } from "@/lib/data/cell-administration";
import { AccountDirectory } from "./account-directory";

export default async function AdminAccessPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!canAccessAdministration(user)) redirect("/portal");

  const overview = await getAdministrationOverview();
  if (!overview || overview.hasError) {
    return (
      <main className="min-h-full bg-app-background py-6 sm:py-8">
        <PageContainer width="narrow">
          <EmptyState
            icon={<ShieldX className="size-8" />}
            title="Dados indisponíveis"
            description="Não foi possível carregar o resumo administrativo. Tente novamente mais tarde."
            action={
              <Link
                href="/portal"
                className={buttonClassName({ variant: "secondary" })}
              >
                Voltar ao início
              </Link>
            }
          />
        </PageContainer>
      </main>
    );
  }

  const activeProfiles = overview.profiles.filter((profile) => profile.is_active);
  const administrativeAccessCount = activeProfiles.filter(
    (profile) =>
      profile.global_role === "administrator" ||
      profile.global_role === "pastor",
  ).length;
  const inactiveCount = overview.profiles.length - activeProfiles.length;

  return (
    <main className="min-h-full bg-app-background py-6 sm:py-8">
      <PageContainer width="wide" className="space-y-8">
        <PageHeader
          eyebrow="Área administrativa"
          title="Administração"
          description="Gerencie contas, células e publicações com as permissões já definidas no ICB Conecta."
          actions={
            <StatusBadge tone="success" className="min-h-9 px-4">
              <ShieldCheck aria-hidden="true" className="mr-2 size-4" />
              Acesso protegido
            </StatusBadge>
          }
        />

        <section aria-labelledby="admin-summary-heading">
          <SectionHeader id="admin-summary-heading" title="Visão geral" />
          <dl className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <MetricCard
              label="Contas cadastradas"
              value={overview.profiles.length}
              icon={<Users className="size-5" />}
              tone="theme"
            />
            <MetricCard
              label="Contas ativas"
              value={activeProfiles.length}
              icon={<UserCheck className="size-5" />}
              tone="success"
            />
            <MetricCard
              label="Contas inativas"
              value={inactiveCount}
              icon={<ShieldX className="size-5" />}
              tone={inactiveCount > 0 ? "warning" : "default"}
            />
            <MetricCard
              label="Acessos"
              value={administrativeAccessCount}
              note="Pastores e administradores"
              icon={<ShieldCheck className="size-5" />}
            />
          </dl>
        </section>

        <section aria-labelledby="admin-actions-heading">
          <SectionHeader
            id="admin-actions-heading"
            title="Gestão"
            description="Acesse as operações administrativas disponíveis."
          />
          <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <ActionCard
              href="/portal/admin/usuarios/novo"
              title="Cadastrar usuário"
              description="Crie uma conta com senha temporária"
              icon={<UserPlus size={22} strokeWidth={1.8} />}
              tone="theme"
            />
            <ActionCard
              href="/portal/admin/celulas"
              title="Gerenciar células"
              description={`${overview.activeCellCount} células ativas`}
              icon={<UsersRound size={22} strokeWidth={1.8} />}
              tone="theme"
            />
            <ActionCard
              href="/portal/documentos"
              title="Gerenciar publicações"
              description="Biblioteca e documentos disponíveis"
              icon={<FileText size={22} strokeWidth={1.8} />}
            />
          </div>
        </section>

        <section aria-labelledby="accounts-heading">
          <SectionHeader
            id="accounts-heading"
            title="Contas"
            description="Abra uma conta para revisar papel, status e permissões."
            action={
              <StatusBadge tone="theme">
                {overview.profiles.length}{" "}
                {overview.profiles.length === 1 ? "conta" : "contas"}
              </StatusBadge>
            }
          />
          <AccountDirectory
            profiles={overview.profiles}
            currentUserId={user.id}
          />
        </section>
      </PageContainer>
    </main>
  );
}
