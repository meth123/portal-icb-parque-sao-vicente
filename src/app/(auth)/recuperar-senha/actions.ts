"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

function getRequestOrigin(originHeader: string | null) {
  if (!originHeader) {
    return null;
  }

  try {
    const origin = new URL(originHeader);

    if (origin.protocol !== "http:" && origin.protocol !== "https:") {
      return null;
    }

    return origin.origin;
  } catch {
    return null;
  }
}

export async function requestPasswordRecovery(formData: FormData) {
  const emailValue = formData.get("email");

  if (
    typeof emailValue !== "string" ||
    !emailValue.trim() ||
    emailValue.length > 254
  ) {
    redirect("/recuperar-senha?erro=campos");
  }

  const requestHeaders = await headers();
  const origin = getRequestOrigin(requestHeaders.get("origin"));

  if (!origin) {
    redirect("/recuperar-senha?erro=envio");
  }

  const supabase = await createClient();

  await supabase.auth.resetPasswordForEmail(emailValue.trim(), {
    redirectTo: `${origin}/auth/confirm?next=/atualizar-senha`,
  });

  // A mesma resposta é usada mesmo quando o e-mail não existe.
  redirect("/recuperar-senha?status=enviado");
}
