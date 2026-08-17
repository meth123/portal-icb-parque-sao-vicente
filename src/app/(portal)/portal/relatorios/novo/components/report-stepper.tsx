"use client";

import { Check } from "lucide-react";
import { classNames } from "@/lib/ui/class-names";
import type { ReportStep } from "../types";

const steps = [
  { value: 1, label: "Reunião" },
  { value: 2, label: "Participantes" },
  { value: 3, label: "Convidados" },
  { value: 4, label: "Evangelismo" },
] as const;

type ReportStepperProps = {
  currentStep: ReportStep;
  disabled?: boolean;
  onStepChange: (step: ReportStep) => void;
};

export function ReportStepper({
  currentStep,
  disabled,
  onStepChange,
}: ReportStepperProps) {
  return (
    <nav aria-label="Etapas da Ficha de Organização">
      <ol className="grid grid-cols-4 gap-1 sm:gap-3">
        {steps.map((step) => {
          const isCurrent = step.value === currentStep;
          const isComplete = step.value < currentStep;
          const canNavigate = isComplete && !disabled;

          return (
            <li key={step.value} className="min-w-0">
              <button
                type="button"
                aria-label={`${step.value}. ${step.label}`}
                onClick={() => canNavigate && onStepChange(step.value)}
                disabled={!canNavigate}
                aria-current={isCurrent ? "step" : undefined}
                className={classNames(
                  "flex min-h-12 w-full min-w-0 items-center justify-center rounded-xl border p-2 text-center transition-colors sm:min-h-14 sm:justify-start sm:gap-3 sm:px-3",
                  isCurrent &&
                    "border-theme-primary bg-theme-primary text-theme-primary-foreground",
                  isComplete &&
                    "border-theme-primary-border bg-theme-primary-subtle text-theme-primary-active hover:bg-theme-primary-soft",
                  !isCurrent &&
                    !isComplete &&
                    "border-app-border bg-surface-muted text-app-secondary",
                  canNavigate &&
                    "cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus",
                )}
              >
                <span
                  aria-hidden="true"
                  className={classNames(
                    "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs font-bold",
                    isCurrent && "border-white/40 bg-white/15",
                    isComplete &&
                      "border-theme-primary bg-theme-primary text-theme-primary-foreground",
                    !isCurrent &&
                      !isComplete &&
                      "border-app-border bg-surface",
                  )}
                >
                  {isComplete ? <Check className="h-3.5 w-3.5" /> : step.value}
                </span>
                <span className="hidden min-w-0 text-sm font-semibold sm:inline">
                  {step.label}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
