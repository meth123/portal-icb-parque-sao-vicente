"use server";

import { getCurrentUser } from "@/lib/auth/current-user";
import { isValidNewPassword } from "@/lib/auth/passwords";
import { createClient } from "@/lib/supabase/server";

export type ChangeProfilePasswordState = {
  message: string;
  success: boolean;
};

export async function changeProfilePassword(
  _previousState: ChangeProfilePasswordState,
  formData: FormData,
): Promise<ChangeProfilePasswordState> {
  const user = await getCurrentUser();

  if (!user || !user.isActive || user.mustChangePassword) {
    return {
      message: "Sua sessão não pode alterar a senha por esta tela.",
      success: false,
    };
  }

  const password = formData.get("password");
  const confirmation = formData.get("passwordConfirmation");

  if (typeof password !== "string" || !isValidNewPassword(password)) {
    return {
      message: "A senha deve ter entre 8 e 128 caracteres.",
      success: false,
    };
  }

  if (password !== confirmation) {
    return { message: "As senhas informadas não são iguais.", success: false };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    return {
      message: "Não foi possível alterar a senha. Tente novamente.",
      success: false,
    };
  }

  return { message: "Senha alterada com sucesso.", success: true };
}
