"use client";

import { useActionState } from "react";
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
}: {
  name: string;
  label: string;
  initialValue: boolean | null;
}) {
  return (
    <fieldset>
      <legend className="text-base font-semibold text-zinc-950">{label} *</legend>
      <div className="mt-3 grid grid-cols-2 gap-3">
        {[
          ["yes", "Sim"],
          ["no", "Não"],
        ].map(([value, text]) => (
          <label
            key={value}
            className="flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-xl border border-zinc-300 bg-white px-4 font-semibold text-zinc-900 has-[:checked]:border-zinc-950 has-[:checked]:bg-zinc-950 has-[:checked]:text-white"
          >
            <input
              type="radio"
              name={name}
              value={value}
              defaultChecked={initialValue === (value === "yes")}
              required
              className="h-4 w-4 accent-zinc-950"
            />
            {text}
          </label>
        ))}
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
    <form action={formAction} className="mt-5 space-y-6">
      {state.message ? (
        <p
          role={state.success ? "status" : "alert"}
          className={`rounded-xl border px-4 py-3 text-center text-sm font-medium ${
            state.success
              ? "border-green-200 bg-green-50 text-green-900"
              : "border-red-200 bg-red-50 text-red-800"
          }`}
        >
          {state.message}
        </p>
      ) : null}

      <AnswerOptions
        name="prayedInGroup"
        label="Oração em Grupo"
        initialValue={initialPrayer}
      />
      <AnswerOptions
        name="fastedForCell"
        label="Jejum pela Célula"
        initialValue={initialFasting}
      />

      <button
        type="submit"
        disabled={pending}
        className="min-h-12 w-full rounded-xl bg-zinc-950 px-5 font-semibold text-white hover:bg-zinc-800 disabled:cursor-wait disabled:bg-zinc-500"
      >
        {pending ? "Salvando..." : "Salvar respostas"}
      </button>
    </form>
  );
}
