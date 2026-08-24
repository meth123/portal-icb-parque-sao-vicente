import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { SubmitButton } from "@/components/ui/submit-button";
import { getCurrentUser } from "@/lib/auth/current-user";
import { createClient } from "@/lib/supabase/server";
import { AuthPanel } from "../auth-panel";
import { PasswordInput } from "../password-input";
import { logoutFromPasswordChange, updatePassword } from "./actions";

export const metadata: Metadata = {
  title: "Nova senha | ICB Conecta",
  description: "Definição de uma nova senha para o ICB Conecta.",
  robots: { index: false, follow: false },
};

const errorMessages: Record<string, string> = {
  senha: "A senha deve ter entre 8 e 128 caracteres.",
  confirmacao: "As senhas informadas não são iguais.",
  atualizacao:
    "Não foi possível concluir a atualização da senha. Tente novamente.",
};

export default async function UpdatePasswordPage({
  searchParams,
}: PageProps<"/atualizar-senha">) {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();

  if (error || !data?.claims?.sub) redirect("/login?erro=link");

  const user = await getCurrentUser();
  if (!user) redirect("/login?erro=perfil");

  const { erro } = await searchParams;
  const errorCode = typeof erro === "string" ? erro : "";
  const errorMessage = errorMessages[errorCode];
  const isFirstAccess = user.mustChangePassword;

  return (
    <AuthPanel
      eyebrow={isFirstAccess ? "Primeiro acesso" : "Recuperação de acesso"}
      title="Crie sua nova senha"
      description={
        isFirstAccess
          ? "Crie sua senha pessoal para continuar no portal."
          : "Defina uma nova senha para concluir a recuperação da sua conta."
      }
    >
      {errorMessage ? (
        <Alert tone="danger" className="mt-6">
          {errorMessage}
        </Alert>
      ) : null}

      <form action={updatePassword} className="mt-8 space-y-5">
        <FormField id="password" label="Nova senha">
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

        <FormField id="passwordConfirmation" label="Confirmar nova senha">
          <PasswordInput
            id="passwordConfirmation"
            name="passwordConfirmation"
            autoComplete="new-password"
            required
            minLength={8}
            maxLength={128}
            placeholder="Repita a nova senha"
          />
        </FormField>

        <SubmitButton pendingLabel="Salvando..." className="w-full">
          Salvar senha
        </SubmitButton>
      </form>

      {isFirstAccess ? (
        <form action={logoutFromPasswordChange} className="mt-4">
          <Button type="submit" variant="ghost" className="w-full">
            Sair da conta
          </Button>
        </form>
      ) : null}
    </AuthPanel>
  );
}
