import type { ReactNode } from "react";
import { classNames } from "@/lib/ui/class-names";

type PageHeaderProps = {
  title: string;
  description?: string;
  eyebrow?: string;
  actions?: ReactNode;
  className?: string;
};

export function PageHeader({
  title,
  description,
  eyebrow,
  actions,
  className,
}: PageHeaderProps) {
  return (
    <header
      className={classNames(
        "flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between sm:gap-8",
        className,
      )}
    >
      <div className="min-w-0 max-w-3xl">
        {eyebrow ? (
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-theme-primary">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="mt-1.5 text-[1.75rem] font-semibold leading-[1.12] tracking-[-0.025em] text-app-foreground sm:text-4xl">
          {title}
        </h1>
        {description ? (
          <p className="mt-2.5 max-w-[65ch] text-[0.9375rem] leading-6 text-app-secondary sm:text-base sm:leading-7">
            {description}
          </p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex w-full shrink-0 flex-wrap items-center gap-2.5 sm:w-auto sm:justify-end">
          {actions}
        </div>
      ) : null}
    </header>
  );
}
