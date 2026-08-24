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
        "inline-flex shrink-0 items-center justify-center rounded-[0.875rem] border border-app-border bg-surface text-app-foreground transition-[background-color,border-color,color,opacity,transform] duration-150 ease-out hover:border-theme-primary-border hover:bg-theme-primary-subtle active:scale-[0.96] active:bg-theme-primary-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100 motion-reduce:transform-none",
        size === "compact" ? "h-11 w-11" : "h-12 w-12",
        className,
      )}
      {...props}
    />
  );
}
