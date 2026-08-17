import Image from "next/image";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";
import { ThemeArtwork } from "@/components/ui/theme-artwork";
import packageJson from "../../../package.json";
import { authTextLinkClassName } from "./auth-styles";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="min-h-dvh bg-surface lg:grid lg:grid-cols-[minmax(0,1.15fr)_minmax(28rem,0.85fr)]">
      <div className="h-40 overflow-hidden bg-theme-artwork sm:h-52 lg:sticky lg:top-0 lg:h-dvh">
        <ThemeArtwork
          decorative
          priority
          rounded={false}
          sizes="(max-width: 1023px) 135vw, 67vw"
          className="h-full min-h-0"
          imageClassName="scale-[1.35] lg:scale-[1.16] lg:object-contain"
        />
      </div>

      <section
        aria-label="Acesso ao ICB Conecta"
        className="flex min-h-[calc(100dvh-10rem)] items-center bg-surface px-5 pb-[max(2.5rem,env(safe-area-inset-bottom))] pt-9 sm:min-h-[calc(100dvh-13rem)] sm:px-10 sm:pt-10 lg:min-h-dvh lg:px-12 lg:py-12 xl:px-16"
      >
        <div className="mx-auto w-full max-w-md">
          <Link
            href="/"
            aria-label="Voltar para o site"
            className="inline-flex rounded-xl focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-focus"
          >
            <Image
              src="/images/icb-parque-sao-vicente.png"
              alt="ICB Parque São Vicente"
              width={857}
              height={576}
              priority
              className="h-16 w-auto brightness-0 sm:h-20"
            />
          </Link>

          <div className="mt-7 sm:mt-8">{children}</div>

          <div className="mt-8 flex items-center justify-between gap-4">
            <Link
              href="/"
              className={`${authTextLinkClassName} inline-flex min-h-11 items-center gap-2 text-sm`}
            >
              <ArrowLeft aria-hidden="true" size={18} strokeWidth={1.8} />
              Voltar para o site
            </Link>
            <span className="text-xs text-app-secondary">
              v{packageJson.version}
            </span>
          </div>
        </div>
      </section>
    </main>
  );
}
