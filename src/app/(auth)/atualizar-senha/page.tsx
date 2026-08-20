import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Alert } from "@/components/ui/alert";
import { FormField } from "@/components/ui/form-field";
import { SubmitButton } from "@/components/ui/submit-button";
import { createClient } from "@/lib/supabase/server";
import { AuthPanel } from "../auth-panel";
import { PasswordInput } from "../password-input";
import { updatePassword } from "./actions";

export const metadata: Metadata = {
  title: "Nova senha | ICB Conecta",
  description: "Definição de uma nova senha para o ICB Conecta.",
  robots: {
    index: false,
    follow: false,
  },
};

const errorMessages: Record<string, string> = {
  senha: "A senha deve ter entre 8 e 128 caracteres.",
  confirmacao: "As senhas informadas não são iguais.",
  atualizacao: "Não foi possível atualizar a senha. Solicite um novo link.",
};

export default async function UpdatePasswordPage({
  searchParams,
}: PageProps<"/atualizar-senha">) {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();

  if (error || !data?.claims?.sub) {
    redirect("/login?erro=link");
  }

  const { erro } = await searchParams;
  const errorCode = typeof erro === "string" ? erro : "";
  const errorMessage = errorMessages[errorCode];

  return (
    <AuthPanel
      eyebrow="Primeiro acesso ou recuperação"
      title="Crie sua senha de acesso"
      description="Você deve criar uma senha nesta tela. Ela não foi definida nem enviada por outra pessoa."
    >
      {errorMessage ? (
        <Alert tone="danger" className="mt-6">
          {errorMessage}
        </Alert>
      ) : null}

      <form action={updatePassword} className="mt-8 space-y-5">
        <FormField id="password" label="Crie uma senha">
          <PasswordInput
            id="password"
            name="password"
            autoComplete="new-password"
            required
            minLength={8}
            maxLength={128}
            placeholder="No mínimo 8 caracteres"
          />
        </FormField>

        <FormField id="passwordConfirmation" label="Digite a senha novamente">
          <PasswordInput
            id="passwordConfirmation"
            name="passwordConfirmation"
            autoComplete="new-password"
            required
            minLength={8}
            maxLength={128}
            placeholder="Repita a senha criada acima"
          />
        </FormField>

        <SubmitButton pendingLabel="Salvando..." className="w-full">
          Salvar minha senha
        </SubmitButton>
      </form>
    </AuthPanel>
  );
}
