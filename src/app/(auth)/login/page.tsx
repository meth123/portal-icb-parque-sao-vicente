import type { Metadata } from "next";
import Link from "next/link";
import { Alert } from "@/components/ui/alert";
import { FormField } from "@/components/ui/form-field";
import { SubmitButton } from "@/components/ui/submit-button";
import { AuthPanel } from "../auth-panel";
import { authInputClassName, authTextLinkClassName } from "../auth-styles";
import { PasswordInput } from "../password-input";
import { login } from "./actions";

export const metadata: Metadata = {
  title: "Login | ICB Conecta",
  description: "Acesso ao ICB Conecta.",
  robots: {
    index: false,
    follow: false,
  },
};

const errorMessages: Record<string, string> = {
  campos: "Preencha o e-mail e a senha.",
  credenciais: "E-mail ou senha inválidos.",
  perfil: "Seu perfil ainda não está disponível. Procure um administrador.",
  link: "O link de acesso é inválido ou expirou. Solicite um novo link.",
};

const statusMessages: Record<string, string> = {
  "senha-atualizada": "Senha atualizada. Entre com sua nova senha.",
};

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { erro, status } = await searchParams;
  const errorCode = typeof erro === "string" ? erro : "";
  const statusCode = typeof status === "string" ? status : "";
  const errorMessage = errorMessages[errorCode];
  const statusMessage = statusMessages[statusCode];

  return (
    <AuthPanel title="Entrar no ICB Conecta">
      {errorMessage ? (
        <Alert tone="danger" className="mt-6">
          {errorMessage}
        </Alert>
      ) : null}

      {statusMessage ? (
        <Alert tone="success" className="mt-6">
          {statusMessage}
        </Alert>
      ) : null}

      <form action={login} className="mt-6 space-y-5">
        <FormField id="email" label="E-mail">
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            placeholder="seuemail@exemplo.com"
            className={authInputClassName}
          />
        </FormField>

        <FormField
          id="password"
          label="Senha"
          labelAction={
            <Link href="/recuperar-senha" className={authTextLinkClassName}>
              Esqueci a senha
            </Link>
          }
        >
          <PasswordInput
            id="password"
            name="password"
            autoComplete="current-password"
            required
            placeholder="Sua senha"
          />
        </FormField>

        <SubmitButton pendingLabel="Entrando..." className="w-full">
          Entrar
        </SubmitButton>
      </form>

    </AuthPanel>
  );
}
