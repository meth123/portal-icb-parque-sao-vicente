import type { ReactNode } from "react";
import { classNames } from "@/lib/ui/class-names";

type FormFieldProps = {
  id: string;
  label: string;
  children: ReactNode;
  hint?: string;
  error?: string;
  labelAction?: ReactNode;
  required?: boolean;
  className?: string;
};

export function FormField({
  id,
  label,
  children,
  hint,
  error,
  labelAction,
  required,
  className,
}: FormFieldProps) {
  return (
    <div className={classNames("min-w-0", className)}>
      <div className="flex items-baseline justify-between gap-4">
        <label htmlFor={id} className="block font-semibold text-app-foreground">
          {label}
          {required ? (
            <span className="ml-1 text-danger" aria-hidden="true">
              *
            </span>
          ) : null}
        </label>
        {labelAction ? <div className="shrink-0 text-sm">{labelAction}</div> : null}
      </div>
      {hint ? (
        <p id={`${id}-hint`} className="mt-1 text-sm leading-6 text-app-secondary">
          {hint}
        </p>
      ) : null}
      <div className="mt-2">{children}</div>
      {error ? (
        <p id={`${id}-error`} className="mt-2 text-sm font-medium text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
