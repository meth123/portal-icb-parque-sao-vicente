"use client";

import { ChevronDown, SlidersHorizontal } from "lucide-react";
import { useId, useState, type ReactNode } from "react";
import { classNames } from "@/lib/ui/class-names";

type FilterPanelProps = {
  children: ReactNode;
  activeFilters?: number;
  className?: string;
  title?: string;
};

export function FilterPanel({
  children,
  activeFilters = 0,
  className,
  title = "Filtros",
}: FilterPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const contentId = useId();

  return (
    <section
      aria-label={title}
      className={classNames(
        "overflow-hidden rounded-[var(--radius-surface)] border border-app-border bg-surface shadow-[var(--shadow-subtle)]",
        className,
      )}
    >
      <button
        type="button"
        className="flex min-h-14 w-full items-center justify-between gap-3 px-4 text-left text-app-foreground transition-colors active:bg-theme-primary-subtle focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-focus md:hidden"
        aria-controls={contentId}
        aria-expanded={isOpen}
        onClick={() => setIsOpen((current) => !current)}
      >
        <span className="flex items-center gap-3 font-semibold">
          <SlidersHorizontal aria-hidden="true" className="size-5 text-theme-primary" />
          {title}
          {activeFilters > 0 ? (
            <span className="inline-flex min-h-6 min-w-6 items-center justify-center rounded-full bg-theme-primary-soft px-2 text-xs text-theme-primary-active">
              {activeFilters}
            </span>
          ) : null}
        </span>
        <ChevronDown
          aria-hidden="true"
          className={classNames(
            "size-5 text-app-secondary transition-transform",
            isOpen && "rotate-180",
          )}
        />
      </button>
      <div
        id={contentId}
        className={classNames(
          "border-t border-app-border p-4 md:block md:border-t-0 md:p-5",
          isOpen ? "block" : "hidden",
        )}
      >
        {children}
      </div>
    </section>
  );
}
