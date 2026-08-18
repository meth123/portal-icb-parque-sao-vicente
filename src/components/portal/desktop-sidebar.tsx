import { LogOut } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import type { PortalNavigationItem } from "@/components/portal/navigation-types";
import { PortalNavLink } from "@/components/portal/portal-nav-link";
import { UserAvatar } from "@/components/ui/user-avatar";
import { logout } from "@/app/(portal)/portal/actions";

type DesktopSidebarProps = {
  primaryItems: PortalNavigationItem[];
  secondaryItems: PortalNavigationItem[];
  user: {
    name: string;
    role: string;
    avatarUrl: string | null;
  };
};

export function DesktopSidebar({
  primaryItems,
  secondaryItems,
  user,
}: DesktopSidebarProps) {
  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-72 flex-col border-r border-app-border bg-surface lg:flex">
      <div className="flex min-h-24 items-center border-b border-app-border px-6">
        <Link
          href="/portal"
          aria-label="Ir para o início do ICB Conecta"
          className="inline-flex items-center gap-3 rounded-xl focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-focus"
        >
          <Image
            src="/images/icb-parque-sao-vicente.webp"
            alt=""
            width={160}
            height={108}
            className="h-14 w-auto brightness-0"
          />
          <span className="text-sm font-semibold leading-5 text-app-foreground">
            ICB Conecta
            <span className="block font-normal text-app-secondary">
              Parque São Vicente
            </span>
          </span>
        </Link>
      </div>

      <nav
        aria-label="Navegação principal do ICB Conecta"
        className="flex-1 overflow-y-auto px-4 py-5"
      >
        <ul className="space-y-1">
          {primaryItems.map((item) => (
            <li key={item.href}>
              <PortalNavLink item={item} />
            </li>
          ))}
        </ul>

        {secondaryItems.length > 0 ? (
          <>
            <p className="mb-2 mt-7 px-3 text-xs font-semibold uppercase text-app-secondary">
              Outros acessos
            </p>
            <ul className="space-y-1">
              {secondaryItems.map((item) => (
                <li key={item.href}>
                  <PortalNavLink item={item} />
                </li>
              ))}
            </ul>
          </>
        ) : null}
      </nav>

      <div className="border-t border-app-border p-4">
        <Link
          href="/portal/perfil"
          className="flex items-center gap-3 rounded-xl p-2 transition-colors hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
        >
          <UserAvatar name={user.name} src={user.avatarUrl} size="small" />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold text-app-foreground">
              {user.name}
            </span>
            <span className="block truncate text-xs text-app-secondary">
              {user.role}
            </span>
          </span>
        </Link>
        <form action={logout} className="mt-2">
          <button
            type="submit"
            className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-sm font-semibold text-app-secondary transition-colors hover:bg-surface-muted hover:text-app-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
          >
            <LogOut aria-hidden="true" size={20} strokeWidth={1.8} />
            Sair
          </button>
        </form>
      </div>
    </aside>
  );
}
