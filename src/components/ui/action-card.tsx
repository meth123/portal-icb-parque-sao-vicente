import { ArrowRight } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { classNames } from "@/lib/ui/class-names";

type ActionCardProps = {
  href: string;
  title: string;
  description: string;
  icon: ReactNode;
  meta?: ReactNode;
  tone?: "default" | "theme";
  layout?: "card" | "list";
  className?: string;
};

export function ActionCard({
  href,
  title,
  description,
  icon,
  meta,
  tone = "default",
  layout = "card",
  className,
}: ActionCardProps) {
  const toneClassName =
    tone === "theme"
      ? "border-theme-primary-border bg-theme-primary-subtle hover:bg-theme-primary-soft"
      : "border-app-border bg-surface hover:border-theme-primary-border hover:bg-theme-primary-subtle";

  if (layout === "list") {
    return (
      <Link
        href={href}
        className={classNames(
          "group grid min-h-[4.75rem] grid-cols-[2.5rem_minmax(0,1fr)_auto] items-center gap-3 rounded-[1.0625rem] border px-3.5 py-3 transition-[background-color,border-color,box-shadow,transform] duration-150 ease-out active:scale-[0.985] focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-focus motion-reduce:transform-none sm:px-4",
          toneClassName,
          className,
        )}
      >
        <span
          aria-hidden="true"
          className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-theme-primary-soft text-theme-primary-active"
        >
          {icon}
        </span>
        <span className="min-w-0">
          <span className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-app-foreground">{title}</span>
            {meta ? <span className="min-w-0">{meta}</span> : null}
          </span>
          <span className="mt-0.5 block text-sm leading-5 text-app-secondary">
            {description}
          </span>
        </span>
        <ArrowRight
          aria-hidden="true"
          className="shrink-0 text-theme-primary transition-transform duration-150 group-hover:translate-x-0.5 group-active:translate-x-1 motion-reduce:transform-none"
          size={19}
          strokeWidth={1.8}
        />
      </Link>
    );
  }

  return (
    <Link
      href={href}
      className={classNames(
        "group flex min-h-32 flex-col justify-between rounded-[var(--radius-surface)] border p-5 shadow-[var(--shadow-subtle)] transition-[background-color,border-color,box-shadow,transform] duration-150 ease-out hover:shadow-[var(--shadow-raised)] active:scale-[0.985] active:shadow-none focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-focus motion-reduce:transform-none",
        toneClassName,
        className,
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <span
          aria-hidden="true"
          className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-theme-primary-soft text-theme-primary-active"
        >
          {icon}
        </span>
        {meta ? <div className="min-w-0">{meta}</div> : null}
      </div>
      <div className="mt-4 flex items-end justify-between gap-4">
        <div className="min-w-0">
          <h3 className="font-semibold text-app-foreground">{title}</h3>
          <p className="mt-1 text-sm leading-6 text-app-secondary">
            {description}
          </p>
        </div>
        <ArrowRight
          aria-hidden="true"
          className="mb-1 shrink-0 text-theme-primary transition-transform duration-150 group-hover:translate-x-1 group-active:translate-x-1.5 motion-reduce:transform-none"
          size={20}
          strokeWidth={1.8}
        />
      </div>
    </Link>
  );
}
