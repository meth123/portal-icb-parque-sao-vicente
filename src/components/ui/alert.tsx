import type { HTMLAttributes } from "react";
import { classNames } from "@/lib/ui/class-names";

type AlertProps = HTMLAttributes<HTMLDivElement> & {
  tone?: "info" | "success" | "warning" | "danger";
};

const toneClasses = {
  info: "border-theme-primary-border bg-theme-primary-subtle text-theme-primary-active",
  success: "border-success/20 bg-success-soft text-success",
  warning: "border-warning/20 bg-warning-soft text-warning",
  danger: "border-danger/20 bg-danger-soft text-danger",
};

export function Alert({
  className,
  tone = "info",
  role,
  ...props
}: AlertProps) {
  return (
    <div
      role={role ?? (tone === "danger" ? "alert" : "status")}
      className={classNames(
        "rounded-xl border px-4 py-3 text-sm font-medium leading-6",
        toneClasses[tone],
        className,
      )}
      {...props}
    />
  );
}
