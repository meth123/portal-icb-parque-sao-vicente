import type { ReactNode } from "react";
import { classNames } from "@/lib/ui/class-names";

type MetricCardProps = {
  label: string;
  value: ReactNode;
  note?: string;
  icon?: ReactNode;
  tone?: "default" | "theme" | "success" | "warning";
  className?: string;
};

const toneClasses = {
  default: "border-app-border bg-surface",
  theme: "border-theme-primary-border bg-theme-primary-subtle",
  success: "border-success/20 bg-success-soft",
  warning: "border-warning/20 bg-warning-soft",
};

export function MetricCard({
  label,
  value,
  note,
  icon,
  tone = "default",
  className,
}: MetricCardProps) {
  return (
    <div
      className={classNames(
        "min-w-0 rounded-2xl border p-4",
        toneClasses[tone],
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <dt className="text-sm font-medium text-app-secondary">{label}</dt>
        {icon ? (
          <span
            aria-hidden="true"
            className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-surface text-theme-primary-active"
          >
            {icon}
          </span>
        ) : null}
      </div>
      <dd className="mt-2 text-2xl font-semibold text-app-foreground">{value}</dd>
      {note ? <p className="mt-1 text-xs text-app-secondary">{note}</p> : null}
    </div>
  );
}
