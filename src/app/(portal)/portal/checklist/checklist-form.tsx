"use client";

import { CircleCheck, CircleMinus, LoaderCircle } from "lucide-react";
import { useActionState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  submitWeeklyChecklist,
  type WeeklyChecklistState,
} from "./actions";

const initialState: WeeklyChecklistState = { message: "", success: false };

type ChecklistFormProps = {
  initialPrayer: boolean | null;
  initialFasting: boolean | null;
};

function AnswerOptions({
  name,
  label,
  initialValue,
  positiveLabel,
  negativeLabel,
}: {
  name: string;
  label: string;
  initialValue: boolean | null;
  positiveLabel: string;
  negativeLabel: string;
}) {
  return (
    <fieldset>
      <legend className="text-base font-semibold text-app-foreground">
        {label}
      </legend>
      <div className="mt-3 grid grid-cols-2 gap-3" aria-label={label}>
        {[
          { value: "yes", label: positiveLabel, icon: CircleCheck },
          { value: "no", label: negativeLabel, icon: CircleMinus },
        ].map((option) => {
          const Icon = option.icon;
          return (
            <label
              key={option.value}
              className="relative flex min-h-20 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-theme-primary-border bg-surface px-2 py-3 text-center text-sm font-semibold text-app-secondary transition-colors has-[:checked]:border-theme-primary has-[:checked]:bg-theme-primary-soft has-[:checked]:text-theme-primary-active has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-focus"
            >
              <input
                type="radio"
                name={name}
                value={option.value}
                defaultChecked={initialValue === (option.value === "yes")}
                required
                className="absolute inset-0 h-full w-full cursor-pointer appearance-none opacity-0"
              />
              <Icon aria-hidden="true" size={23} strokeWidth={1.8} />
              {option.label}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

export function ChecklistForm({
  initialPrayer,
  initialFasting,
}: ChecklistFormProps) {
  const [state, formAction, pending] = useActionState(
    submitWeeklyChecklist,
    initialState,
  );

  return (
    <form action={formAction} className="space-y-6">
      {state.message ? (
        <Alert tone={state.success ? "success" : "danger"} className="mb-4">
          {state.message}
        </Alert>
      ) : null}

      <AnswerOptions
        name="prayedInGroup"
        label="Participou da oração em grupo?"
        initialValue={initialPrayer}
        positiveLabel="Participei"
        negativeLabel="Não participei"
      />
      <AnswerOptions
        name="fastedForCell"
        label="Jejuou pela célula?"
        initialValue={initialFasting}
        positiveLabel="Jejuei"
        negativeLabel="Não jejuei"
      />

      <Button
        type="submit"
        disabled={pending}
        className="w-full sm:w-auto sm:min-w-52"
      >
        {pending ? (
          <>
            <LoaderCircle aria-hidden="true" className="animate-spin" size={19} />
            Salvando...
          </>
        ) : (
          "Salvar respostas"
        )}
      </Button>
    </form>
  );
}
