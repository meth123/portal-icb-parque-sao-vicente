"use client";

import { useActionState } from "react";
import { PasswordInput } from "@/app/(auth)/password-input";
import { Alert } from "@/components/ui/alert";
import { FormField } from "@/components/ui/form-field";
import { SubmitButton } from "@/components/ui/submit-button";
import {
  changeProfilePassword,
  type ChangeProfilePasswordState,
} from "./actions";

const initialState: ChangeProfilePasswordState = {
  message: "",
  success: false,
};

export function PasswordChangeForm() {
  const [state, formAction] = useActionState(
    changeProfilePassword,
    initialState,
  );

  return (
    <form action={formAction} className="space-y-5">
      {state.message ? (
        <Alert tone={state.success ? "success" : "danger"} aria-live="polite">
          {state.message}
        </Alert>
      ) : null}

      <FormField id="securityPassword" label="Nova senha">
        <PasswordInput
          id="securityPassword"
          name="password"
          autoComplete="new-password"
          minLength={8}
          maxLength={128}
          required
          placeholder="No mínimo 8 caracteres"
        />
      </FormField>

      <FormField
        id="securityPasswordConfirmation"
        label="Confirmar nova senha"
      >
        <PasswordInput
          id="securityPasswordConfirmation"
          name="passwordConfirmation"
          autoComplete="new-password"
          minLength={8}
          maxLength={128}
          required
          placeholder="Repita a nova senha"
        />
      </FormField>

      <SubmitButton pendingLabel="Salvando...">Salvar</SubmitButton>
    </form>
  );
}
