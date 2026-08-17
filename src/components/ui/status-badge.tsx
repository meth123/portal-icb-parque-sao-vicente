import type { HTMLAttributes } from "react";
import { classNames } from "@/lib/ui/class-names";

type StatusBadgeProps = HTMLAttributes<HTMLSpanElement> & {
  tone?: "neutral" | "theme" | "success" | "warning" | "danger";
};

const toneClasses = {
  neutral: "bg-surface-muted text-app-secondary",
  theme: "bg-theme-primary-soft text-theme-primary-active",
  success: "bg-success-soft text-success",
  warning: "bg-warning-soft text-warning",
  danger: "bg-danger-soft text-danger",
};

export function StatusBadge({
  className,
  tone = "neutral",
  ...props
}: StatusBadgeProps) {
  return (
    <span
      className={classNames(
        "inline-flex min-h-7 items-center rounded-full px-3 py-1 text-xs font-semibold",
        toneClasses[tone],
        className,
      )}
      {...props}
    />
  );
}
