import type { ReactNode } from "react";
import { classNames } from "@/lib/ui/class-names";

type EmptyStateProps = {
  title: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
  className?: string;
};

export function EmptyState({
  title,
  description,
  icon,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={classNames(
        "flex min-h-48 flex-col items-center justify-center rounded-[var(--radius-surface)] border border-dashed border-app-border bg-surface/65 px-5 py-9 text-center",
        className,
      )}
    >
      {icon ? (
        <div className="mb-4 text-theme-primary" aria-hidden="true">
          {icon}
        </div>
      ) : null}
      <h2 className="text-lg font-semibold text-app-foreground">{title}</h2>
      {description ? (
        <p className="mt-2 max-w-md text-sm leading-6 text-app-secondary">
          {description}
        </p>
      ) : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
