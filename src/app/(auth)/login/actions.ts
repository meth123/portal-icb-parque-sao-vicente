"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function login(formData: FormData) {
  const emailValue = formData.get("email");
  const passwordValue = formData.get("password");

  if (
    typeof emailValue !== "string" ||
    typeof passwordValue !== "string" ||
    !emailValue.trim() ||
    !passwordValue ||
    emailValue.length > 254 ||
    passwordValue.length > 1024
  ) {
    redirect("/login?erro=campos");
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: emailValue.trim(),
    password: passwordValue,
  });

  if (error) {
    redirect("/login?erro=credenciais");
  }

  redirect("/portal");
}
