import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { buttonClassName } from "@/components/ui/button";
import { ThemeArtwork } from "@/components/ui/theme-artwork";

export default function Home() {
  return (
    <section className="mx-auto grid w-full max-w-7xl items-center gap-9 px-5 py-10 sm:px-7 sm:py-16 lg:grid-cols-[minmax(0,0.9fr)_minmax(28rem,1.1fr)] lg:gap-14 lg:px-10 lg:py-20">
      <div className="max-w-xl">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-theme-primary">
          ICB Parque São Vicente
        </p>
        <h1 className="mt-3 text-4xl font-semibold leading-[1.05] tracking-[-0.04em] text-app-foreground sm:text-5xl">
          Conexão para cuidar e servir melhor.
        </h1>
        <p className="mt-5 max-w-lg text-base leading-7 text-app-secondary sm:text-lg sm:leading-8">
          O ICB Conecta reúne as ferramentas internas que apoiam a liderança e a organização da igreja.
        </p>
        <Link href="/login" className={buttonClassName({ className: "mt-7 w-full sm:w-auto" })}>
          Acessar o ICB Conecta
          <ArrowRight aria-hidden="true" className="size-4" />
        </Link>
      </div>
      <ThemeArtwork
        priority
        className="min-h-64 shadow-[var(--shadow-raised)] sm:min-h-80 lg:min-h-[26rem]"
        imageClassName="object-cover"
        sizes="(max-width: 1023px) 100vw, 52vw"
      />
    </section>
  );
}
