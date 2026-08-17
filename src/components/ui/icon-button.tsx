import type { ButtonHTMLAttributes } from "react";
import { classNames } from "@/lib/ui/class-names";

type IconButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  "aria-label": string;
  size?: "default" | "compact";
};

export function IconButton({
  className,
  size = "default",
  type = "button",
  ...props
}: IconButtonProps) {
  return (
    <button
      type={type}
      className={classNames(
        "inline-flex shrink-0 items-center justify-center rounded-xl border border-app-border bg-surface text-app-foreground transition-colors hover:bg-surface-muted active:bg-theme-primary-subtle focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:cursor-not-allowed disabled:opacity-50",
        size === "compact" ? "h-11 w-11" : "h-12 w-12",
        className,
      )}
      {...props}
    />
  );
}
