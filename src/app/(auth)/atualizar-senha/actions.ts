"use server";

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import { isValidNewPassword } from "@/lib/auth/passwords";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function updatePassword(formData: FormData) {
  const passwordValue = formData.get("password");
  const confirmationValue = formData.get("passwordConfirmation");

  if (
    typeof passwordValue !== "string" ||
    typeof confirmationValue !== "string" ||
    !isValidNewPassword(passwordValue)
  ) {
    redirect("/atualizar-senha?erro=senha");
  }

  if (passwordValue !== confirmationValue) {
    redirect("/atualizar-senha?erro=confirmacao");
  }

  const currentUser = await getCurrentUser();
  if (!currentUser) redirect("/login?erro=link");

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({
    password: passwordValue,
  });

  if (error) redirect("/atualizar-senha?erro=atualizacao");

  if (currentUser.mustChangePassword) {
    let adminClient: ReturnType<typeof createAdminClient>;

    try {
      adminClient = createAdminClient();
    } catch {
      redirect("/atualizar-senha?erro=atualizacao");
    }

    const { data: completedProfile, error: profileError } =
      await adminClient.rpc("complete_required_password_change", {
        target_profile_id: currentUser.id,
      });

    if (profileError || completedProfile !== true) {
      redirect("/atualizar-senha?erro=atualizacao");
    }

    redirect("/portal?status=senha-atualizada");
  }

  await supabase.auth.signOut();
  redirect("/login?status=senha-atualizada");
}

export async function logoutFromPasswordChange() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
