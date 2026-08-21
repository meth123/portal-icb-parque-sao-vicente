"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import {
  canAccessAdministration,
  getCurrentUser,
} from "@/lib/auth/current-user";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export type AccountAccessState = {
  message: string;
  success: boolean;
  accessLink?: string;
};

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const allowedRoles = new Set(["user", "pastor", "administrator"]);

function readString(formData: FormData, field: string) {
  const value = formData.get(field);
  return typeof value === "string" ? value.trim() : "";
}

async function getApplicationOrigin() {
  const requestHeaders = await headers();
  const requestOrigin = requestHeaders.get("origin");

  if (requestOrigin) {
    const parsedOrigin = new URL(requestOrigin);
    const isLocalDevelopment =
      parsedOrigin.protocol === "http:" &&
      (parsedOrigin.hostname === "localhost" ||
        parsedOrigin.hostname === "127.0.0.1");

    if (parsedOrigin.protocol === "https:" || isLocalDevelopment) {
      return parsedOrigin.origin;
    }
  }

  const productionUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (productionUrl) return `https://${productionUrl}`;

  throw new Error("APPLICATION_ORIGIN_NOT_AVAILABLE");
}

export async function generatePendingAccessLink(
  _previousState: AccountAccessState,
  formData: FormData,
): Promise<AccountAccessState> {
  const user = await getCurrentUser();
  if (!user || !canAccessAdministration(user)) {
    return {
      message: "Sua conta não possui permissão para gerar acessos.",
      success: false,
    };
  }

  const profileId = readString(formData, "profileId");
  if (!uuidPattern.test(profileId)) {
    return { message: "Selecione uma conta válida.", success: false };
  }

  try {
    const adminClient = createAdminClient();
    const applicationOrigin = await getApplicationOrigin();
    const { data: userData, error: userError } =
      await adminClient.auth.admin.getUserById(profileId);

    if (
      userError ||
      !userData.user ||
      Boolean(userData.user.last_sign_in_at) ||
      Boolean(userData.user.email_confirmed_at)
    ) {
      return {
        message: "Esta conta não está pendente de primeiro acesso.",
        success: false,
      };
    }

    const { data, error } = await adminClient.auth.admin.generateLink({
      type: "invite",
      email: userData.user.email ?? "",
      options: { redirectTo: `${applicationOrigin}/atualizar-senha` },
    });

    if (error || !data.properties?.hashed_token) {
      return {
        message: "Não foi possível gerar o link. Tente novamente.",
        success: false,
      };
    }

    const accessLink = new URL("/confirmar-acesso", applicationOrigin);
    accessLink.searchParams.set("token_hash", data.properties.hashed_token);
    accessLink.searchParams.set("type", "invite");

    revalidatePath("/portal/admin");
    return {
      message: "Novo link de primeiro acesso gerado.",
      success: true,
      accessLink: accessLink.toString(),
    };
  } catch {
    return {
      message: "O servidor não está configurado para gerar links de acesso.",
      success: false,
    };
  }
}

export async function updateAccountAccess(
  _previousState: AccountAccessState,
  formData: FormData,
): Promise<AccountAccessState> {
  const user = await getCurrentUser();

  if (!user || !canAccessAdministration(user)) {
    return {
      message: "Sua conta não possui permissão para gerenciar acessos.",
      success: false,
    };
  }

  const profileId = readString(formData, "profileId");
  const globalRole = readString(formData, "globalRole");
  const status = readString(formData, "status");
  const isActive = status === "active";
  const isSupervisor = formData.get("isSupervisor") === "on";
  const canManageCells = isActive && globalRole === "pastor";

  if (!uuidPattern.test(profileId)) {
    return { message: "Selecione uma conta válida.", success: false };
  }

  if (!allowedRoles.has(globalRole)) {
    return { message: "Selecione um papel válido.", success: false };
  }

  if (status !== "active" && status !== "inactive") {
    return { message: "Selecione um status válido.", success: false };
  }

  if (!isActive && (isSupervisor || canManageCells)) {
    return {
      message: "Uma conta inativa não pode manter permissões adicionais.",
      success: false,
    };
  }

  if (isSupervisor && globalRole !== "user") {
    return {
      message: "Supervisor exige uma conta de Líder.",
      success: false,
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("update_admin_profile_access", {
    target_profile_id: profileId,
    target_global_role: globalRole,
    target_is_supervisor: isSupervisor,
    target_can_manage_cells: canManageCells,
    target_is_active: isActive,
  });

  if (error) {
    const errorMessages: Record<string, string> = {
      ACCOUNT_ACCESS_FORBIDDEN:
        "Sua conta não possui permissão para gerenciar acessos.",
      ACCOUNT_INVALID: "Selecione uma conta válida.",
      ACCOUNT_SELF_UPDATE_BLOCKED:
        "Sua própria conta não pode ser alterada nesta tela.",
      ACCOUNT_ROLE_INVALID: "Selecione um papel válido.",
      ACCOUNT_NOT_FOUND: "A conta selecionada não existe.",
      ACCOUNT_CURRENT_CELL_LINK:
        "Transfira ou encerre o vínculo atual da célula antes de alterar o papel ou desativar a conta.",
      SUPERVISOR_REQUIRES_CURRENT_LEADER:
        "Supervisor exige uma conta ativa com vínculo vigente como Líder.",
      CELL_MANAGER_REQUIRES_ACTIVE_PASTOR:
        "Gerenciar células exige uma conta ativa de Pastor.",
      INACTIVE_ACCOUNT_PERMISSIONS:
        "Uma conta inativa não pode manter permissões adicionais.",
      LAST_ACTIVE_ADMINISTRATOR:
        "O sistema precisa manter ao menos um Administrador ativo.",
    };
    const safeMessage =
      errorMessages[error.message] ??
      "Não foi possível atualizar o acesso. Revise os dados e tente novamente.";

    return { message: safeMessage, success: false };
  }

  revalidatePath("/portal/admin");
  revalidatePath("/portal");

  return { message: "Acesso atualizado.", success: true };
}
