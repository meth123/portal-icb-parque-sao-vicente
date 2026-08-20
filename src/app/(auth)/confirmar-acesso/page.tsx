import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SubmitButton } from "@/components/ui/submit-button";
import { AuthPanel } from "../auth-panel";
import { confirmAccess } from "./actions";

export const metadata: Metadata = {
  title: "Confirmar acesso | ICB Conecta",
  description: "Confirmação segura do acesso ao ICB Conecta.",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function ConfirmAccessPage({
  searchParams,
}: PageProps<"/confirmar-acesso">) {
  const { token_hash: tokenHashValue, type: typeValue } = await searchParams;
  const tokenHash = typeof tokenHashValue === "string" ? tokenHashValue : "";
  const type = typeValue === "invite" || typeValue === "recovery" ? typeValue : "";

  if (tokenHash.length < 20 || !type) {
    redirect("/login?erro=link");
  }

  return (
    <AuthPanel
      eyebrow="Acesso protegido"
      title="Confirme para continuar"
      description="Toque no botão abaixo para criar sua senha de acesso."
    >
      <form action={confirmAccess} className="mt-8">
        <input type="hidden" name="tokenHash" value={tokenHash} />
        <input type="hidden" name="type" value={type} />
        <SubmitButton pendingLabel="Confirmando..." className="w-full">
          Continuar e criar minha senha
        </SubmitButton>
      </form>
    </AuthPanel>
  );
}
