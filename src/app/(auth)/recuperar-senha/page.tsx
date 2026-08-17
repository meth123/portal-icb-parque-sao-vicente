import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { FormField } from "@/components/ui/form-field";
import { SubmitButton } from "@/components/ui/submit-button";
import { AuthPanel } from "../auth-panel";
import { authInputClassName, authTextLinkClassName } from "../auth-styles";
import { requestPasswordRecovery } from "./actions";

export const metadata: Metadata = {
  title: "Recuperar senha | ICB Conecta",
  description: "Recuperação de acesso ao ICB Conecta.",
  robots: {
    index: false,
    follow: false,
  },
};

const errorMessages: Record<string, string> = {
  campos: "Informe um endereço de e-mail válido.",
  envio: "Não foi possível iniciar a recuperação agora. Tente novamente.",
};

export default async function RecoverPasswordPage({
  searchParams,
}: PageProps<"/recuperar-senha">) {
  const { erro, status } = await searchParams;
  const errorCode = typeof erro === "string" ? erro : "";
  const sent = status === "enviado";

  return (
    <AuthPanel
      eyebrow="Recuperação de acesso"
      title="Esqueci minha senha"
      description="Informe o e-mail da sua conta para receber as instruções."
    >
      {sent ? (
        <Alert tone="success" className="mt-6">
          Se existir uma conta autorizada para esse e-mail, enviaremos um link
          para criar uma nova senha. Verifique também a caixa de spam.
        </Alert>
      ) : (
        <>
          {errorMessages[errorCode] ? (
            <Alert tone="danger" className="mt-6">
              {errorMessages[errorCode]}
            </Alert>
          ) : null}

          <form action={requestPasswordRecovery} className="mt-8 space-y-5">
            <FormField id="email" label="E-mail">
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                maxLength={254}
                placeholder="seuemail@exemplo.com"
                className={authInputClassName}
              />
            </FormField>

            <SubmitButton pendingLabel="Enviando..." className="w-full">
              Enviar link de recuperação
            </SubmitButton>
          </form>
        </>
      )}

      <div className="mt-6 text-center">
        <Link
          href="/login"
          className={`${authTextLinkClassName} inline-flex min-h-11 items-center gap-2 text-sm`}
        >
          <ArrowLeft aria-hidden="true" size={18} strokeWidth={1.8} />
          Voltar para o login
        </Link>
      </div>
    </AuthPanel>
  );
}
