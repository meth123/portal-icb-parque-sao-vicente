import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-100 px-4 py-10 sm:px-6">
      <section className="w-full max-w-md">
        <div className="mb-6 flex justify-center">
          <Link
            href="/"
            aria-label="Voltar para o site"
            className="rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-zinc-900"
          >
            <Image
              src="/images/icb-parque-sao-vicente.png"
              alt="ICB Parque São Vicente"
              width={857}
              height={576}
              priority
              className="h-24 w-auto brightness-0"
            />
          </Link>
        </div>

        {children}

        <div className="mt-6 text-center">
          <Link
            href="/"
            className="rounded-md text-base font-medium text-zinc-700 underline-offset-4 hover:text-zinc-950 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-zinc-900"
          >
            Voltar para o site
          </Link>
        </div>
      </section>
    </main>
  );
}
