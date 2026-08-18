import { BookOpen } from "lucide-react";
import { ThemeArtwork } from "@/components/ui/theme-artwork";

type ReportThemeIntroductionProps = {
  priority?: boolean;
};

export function ReportThemeIntroduction({
  priority = false,
}: ReportThemeIntroductionProps) {
  return (
    <section className="mt-5 overflow-hidden rounded-2xl border border-theme-primary-border bg-theme-primary-active">
      <ThemeArtwork
        decorative
        priority={priority}
        rounded={false}
        className="aspect-[16/7] !min-h-0 sm:aspect-[16/6] lg:aspect-[16/7]"
        imageClassName="scale-[1.35] object-center lg:scale-100"
        sizes="(max-width: 1024px) 100vw, 896px"
      />
      <blockquote className="flex items-start gap-3 px-4 py-4 text-theme-primary-foreground sm:px-5">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/12">
          <BookOpen aria-hidden="true" className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <p className="font-medium leading-6">
            “Tudo, porém, seja feito com decência e ordem.”
          </p>
          <cite className="mt-1 block text-sm not-italic text-white/75">
            I Co 14:40
          </cite>
        </div>
      </blockquote>
    </section>
  );
}
