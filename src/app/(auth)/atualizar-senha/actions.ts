"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function updatePassword(formData: FormData) {
  const passwordValue = formData.get("password");
  const confirmationValue = formData.get("passwordConfirmation");

  if (
    typeof passwordValue !== "string" ||
    typeof confirmationValue !== "string" ||
    passwordValue.length < 8 ||
    passwordValue.length > 128
  ) {
    redirect("/atualizar-senha?erro=senha");
  }

  if (passwordValue !== confirmationValue) {
    redirect("/atualizar-senha?erro=confirmacao");
  }

  const supabase = await createClient();
  const { data, error: claimsError } = await supabase.auth.getClaims();

  if (claimsError || !data?.claims?.sub) {
    redirect("/login?erro=link");
  }

  const { error } = await supabase.auth.updateUser({
    password: passwordValue,
  });

  if (error) {
    redirect("/atualizar-senha?erro=atualizacao");
  }

  const { error: profileError } = await supabase.rpc(
    "complete_password_change",
  );

  if (profileError) {
    redirect("/atualizar-senha?erro=atualizacao");
  }

  await supabase.auth.signOut();
  redirect("/login?status=senha-atualizada");
}
