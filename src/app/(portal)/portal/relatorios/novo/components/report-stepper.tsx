"use client";

import {
  CalendarDays,
  Check,
  Megaphone,
  UserRoundPlus,
  UsersRound,
} from "lucide-react";
import { classNames } from "@/lib/ui/class-names";
import type { ReportStep } from "../types";

const steps = [
  { value: 1, label: "Reunião", icon: CalendarDays },
  { value: 2, label: "Membros", icon: UsersRound },
  { value: 3, label: "Convidados", icon: UserRoundPlus },
  { value: 4, label: "Evangelismo", icon: Megaphone },
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
  const progress = ((currentStep - 1) / (steps.length - 1)) * 100;

  return (
    <nav
      aria-label="Etapas da Ficha de Organização"
      className="relative rounded-[1.125rem] bg-surface-muted/70 px-1.5 pt-2 sm:bg-transparent sm:px-3 sm:pt-0"
    >
      <div
        aria-hidden="true"
        className="absolute left-[12.5%] right-[12.5%] mt-[1.35rem] h-0.5 bg-app-border"
      >
        <span
          className="block h-full bg-theme-primary transition-[width]"
          style={{ width: `${progress}%` }}
        />
      </div>
      <ol className="relative grid grid-cols-4">
        {steps.map((step) => {
          const isCurrent = step.value === currentStep;
          const isComplete = step.value < currentStep;
          const canNavigate = isComplete && !disabled;
          const StepIcon = step.icon;

          return (
            <li key={step.value} className="min-w-0">
              <button
                type="button"
                aria-label={`${step.value}. ${step.label}`}
                onClick={() => canNavigate && onStepChange(step.value)}
                disabled={!canNavigate}
                aria-current={isCurrent ? "step" : undefined}
                className={classNames(
                  "flex min-h-[4.5rem] w-full min-w-0 flex-col items-center gap-2 rounded-lg px-0.5 text-center transition-[color,transform] duration-150 active:scale-[0.96] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:active:scale-100 motion-reduce:transform-none",
                  isCurrent && "text-theme-primary-active",
                  isComplete && "text-theme-primary-active",
                  !isCurrent && !isComplete && "text-app-secondary",
                  canNavigate &&
                    "cursor-pointer hover:text-theme-primary",
                )}
              >
                <span
                  aria-hidden="true"
                  className={classNames(
                    "relative z-10 flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 bg-surface transition-colors",
                    isCurrent &&
                      "border-theme-primary bg-theme-primary text-theme-primary-foreground",
                    isComplete &&
                      "border-theme-primary bg-theme-primary-soft text-theme-primary-active",
                    !isCurrent &&
                      !isComplete &&
                      "border-app-border text-app-secondary",
                  )}
                >
                  {isComplete ? (
                    <Check className="h-5 w-5" />
                  ) : (
                    <StepIcon className="h-5 w-5" />
                  )}
                </span>
                <span className="min-w-0 text-[0.625rem] font-semibold leading-3 sm:text-sm sm:leading-4">
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
