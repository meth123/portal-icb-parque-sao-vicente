"use client";

import {
  BookOpen,
  ChartNoAxesCombined,
  ClipboardCheck,
  ClipboardList,
  HeartHandshake,
  House,
  HouseHeart,
  ListChecks,
  Network,
  Settings,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type {
  PortalNavigationIcon,
  PortalNavigationItem,
} from "@/components/portal/navigation-types";
import { classNames } from "@/lib/ui/class-names";

const navigationIcons: Record<PortalNavigationIcon, LucideIcon> = {
  home: House,
  reports: ClipboardList,
  cell: HouseHeart,
  checklist: ListChecks,
  library: BookOpen,
  organization: Network,
  pastoral: ChartNoAxesCombined,
  attendance: ClipboardCheck,
  administration: Settings,
  testimonies: HeartHandshake,
  profile: UserRound,
};

export function PortalNavigationIconView({
  icon,
  size = 20,
}: {
  icon: PortalNavigationIcon;
  size?: number;
}) {
  const Icon = navigationIcons[icon];
  return <Icon aria-hidden="true" size={size} strokeWidth={1.8} />;
}

export function isPortalItemActive(
  pathname: string,
  item: PortalNavigationItem,
) {
  return item.exact
    ? pathname === item.href
    : pathname === item.href || pathname.startsWith(`${item.href}/`);
}

type PortalNavLinkProps = {
  item: PortalNavigationItem;
  compact?: boolean;
  onNavigate?: () => void;
};

export function PortalNavLink({
  item,
  compact = false,
  onNavigate,
}: PortalNavLinkProps) {
  const pathname = usePathname();
  const active = isPortalItemActive(pathname, item);
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      onClick={onNavigate}
      className={classNames(
        "flex min-h-11 items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold transition-[background-color,color,transform] duration-150 active:scale-[0.985] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus motion-reduce:transform-none",
        active
          ? "bg-theme-primary-soft text-theme-primary-active shadow-[inset_3px_0_0_var(--theme-primary)]"
          : "text-app-secondary hover:bg-surface-muted hover:text-app-foreground active:bg-theme-primary-subtle",
        compact && "min-h-12 text-base",
      )}
    >
      <PortalNavigationIconView icon={item.icon} />
      <span>{item.label}</span>
    </Link>
  );
}
