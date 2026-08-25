"use client";

import { Send } from "lucide-react";
import { useActionState, useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { controlClassName } from "@/components/ui/control-styles";
import { FormField } from "@/components/ui/form-field";
import { Surface } from "@/components/ui/surface";
import {
  countTestimonyCharacters,
  TESTIMONY_MAX_LENGTH,
} from "@/lib/testimonies";
import {
  publishTestimony,
  type PublishTestimonyState,
} from "./actions";

const initialState: PublishTestimonyState = {
  message: "",
  success: false,
};

export function TestimonyComposer({ canPublish }: { canPublish: boolean }) {
  const [state, formAction, pending] = useActionState(
    publishTestimony,
    initialState,
  );
  const [content, setContent] = useState("");
  const published = state.success || !canPublish;

  return (
    <Surface className="mt-7">
      <div className="max-w-2xl">
        <h2 className="text-lg font-semibold text-app-foreground">
          Compartilhe seu testemunho
        </h2>
        <p className="mt-1 text-sm leading-6 text-app-secondary">
          Compartilhe um testemunho que sua célula tem vivenciado.
        </p>
      </div>

      {state.message ? (
        <Alert
          tone={state.success ? "success" : "danger"}
          className="mt-4"
        >
          {state.message}
        </Alert>
      ) : null}

      {published ? (
        !state.success ? (
          <Alert tone="info" className="mt-4">
            Você já compartilhou nesta semana. Um novo envio será liberado na
            segunda-feira.
          </Alert>
        ) : null
      ) : (
        <form
          action={formAction}
          className="mt-5"
          onSubmit={(event) => {
            if (
              !window.confirm(
                "Enviar este testemunho? Você poderá compartilhar apenas um testemunho nesta semana.",
              )
            ) {
              event.preventDefault();
            }
          }}
        >
          <FormField
            id="testimony-content"
            label="Seu testemunho"
            error={state.fieldError}
            required
            labelAction={
              <span
                className={
                  countTestimonyCharacters(content) >=
                  TESTIMONY_MAX_LENGTH - 100
                    ? "font-semibold text-theme-primary-active"
                    : "text-app-secondary"
                }
              >
                {countTestimonyCharacters(content).toLocaleString("pt-BR")}/
                {TESTIMONY_MAX_LENGTH.toLocaleString("pt-BR")}
              </span>
            }
          >
            <textarea
              id="testimony-content"
              name="content"
              rows={6}
              value={content}
              required
              disabled={pending}
              aria-invalid={Boolean(state.fieldError)}
              aria-describedby={
                state.fieldError ? "testimony-content-error" : undefined
              }
              onChange={(event) => {
                const nextContent = event.target.value;
                if (
                  countTestimonyCharacters(nextContent) <=
                  TESTIMONY_MAX_LENGTH
                ) {
                  setContent(nextContent);
                }
              }}
              className={`${controlClassName} min-h-36 resize-y py-3 leading-6`}
              placeholder="Conte seu testemunho..."
            />
          </FormField>

          <div className="mt-4 flex justify-end">
            <Button type="submit" disabled={pending} aria-busy={pending}>
              <Send aria-hidden="true" className="size-5" />
              {pending ? "Enviando..." : "Enviar testemunho"}
            </Button>
          </div>
        </form>
      )}
    </Surface>
  );
}
