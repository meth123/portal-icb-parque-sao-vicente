import type { HTMLAttributes } from "react";
import { classNames } from "@/lib/ui/class-names";

type StatusBadgeProps = HTMLAttributes<HTMLSpanElement> & {
  tone?: "neutral" | "theme" | "success" | "warning" | "danger";
};

const toneClasses = {
  neutral: "border-app-border bg-surface-muted text-app-secondary",
  theme: "border-theme-primary-border bg-theme-primary-soft text-theme-primary-active",
  success: "border-success/15 bg-success-soft text-success",
  warning: "border-warning/15 bg-warning-soft text-warning",
  danger: "border-danger/15 bg-danger-soft text-danger",
};

export function StatusBadge({
  className,
  tone = "neutral",
  ...props
}: StatusBadgeProps) {
  return (
    <span
      className={classNames(
        "inline-flex min-h-7 items-center rounded-full border px-3 py-1 text-xs font-semibold leading-4",
        toneClasses[tone],
        className,
      )}
      {...props}
    />
  );
}
