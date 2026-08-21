import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { PortalShell } from "@/components/portal/portal-shell";
import {
  canAccessAdministration,
  canAccessPastoralDashboard,
  getCurrentUser,
} from "@/lib/auth/current-user";
import { getProfileAvatarUrl } from "@/lib/data/profile-avatar";
import { buildPortalNavigation } from "@/lib/portal-navigation";

export default async function PortalLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();

  if (!user) redirect("/login?erro=perfil");
  if (user.mustChangePassword) redirect("/atualizar-senha?primeiro_acesso=1");
  if (!user.isActive) return children;

  const avatarUrl = await getProfileAvatarUrl(user.id, user.avatarPath);
  const hasPastoralAccess = canAccessPastoralDashboard(user);
  const hasAdministrationAccess = canAccessAdministration(user);
  const roleLabel =
    user.globalRole === "administrator"
      ? "Administrador"
      : user.globalRole === "pastor"
        ? "Pastor"
        : user.isSupervisor
          ? "Supervisor"
          : user.currentLeadershipRole === "leader"
            ? "Líder"
            : user.currentLeadershipRole === "vice_leader"
              ? "Vice-líder"
              : "Usuário";

  const { primaryItems, secondaryItems, bottomItems, moreItems } =
    buildPortalNavigation({
      cellId: user.currentCellId,
      hasDocumentLibraryAccess: user.hasDocumentLibraryAccess,
      hasPastoralAccess,
      hasAdministrationAccess,
    });

  return (
    <PortalShell
      primaryItems={primaryItems}
      secondaryItems={secondaryItems}
      bottomItems={bottomItems}
      moreItems={moreItems}
      user={{
        name: user.fullName ?? "Usuário",
        role: roleLabel,
        avatarUrl,
      }}
    >
      {children}
    </PortalShell>
  );
}
