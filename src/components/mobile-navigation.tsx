"use client";

import Link from "next/link";
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
    <div className="w-full md:hidden">
      <button
        type="button"
        aria-expanded={isOpen}
        aria-controls="mobile-navigation"
        aria-label={isOpen ? "Fechar menu" : "Abrir menu"}
        onClick={() => setIsOpen((current) => !current)}
        className="flex min-h-12 w-full items-center justify-center gap-3 rounded-xl border border-zinc-300 bg-white px-4 py-3 text-base font-semibold text-zinc-900 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-zinc-900"
      >
        <span aria-hidden className="text-xl leading-none">
          {isOpen ? "×" : "☰"}
        </span>
        Menu
      </button>

      {isOpen ? (
        <nav
          id="mobile-navigation"
          aria-label="Navegação principal no celular"
          className="mt-3 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm"
        >
          <ul className="divide-y divide-zinc-200">
            {items.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={() => setIsOpen(false)}
                  className="block min-h-12 px-4 py-3 text-center text-base font-medium text-zinc-800 transition-colors hover:bg-zinc-100 focus-visible:bg-zinc-100 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-zinc-900"
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
