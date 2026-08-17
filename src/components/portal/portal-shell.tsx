import { Suspense, type ReactNode } from "react";
import { DesktopSidebar } from "@/components/portal/desktop-sidebar";
import { MobilePortalNavigation } from "@/components/portal/mobile-portal-navigation";
import { PortalNavigationFallback } from "@/components/portal/portal-navigation-fallback";
import type { PortalNavigationItem } from "@/components/portal/navigation-types";

type PortalShellProps = {
  children: ReactNode;
  primaryItems: PortalNavigationItem[];
  secondaryItems: PortalNavigationItem[];
  bottomItems: PortalNavigationItem[];
  moreItems: PortalNavigationItem[];
  user: {
    name: string;
    role: string;
    avatarUrl: string | null;
  };
};

export function PortalShell({
  children,
  primaryItems,
  secondaryItems,
  bottomItems,
  moreItems,
  user,
}: PortalShellProps) {
  return (
    <div className="min-h-dvh bg-app-background text-app-foreground">
      <Suspense
        fallback={
          <PortalNavigationFallback
            primaryItems={primaryItems}
            secondaryItems={secondaryItems}
            bottomItems={bottomItems}
            user={user}
          />
        }
      >
        <DesktopSidebar
          primaryItems={primaryItems}
          secondaryItems={secondaryItems}
          user={user}
        />
        <MobilePortalNavigation
          bottomItems={bottomItems}
          moreItems={moreItems}
          user={user}
        />
      </Suspense>
      <div className="min-h-dvh pb-[calc(5rem+env(safe-area-inset-bottom))] lg:pl-72 lg:pb-0">
        {children}
      </div>
    </div>
  );
}
