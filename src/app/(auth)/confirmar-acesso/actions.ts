"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function confirmAccess(formData: FormData) {
  const tokenHash = formData.get("tokenHash");
  const type = formData.get("type");

  if (
    typeof tokenHash !== "string" ||
    tokenHash.length < 20 ||
    (type !== "invite" && type !== "recovery")
  ) {
    redirect("/login?erro=link");
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({
    token_hash: tokenHash,
    type,
  });

  if (error) {
    redirect("/login?erro=link");
  }

  redirect("/atualizar-senha");
}
