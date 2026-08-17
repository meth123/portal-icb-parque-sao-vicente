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
  className?: string;
};

export function ActionCard({
  href,
  title,
  description,
  icon,
  meta,
  tone = "default",
  className,
}: ActionCardProps) {
  return (
    <Link
      href={href}
      className={classNames(
        "group flex min-h-32 flex-col justify-between rounded-2xl border p-5 transition-colors focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-focus",
        tone === "theme"
          ? "border-theme-primary-border bg-theme-primary-subtle hover:bg-theme-primary-soft"
          : "border-app-border bg-surface hover:border-theme-primary-border hover:bg-theme-primary-subtle",
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
          className="mb-1 shrink-0 text-theme-primary transition-transform group-hover:translate-x-1"
          size={20}
          strokeWidth={1.8}
        />
      </div>
    </Link>
  );
}
