"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth/current-user";
import { createClient } from "@/lib/supabase/server";
import {
  isTestimonyReactionType,
  type TestimonyReactionType,
  validateTestimonyContent,
} from "@/lib/testimonies";

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type PublishTestimonyState = {
  message: string;
  success: boolean;
  fieldError?: string;
};

export type TestimonyMutationResult = {
  success: boolean;
  message: string;
  active?: boolean;
};

export async function publishTestimony(
  _previousState: PublishTestimonyState,
  formData: FormData,
): Promise<PublishTestimonyState> {
  const user = await getCurrentUser();

  if (!user?.isActive) {
    return {
      message: "Sua conta precisa estar ativa para publicar um testemunho.",
      success: false,
    };
  }

  const validation = validateTestimonyContent(formData.get("content"));
  if (validation.error) {
    return {
      message: "Revise o texto antes de enviar.",
      fieldError: validation.error,
      success: false,
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("testimonies").insert({
    content: validation.content,
  });

  if (error) {
    if (error.code === "23505") {
      revalidatePath("/portal/testemunhos");
      return {
        message:
          "Você já publicou um testemunho nesta semana. Um novo envio será liberado na segunda-feira.",
        success: false,
      };
    }

    return {
      message:
        "Não foi possível publicar seu testemunho. Atualize a página e tente novamente.",
      success: false,
    };
  }

  revalidatePath("/portal/testemunhos");

  return {
    message: "Testemunho enviado com sucesso. Obrigado por compartilhar!",
    success: true,
  };
}

export async function toggleTestimonyReaction(
  testimonyId: string,
  reactionType: TestimonyReactionType,
): Promise<TestimonyMutationResult> {
  const user = await getCurrentUser();

  if (
    !user?.isActive ||
    !uuidPattern.test(testimonyId) ||
    !isTestimonyReactionType(reactionType)
  ) {
    return {
      message: "Não foi possível atualizar essa reação.",
      success: false,
    };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("toggle_testimony_reaction", {
    target_testimony_id: testimonyId,
    target_reaction_type: reactionType,
  });

  if (error || typeof data !== "boolean") {
    return {
      message: "Não foi possível atualizar essa reação. Tente novamente.",
      success: false,
    };
  }

  revalidatePath("/portal/testemunhos");

  return { message: "", success: true, active: data };
}

export async function deleteTestimony(
  testimonyId: string,
  _previousState: TestimonyMutationResult,
  _formData: FormData,
): Promise<TestimonyMutationResult> {
  void _previousState;
  void _formData;

  const user = await getCurrentUser();
  const canModerate =
    user?.isActive === true &&
    (user.globalRole === "administrator" || user.isSupervisor);

  if (!canModerate || !uuidPattern.test(testimonyId)) {
    return {
      message: "Sua conta não possui permissão para excluir testemunhos.",
      success: false,
    };
  }

  const supabase = await createClient();
  const { error, count } = await supabase
    .from("testimonies")
    .delete({ count: "exact" })
    .eq("id", testimonyId);

  if (error || count !== 1) {
    return {
      message:
        "Não foi possível excluir esse testemunho. Talvez ele já tenha sido removido.",
      success: false,
    };
  }

  revalidatePath("/portal/testemunhos");

  return { message: "Testemunho excluído.", success: true };
}
