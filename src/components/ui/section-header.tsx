import type { ReactNode } from "react";
import { classNames } from "@/lib/ui/class-names";

type SectionHeaderProps = {
  id?: string;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
};

export function SectionHeader({
  id,
  title,
  description,
  action,
  className,
}: SectionHeaderProps) {
  return (
    <div
      className={classNames(
        "flex items-end justify-between gap-4",
        className,
      )}
    >
      <div className="min-w-0">
        <h2 id={id} className="text-lg font-semibold tracking-[-0.015em] text-app-foreground sm:text-xl">
          {title}
        </h2>
        {description ? (
          <p className="mt-1 max-w-[68ch] text-sm leading-5 text-app-secondary sm:leading-6">
            {description}
          </p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
