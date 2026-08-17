import {
  BookOpen,
  ChartNoAxesCombined,
  ClipboardList,
  Ellipsis,
  House,
  HouseHeart,
  ListChecks,
  Network,
  Settings,
  UserRound,
  LogOut,
  type LucideIcon,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import type {
  PortalNavigationIcon,
  PortalNavigationItem,
} from "@/components/portal/navigation-types";
import { UserAvatar } from "@/components/ui/user-avatar";
import { logout } from "@/app/(portal)/portal/actions";

const icons: Record<PortalNavigationIcon, LucideIcon> = {
  home: House,
  reports: ClipboardList,
  cell: HouseHeart,
  checklist: ListChecks,
  library: BookOpen,
  organization: Network,
  pastoral: ChartNoAxesCombined,
  administration: Settings,
  profile: UserRound,
};

type PortalNavigationFallbackProps = {
  primaryItems: PortalNavigationItem[];
  secondaryItems: PortalNavigationItem[];
  bottomItems: PortalNavigationItem[];
  user: {
    name: string;
    role: string;
    avatarUrl: string | null;
  };
};

export function PortalNavigationFallback({
  primaryItems,
  secondaryItems,
  bottomItems,
  user,
}: PortalNavigationFallbackProps) {
  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-72 flex-col border-r border-app-border bg-surface lg:flex">
        <Brand className="min-h-24 border-b border-app-border px-6" />
        <nav aria-label="Navegação principal do ICB Conecta" className="flex-1 px-4 py-5">
          <ul className="space-y-1">
            {[...primaryItems, ...secondaryItems].map((item) => (
              <li key={item.href}>
                <StaticLink item={item} />
              </li>
            ))}
          </ul>
        </nav>
        <div className="border-t border-app-border p-4">
          <div className="flex items-center gap-3 p-2">
            <UserAvatar name={user.name} src={user.avatarUrl} size="small" />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{user.name}</p>
              <p className="truncate text-xs text-app-secondary">{user.role}</p>
            </div>
          </div>
          <form action={logout} className="mt-2">
            <button
              type="submit"
              className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-sm font-semibold text-app-secondary"
            >
              <LogOut aria-hidden="true" size={20} strokeWidth={1.8} />
              Sair
            </button>
          </form>
        </div>
      </aside>

      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-app-border bg-surface px-4 lg:hidden">
        <Brand className="gap-2" compact />
        <UserAvatar name={user.name} src={user.avatarUrl} size="small" />
      </header>
      <nav
        aria-label="Navegação principal no celular"
        className="fixed inset-x-0 bottom-0 z-50 border-t border-app-border bg-surface px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 lg:hidden"
      >
        <ul
          className="mx-auto grid max-w-lg"
          style={{ gridTemplateColumns: `repeat(${bottomItems.length + 1}, minmax(0, 1fr))` }}
        >
          {bottomItems.map((item) => {
            const Icon = icons[item.icon];
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl px-1 text-xs font-semibold text-app-secondary"
                >
                  <Icon aria-hidden="true" size={22} strokeWidth={1.8} />
                  <span className="max-w-full truncate">{item.label}</span>
                </Link>
              </li>
            );
          })}
          <li>
            <button
              type="button"
              disabled
              className="flex min-h-14 w-full flex-col items-center justify-center gap-1 rounded-xl px-1 text-xs font-semibold text-app-secondary"
            >
              <Ellipsis aria-hidden="true" size={22} strokeWidth={1.8} />
              Mais
            </button>
          </li>
        </ul>
      </nav>
    </>
  );
}

function StaticLink({ item }: { item: PortalNavigationItem }) {
  const Icon = icons[item.icon];
  return (
    <Link
      href={item.href}
      className="flex min-h-11 items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold text-app-secondary"
    >
      <Icon aria-hidden="true" size={20} strokeWidth={1.8} />
      {item.label}
    </Link>
  );
}

function Brand({
  className,
  compact = false,
}: {
  className?: string;
  compact?: boolean;
}) {
  return (
    <Link
      href="/portal"
      aria-label="Ir para o início do ICB Conecta"
      className={`flex items-center ${className ?? ""}`}
    >
      <Image
        src="/images/icb-parque-sao-vicente.png"
        alt=""
        width={857}
        height={576}
        priority
        className={compact ? "h-11 w-auto brightness-0" : "h-14 w-auto brightness-0"}
      />
      <span className={compact ? "text-sm font-semibold" : "ml-3 text-sm font-semibold"}>
        ICB Conecta
        {!compact ? (
          <span className="block font-normal text-app-secondary">
            Parque São Vicente
          </span>
        ) : null}
      </span>
    </Link>
  );
}
