"use client";

import { Ellipsis, LogOut, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { PortalNavigationItem } from "@/components/portal/navigation-types";
import {
  isPortalItemActive,
  PortalNavLink,
  PortalNavigationIconView,
} from "@/components/portal/portal-nav-link";
import { UserAvatar } from "@/components/ui/user-avatar";
import { SubmitButton } from "@/components/ui/submit-button";
import { classNames } from "@/lib/ui/class-names";
import { logout } from "@/app/(portal)/portal/actions";

type MobilePortalNavigationProps = {
  bottomItems: PortalNavigationItem[];
  moreItems: PortalNavigationItem[];
  user: {
    name: string;
    role: string;
    avatarUrl: string | null;
  };
};

export function MobilePortalNavigation({
  bottomItems,
  moreItems,
  user,
}: MobilePortalNavigationProps) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const moreButtonRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLElement>(null);
  const moreIsActive = moreItems.some((item) =>
    isPortalItemActive(pathname, item),
  );

  function closeMenu() {
    setIsOpen(false);
    requestAnimationFrame(() => moreButtonRef.current?.focus());
  }

  useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;
    const previousRootOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    closeButtonRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeMenu();
        return;
      }

      if (event.key !== "Tab") return;

      const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (!focusable?.length) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.documentElement.style.overflow = previousRootOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  return (
    <>
      <header className="sticky top-0 z-30 flex h-[calc(4rem+env(safe-area-inset-top))] items-center justify-between border-b border-t-[3px] border-app-border border-t-theme-primary bg-surface/95 px-5 pt-[env(safe-area-inset-top)] shadow-[0_1px_10px_rgba(35,29,39,0.035)] backdrop-blur lg:hidden">
        <Link
          href="/portal"
          aria-label="Ir para o início do ICB Conecta"
          className="inline-flex items-center gap-2 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
        >
          <Image
            src="/images/icb-parque-sao-vicente.webp"
            alt=""
            width={160}
            height={108}
            className="h-11 w-auto brightness-0"
          />
          <span className="text-sm font-semibold leading-4 text-app-foreground">
            ICB Conecta
            <span className="block text-[0.625rem] font-medium text-app-secondary">
              Parque São Vicente
            </span>
          </span>
        </Link>
        <Link
          href="/portal/perfil"
          aria-label="Abrir meu perfil"
          className="rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
        >
          <UserAvatar name={user.name} src={user.avatarUrl} size="small" />
        </Link>
      </header>

      <nav
        aria-label="Navegação principal no celular"
        className="fixed inset-x-0 bottom-0 z-50 border-t border-app-border bg-surface/95 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-1.5 shadow-[0_-8px_24px_rgba(35,29,39,0.055)] backdrop-blur lg:hidden"
      >
        <ul
          className="mx-auto grid max-w-lg"
          style={{ gridTemplateColumns: `repeat(${bottomItems.length + 1}, minmax(0, 1fr))` }}
        >
          {bottomItems.map((item) => (
            <li key={item.href}>
              <MobileBottomLink item={item} />
            </li>
          ))}
          <li>
            <button
              ref={moreButtonRef}
              type="button"
              aria-expanded={isOpen}
              aria-controls="portal-more-menu"
              onClick={() => setIsOpen(true)}
              className={classNames(
                "flex min-h-[3.625rem] w-full flex-col items-center justify-center gap-0.5 rounded-xl px-1 text-[0.6875rem] font-semibold transition-[background-color,color,transform] duration-150 active:scale-[0.96] active:bg-theme-primary-subtle focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-focus motion-reduce:transform-none",
                moreIsActive
                  ? "text-theme-primary-active"
                  : "text-app-secondary",
              )}
            >
              <span
                className={classNames(
                  "flex size-8 items-center justify-center rounded-[0.625rem] transition-colors",
                  moreIsActive && "bg-theme-primary-soft",
                )}
              >
                <Ellipsis aria-hidden="true" size={22} strokeWidth={1.8} />
              </span>
              Mais
            </button>
          </li>
        </ul>
      </nav>

      {isOpen ? (
        <div className="fixed inset-0 z-[60] lg:hidden">
          <button
            type="button"
            aria-label="Fechar menu"
            data-press="none"
            className="absolute inset-0 bg-black/35"
            onClick={closeMenu}
          />
          <section
            ref={dialogRef}
            id="portal-more-menu"
            role="dialog"
            aria-modal="true"
            aria-labelledby="portal-more-title"
            className="absolute inset-x-0 bottom-0 max-h-[85dvh] overscroll-contain overflow-y-auto rounded-t-[1.75rem] bg-surface px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-3 shadow-[0_-18px_50px_rgba(35,29,39,0.16)]"
          >
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-app-border" />
            <div className="flex items-center gap-3 border-b border-app-border pb-4">
              <UserAvatar name={user.name} src={user.avatarUrl} />
              <div className="min-w-0 flex-1">
                <h2
                  id="portal-more-title"
                  className="truncate font-semibold text-app-foreground"
                >
                  {user.name}
                </h2>
                <p className="truncate text-sm text-app-secondary">
                  {user.role}
                </p>
              </div>
              <button
                ref={closeButtonRef}
                type="button"
                aria-label="Fechar menu"
                onClick={closeMenu}
                className="inline-flex h-11 w-11 items-center justify-center rounded-xl text-app-secondary hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
              >
                <X aria-hidden="true" size={22} />
              </button>
            </div>

            <nav aria-label="Mais opções" className="py-3">
              <ul className="grid gap-1 sm:grid-cols-2">
                {moreItems.map((item) => (
                  <li key={item.href}>
                    <PortalNavLink
                      item={item}
                      compact
                      onNavigate={closeMenu}
                    />
                  </li>
                ))}
              </ul>
            </nav>

            <form action={logout} className="border-t border-app-border pt-3">
              <SubmitButton
                pendingLabel="Saindo..."
                variant="ghost"
                className="w-full justify-start"
              >
                <LogOut aria-hidden="true" size={20} strokeWidth={1.8} />
                Sair
              </SubmitButton>
            </form>
          </section>
        </div>
      ) : null}
    </>
  );
}

function MobileBottomLink({ item }: { item: PortalNavigationItem }) {
  const pathname = usePathname();
  const active = isPortalItemActive(pathname, item);

  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={classNames(
        "flex min-h-[3.625rem] flex-col items-center justify-center gap-0.5 rounded-xl px-1 text-[0.6875rem] font-semibold transition-[background-color,color,transform] duration-150 active:scale-[0.96] active:bg-theme-primary-subtle focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-focus motion-reduce:transform-none",
        active ? "text-theme-primary-active" : "text-app-secondary",
      )}
    >
      <span
        className={classNames(
          "flex size-8 items-center justify-center rounded-[0.625rem] transition-colors",
          active && "bg-theme-primary-soft",
        )}
      >
        <PortalNavigationIconView icon={item.icon} size={22} />
      </span>
      <span className="max-w-full truncate">{item.label}</span>
    </Link>
  );
}
