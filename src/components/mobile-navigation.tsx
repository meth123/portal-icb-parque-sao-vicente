"use client";

import Link from "next/link";
import { Menu, X } from "lucide-react";
import { useState } from "react";

type NavigationItem = {
  href: string;
  label: string;
};

type MobileNavigationProps = {
  items: NavigationItem[];
};

export function MobileNavigation({ items }: MobileNavigationProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="order-3 w-full md:hidden">
      <button
        type="button"
        aria-expanded={isOpen}
        aria-controls="mobile-navigation"
        aria-label={isOpen ? "Fechar menu" : "Abrir menu"}
        onClick={() => setIsOpen((current) => !current)}
        className="flex min-h-12 w-full items-center justify-center gap-2 rounded-[0.875rem] border border-app-border bg-surface px-4 py-3 text-sm font-semibold text-app-foreground transition-[background-color,border-color,transform] active:scale-[0.985] active:bg-theme-primary-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus motion-reduce:transform-none"
      >
        {isOpen ? (
          <X aria-hidden="true" className="size-5" />
        ) : (
          <Menu aria-hidden="true" className="size-5" />
        )}
        Menu
      </button>

      {isOpen ? (
        <nav
          id="mobile-navigation"
          aria-label="Navegação principal no celular"
          className="mt-3 overflow-hidden rounded-[var(--radius-surface)] border border-app-border bg-surface shadow-[var(--shadow-raised)]"
        >
          <ul className="divide-y divide-app-border">
            {items.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={() => setIsOpen(false)}
                  className="block min-h-12 px-4 py-3 text-center text-base font-semibold text-app-foreground transition-[background-color,transform] active:scale-[0.985] active:bg-theme-primary-soft hover:bg-theme-primary-subtle focus-visible:bg-theme-primary-subtle focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-focus motion-reduce:transform-none"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      ) : null}
    </div>
  );
}
