import type { ReactNode } from "react";
import { classNames } from "@/lib/ui/class-names";

type FormSectionProps = {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
};

export function FormSection({
  title,
  description,
  children,
  className,
}: FormSectionProps) {
  return (
    <section
      className={classNames(
        "border-t border-app-border pt-6 first:border-t-0 first:pt-0",
        className,
      )}
    >
      <div className="max-w-2xl">
        <h2 className="text-lg font-semibold tracking-[-0.015em] text-app-foreground">
          {title}
        </h2>
        {description ? (
          <p className="mt-1 text-sm leading-6 text-app-secondary">
            {description}
          </p>
        ) : null}
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}
