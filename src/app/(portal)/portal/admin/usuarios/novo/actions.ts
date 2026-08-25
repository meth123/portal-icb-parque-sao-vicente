"use server";

import { revalidatePath } from "next/cache";
import {
  canAccessAdministration,
  getCurrentUser,
} from "@/lib/auth/current-user";
import { generateTemporaryPassword } from "@/lib/auth/passwords";
import { getSaoPauloDate } from "@/lib/dates/sao-paulo";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type CreateQuickUserState = {
  message: string;
  success: boolean;
  createdName?: string;
  createdEmail?: string;
  temporaryPassword?: string;
  requiresLeaderReplacement?: boolean;
  currentLeaderName?: string;
};

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const datePattern = /^\d{4}-\d{2}-\d{2}$/;

function readString(formData: FormData, field: string) {
  const value = formData.get(field);
  return typeof value === "string" ? value.trim() : "";
}

function isRealDate(value: string) {
  if (!datePattern.test(value)) return false;

  const [year, month, day] = value.split("-").map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));

  return (
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day
  );
}

function registrationError(
  message: string,
  details?: Pick<
    CreateQuickUserState,
    "requiresLeaderReplacement" | "currentLeaderName"
  >,
): CreateQuickUserState {
  return { message, success: false, ...details };
}

export async function createQuickUser(
  _previousState: CreateQuickUserState,
  formData: FormData,
): Promise<CreateQuickUserState> {
  const currentUser = await getCurrentUser();

  if (!currentUser || !canAccessAdministration(currentUser)) {
    return registrationError(
      "Sua conta não possui permissão para cadastrar usuários.",
    );
  }

  const fullName = readString(formData, "fullName").replace(/\s+/g, " ");
  const email = readString(formData, "email").toLocaleLowerCase("pt-BR");
  const birthDate = readString(formData, "birthDate");
  const cellId = readString(formData, "cellId");
  const leadershipRole = readString(formData, "leadershipRole");
  const leadershipStartedOn = readString(formData, "leadershipStartedOn");
  const confirmLeaderReplacement =
    formData.get("confirmLeaderReplacement") === "yes";
  const currentLocalDate = getSaoPauloDate();
  const hasCell = cellId.length > 0;
  const hasRole = leadershipRole.length > 0;

  if (fullName.length < 2 || fullName.length > 120) {
    return registrationError("Informe um nome válido.");
  }

  if (email.length > 254 || !emailPattern.test(email)) {
    return registrationError("Informe um e-mail válido.");
  }

  if (!isRealDate(birthDate) || birthDate > currentLocalDate) {
    return registrationError("Informe uma data de nascimento válida.");
  }

  if (
    leadershipStartedOn &&
    (!isRealDate(leadershipStartedOn) ||
      leadershipStartedOn > currentLocalDate)
  ) {
    return registrationError("Informe uma data de início na liderança válida.");
  }

  if (hasCell !== hasRole) {
    return registrationError(
      "Para criar um vínculo, selecione a célula e a função.",
    );
  }

  if (
    hasRole &&
    leadershipRole !== "leader" &&
    leadershipRole !== "vice_leader"
  ) {
    return registrationError("Selecione uma função válida.");
  }

  const supabase = await createClient();
  let currentLeaderName: string | undefined;

  if (hasCell) {
    if (!uuidPattern.test(cellId)) {
      return registrationError("Selecione uma célula válida.");
    }

    const [cellResult, leadershipResult, directoryResult] = await Promise.all([
      supabase
        .from("cells")
        .select("id, is_active, started_on")
        .eq("id", cellId)
        .maybeSingle(),
      supabase
        .from("cell_leaderships")
        .select("profile_id")
        .eq("cell_id", cellId)
        .eq("role", "leader")
        .is("ends_on", null)
        .maybeSingle(),
      supabase.rpc("get_cell_management_profile_directory"),
    ]);

    if (
      cellResult.error ||
      leadershipResult.error ||
      directoryResult.error ||
      !cellResult.data?.is_active
    ) {
      return registrationError(
        "Não foi possível validar a célula selecionada.",
      );
    }

    const currentLeaderId = leadershipResult.data?.profile_id;
    if (currentLeaderId) {
      const leader = (directoryResult.data ?? []).find(
        (profile: {
          profile_id: string;
          full_name: string | null;
          email: string;
        }) => profile.profile_id === currentLeaderId,
      );
      currentLeaderName = leader?.full_name ?? leader?.email ?? "Nome não informado";
    }

    if (
      leadershipRole === "leader" &&
      currentLeaderId &&
      !confirmLeaderReplacement
    ) {
      return registrationError(
        `Esta célula já possui um líder ativo: ${currentLeaderName}.`,
        {
          requiresLeaderReplacement: true,
          currentLeaderName,
        },
      );
    }
  }

  let adminClient: ReturnType<typeof createAdminClient>;

  try {
    adminClient = createAdminClient();
  } catch {
    return registrationError(
      "O cadastro de usuários ainda não foi configurado no servidor.",
    );
  }

  const temporaryPassword = generateTemporaryPassword();
  const { data: createdAccount, error: createAccountError } =
    await adminClient.auth.admin.createUser({
      email,
      password: temporaryPassword,
      email_confirm: true,
      user_metadata: { full_name: fullName },
    });

  if (createAccountError || !createdAccount.user?.id) {
    const alreadyExists =
      createAccountError?.code === "email_exists" ||
      createAccountError?.message.toLocaleLowerCase("pt-BR").includes("already") ||
      createAccountError?.message.toLocaleLowerCase("pt-BR").includes("registered");

    return registrationError(
      alreadyExists
        ? "Já existe uma conta com este e-mail."
        : "Não foi possível criar a conta. Tente novamente.",
    );
  }

  const createdProfileId = createdAccount.user.id;
  const { error: finalizationError } = await supabase.rpc(
    "finalize_quick_user_registration",
    {
      target_profile_id: createdProfileId,
      target_full_name: fullName,
      target_birth_date: birthDate,
      target_leadership_started_on: leadershipStartedOn || null,
      target_cell_id: hasCell ? cellId : null,
      target_leadership_role: hasRole ? leadershipRole : null,
      target_confirm_leader_replacement: confirmLeaderReplacement,
    },
  );

  if (finalizationError) {
    const { error: rollbackError } =
      await adminClient.auth.admin.deleteUser(createdProfileId);

    if (rollbackError) {
      return registrationError(
        "A conta do Auth foi criada, mas o perfil não pôde ser concluído. Não tente novamente com o mesmo e-mail antes de revisar esta conta no Supabase.",
      );
    }

    const errorMessages: Record<string, string> = {
      QUICK_REGISTRATION_FORBIDDEN:
        "Sua conta não possui permissão para cadastrar usuários.",
      QUICK_REGISTRATION_INVALID: "Revise os dados pessoais informados.",
      QUICK_REGISTRATION_LEADERSHIP_DATE_INVALID:
        "Revise a data de início na liderança.",
      QUICK_REGISTRATION_LEADERSHIP_INVALID:
        "Para criar um vínculo, selecione a célula e a função.",
      QUICK_REGISTRATION_CELL_NOT_ACTIVE:
        "A célula selecionada não está mais ativa.",
      QUICK_REGISTRATION_CELL_DATE_INVALID:
        "A célula selecionada possui uma data de início futura.",
      QUICK_REGISTRATION_CELL_LEADERSHIP_DATE_INVALID:
        "A data de início na liderança deve estar entre o início da célula e hoje.",
      QUICK_REGISTRATION_LEADER_REPLACEMENT_REQUIRED:
        `Esta célula já possui um líder ativo${currentLeaderName ? `: ${currentLeaderName}` : ""}. Confirme a substituição para continuar.`,
      CELL_PROFILE_ASSIGNED_ELSEWHERE:
        "Não foi possível criar o vínculo porque a conta já possui outra liderança ativa.",
      CELL_EFFECTIVE_DATE_TOO_EARLY:
        "Não foi possível substituir a liderança na data de hoje.",
    };

    return registrationError(
      errorMessages[finalizationError.message] ??
        "A conta não foi criada porque não foi possível concluir o perfil e o vínculo.",
      finalizationError.message ===
        "QUICK_REGISTRATION_LEADER_REPLACEMENT_REQUIRED"
        ? {
            requiresLeaderReplacement: true,
            currentLeaderName,
          }
        : undefined,
    );
  }

  revalidatePath("/portal/admin");
  revalidatePath("/portal/admin/celulas");
  if (hasCell) revalidatePath(`/portal/admin/celulas/${cellId}`);

  return {
    message: "Usuário criado.",
    success: true,
    createdName: fullName,
    createdEmail: email,
    temporaryPassword,
  };
}
