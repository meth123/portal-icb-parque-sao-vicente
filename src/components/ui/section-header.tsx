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
      <div>
        <h2 id={id} className="text-xl font-semibold text-app-foreground">
          {title}
        </h2>
        {description ? (
          <p className="mt-1 text-sm leading-6 text-app-secondary">
            {description}
          </p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
