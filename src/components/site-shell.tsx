import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { MobileNavigation } from "@/components/mobile-navigation";

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
    <div className="flex min-h-screen flex-col bg-zinc-50 text-zinc-950">
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center gap-4 px-6 py-4 md:flex-row md:justify-between">
          <Link
            href="/"
            className="w-fit rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-zinc-900"
            aria-label="Ir para a página inicial"
          >
            <Image
              src="/images/icb-parque-sao-vicente.png"
              alt="ICB Parque São Vicente"
              width={857}
              height={576}
              priority
              className="h-20 w-auto brightness-0"
            />
          </Link>

          <MobileNavigation items={navigation} />

          <nav aria-label="Navegação principal" className="hidden md:block">
            <ul className="flex items-center gap-x-5 text-base font-medium text-zinc-700">
              {navigation.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="rounded-md py-2 transition-colors hover:text-zinc-950 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-zinc-900"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </header>

      <main className="flex flex-1">{children}</main>

      <footer className="border-t border-zinc-200 bg-white">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-center gap-3 px-6 py-6 text-center text-base text-zinc-600 sm:flex-row sm:gap-6">
          <a
            href="https://www.instagram.com/icbparquesv/"
            target="_blank"
            rel="noreferrer"
            className="w-fit rounded-md font-medium transition-colors hover:text-zinc-950 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-zinc-900"
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
