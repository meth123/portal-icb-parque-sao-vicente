import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthPanel } from "../auth-panel";
import { ConfirmationForm } from "./confirmation-form";

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
      <ConfirmationForm tokenHash={tokenHash} type={type} />
    </AuthPanel>
  );
}
