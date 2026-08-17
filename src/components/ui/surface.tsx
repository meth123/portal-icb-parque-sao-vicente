import type { HTMLAttributes } from "react";
import { classNames } from "@/lib/ui/class-names";

type SurfaceProps = HTMLAttributes<HTMLDivElement> & {
  tone?: "default" | "muted" | "theme";
};

const toneClasses = {
  default: "border-app-border bg-surface",
  muted: "border-transparent bg-surface-muted",
  theme: "border-theme-primary-border bg-theme-primary-subtle",
};

export function Surface({
  className,
  tone = "default",
  ...props
}: SurfaceProps) {
  return (
    <div
      className={classNames(
        "rounded-2xl border p-4 sm:p-5",
        toneClasses[tone],
        className,
      )}
      {...props}
    />
  );
}
