import type { ButtonHTMLAttributes } from "react";
import { classNames } from "@/lib/ui/class-names";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "default" | "compact";

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "border-transparent bg-theme-primary text-theme-primary-foreground hover:bg-theme-primary-hover active:bg-theme-primary-active disabled:bg-theme-primary disabled:opacity-50",
  secondary:
    "border-app-border bg-surface text-app-foreground hover:bg-surface-muted active:bg-theme-primary-subtle disabled:opacity-50",
  ghost:
    "border-transparent bg-transparent text-app-foreground hover:bg-surface-muted active:bg-theme-primary-subtle disabled:opacity-50",
  danger:
    "border-transparent bg-danger text-white hover:brightness-95 active:brightness-90 disabled:opacity-50",
};

const sizeClasses: Record<ButtonSize, string> = {
  default: "min-h-12 px-5 py-3 text-base",
  compact: "min-h-11 px-4 py-2 text-sm",
};

export function buttonClassName({
  variant = "primary",
  size = "default",
  className,
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
} = {}) {
  return classNames(
    "inline-flex items-center justify-center gap-2 rounded-xl border font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:cursor-not-allowed",
    variantClasses[variant],
    sizeClasses[size],
    className,
  );
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
};

export function Button({
  variant = "primary",
  size = "default",
  className,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={buttonClassName({ variant, size, className })}
      {...props}
    />
  );
}
