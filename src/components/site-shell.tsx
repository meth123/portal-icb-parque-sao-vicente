import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { MobileNavigation } from "@/components/mobile-navigation";
import { buttonClassName } from "@/components/ui/button";

type SiteShellProps = {
  children: ReactNode;
};

const navigation = [
  { href: "/", label: "Início" },
  { href: "/sobre", label: "Sobre" },
  { href: "/celulas", label: "Células" },
  { href: "/eventos", label: "Eventos" },
  { href: "/contato", label: "Contato" },
];

export function SiteShell({ children }: SiteShellProps) {
  return (
    <div className="flex min-h-screen flex-col bg-app-background text-app-foreground">
      <header className="sticky top-0 z-40 border-b border-t-[3px] border-app-border border-t-theme-primary bg-surface/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-3 px-5 py-3 sm:px-7 lg:px-10">
          <Link
            href="/"
            className="w-fit rounded-xl transition-transform active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-focus motion-reduce:transform-none"
            aria-label="Ir para a página inicial"
          >
            <Image
              src="/images/icb-parque-sao-vicente.webp"
              alt="ICB Parque São Vicente"
              width={857}
              height={576}
              className="h-14 w-auto brightness-0 sm:h-16"
            />
          </Link>

          <MobileNavigation items={navigation} />

          <nav aria-label="Navegação principal" className="hidden md:block">
            <ul className="flex items-center gap-x-1 text-sm font-semibold text-app-secondary">
              {navigation.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="inline-flex min-h-11 items-center rounded-xl px-3 py-2 transition-colors hover:bg-theme-primary-subtle hover:text-theme-primary-active focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <Link
            href="/login"
            className={`${buttonClassName({ size: "compact" })} hidden lg:inline-flex`}
          >
            Entrar no Conecta
          </Link>
        </div>
      </header>

      <main className="flex flex-1">{children}</main>

      <footer className="border-t border-app-border bg-surface">
        <div className="mx-auto flex w-full max-w-7xl flex-col items-center justify-center gap-3 px-5 py-7 text-center text-sm text-app-secondary sm:flex-row sm:gap-6 sm:px-7 lg:px-10">
          <a
            href="https://www.instagram.com/icbparquesv/"
            target="_blank"
            rel="noreferrer"
            className="w-fit rounded-md font-semibold text-theme-primary transition-colors hover:text-theme-primary-hover focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-focus"
          >
            @icbparquesv
          </a>
          <address className="not-italic">
            Rua Tapuias, 394 - Parque São Vicente
          </address>
        </div>
      </footer>
    </div>
  );
}
