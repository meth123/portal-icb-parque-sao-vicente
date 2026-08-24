import type { ButtonHTMLAttributes } from "react";
import { classNames } from "@/lib/ui/class-names";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "default" | "compact";

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "border-transparent bg-theme-primary text-theme-primary-foreground shadow-[0_1px_2px_rgba(84,16,103,0.18)] hover:bg-theme-primary-hover hover:shadow-[0_5px_14px_rgba(84,16,103,0.16)] active:bg-theme-primary-active active:shadow-none disabled:bg-theme-primary disabled:opacity-55 disabled:shadow-none",
  secondary:
    "border-app-border bg-surface text-app-foreground shadow-[var(--shadow-subtle)] hover:border-theme-primary-border hover:bg-theme-primary-subtle active:bg-theme-primary-soft disabled:opacity-55 disabled:shadow-none",
  ghost:
    "border-transparent bg-transparent text-app-secondary hover:bg-surface-muted hover:text-app-foreground active:bg-theme-primary-soft active:text-theme-primary-active disabled:opacity-50",
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
    "inline-flex items-center justify-center gap-2 rounded-[0.875rem] border font-semibold transition-[background-color,border-color,color,box-shadow,opacity,transform] duration-150 ease-out active:scale-[0.98] active:duration-75 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:cursor-not-allowed disabled:active:scale-100 motion-reduce:transform-none",
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
