"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import {
  canAccessAdministration,
  getCurrentUser,
} from "@/lib/auth/current-user";
import { getSaoPauloDate } from "@/lib/dates/sao-paulo";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type CreateLeadershipInviteState = {
  message: string;
  success: boolean;
  inviteLink?: string;
  invitedName?: string;
  needsCellCreation?: boolean;
};

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function readString(formData: FormData, field: string) {
  const value = formData.get(field);
  return typeof value === "string" ? value.trim() : "";
}

function createSafePasswordLink(
  applicationOrigin: string,
  tokenHash: string,
  type: "invite" | "recovery",
) {
  const inviteUrl = new URL("/confirmar-acesso", applicationOrigin);
  inviteUrl.searchParams.set("token_hash", tokenHash);
  inviteUrl.searchParams.set("type", type);
  return inviteUrl.toString();
}

type GeneratedLinkResponse = {
  properties?: {
    hashed_token?: string | null;
    action_link?: string | null;
  } | null;
};

function getGeneratedLink(
  data: GeneratedLinkResponse | null | undefined,
  applicationOrigin: string,
  type: "invite" | "recovery",
) {
  const hashedToken = data?.properties?.hashed_token;

  if (hashedToken) {
    return createSafePasswordLink(applicationOrigin, hashedToken, type);
  }

  // Algumas respostas do Auth retornam somente o action_link oficial.
  // Ele já contém o token e redireciona para a URL informada na requisição.
  return data?.properties?.action_link ?? null;
}

async function getTrustedOrigin() {
  const requestHeaders = await headers();
  const requestOrigin = requestHeaders.get("origin");

  if (requestOrigin) {
    try {
      const parsedOrigin = new URL(requestOrigin);
      const isLocalDevelopment =
        parsedOrigin.protocol === "http:" &&
        (parsedOrigin.hostname === "localhost" ||
          parsedOrigin.hostname === "127.0.0.1");

      if (parsedOrigin.protocol === "https:" || isLocalDevelopment) {
        return parsedOrigin.origin;
      }
    } catch {
      // Continua para o endereço fornecido pela Vercel.
    }
  }

  const vercelProductionUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (vercelProductionUrl) return `https://${vercelProductionUrl}`;

  throw new Error("APPLICATION_ORIGIN_NOT_AVAILABLE");
}

export async function createLeadershipInvite(
  _previousState: CreateLeadershipInviteState,
  formData: FormData,
): Promise<CreateLeadershipInviteState> {
  const currentUser = await getCurrentUser();

  if (!currentUser || !canAccessAdministration(currentUser)) {
    return {
      message: "Sua conta não possui permissão para cadastrar usuários.",
      success: false,
    };
  }

  const fullName = readString(formData, "fullName");
  const email = readString(formData, "email").toLocaleLowerCase("pt-BR");
  const cellId = readString(formData, "cellId");
  const leadershipRole = readString(formData, "leadershipRole");
  const needsCellCreation = cellId === "new-cell";

  if (fullName.length < 2 || fullName.length > 120) {
    return { message: "Informe um nome válido.", success: false };
  }

  if (email.length > 254 || !emailPattern.test(email)) {
    return { message: "Informe um e-mail válido.", success: false };
  }

  if (leadershipRole !== "leader" && leadershipRole !== "vice_leader") {
    return { message: "Selecione uma função válida.", success: false };
  }

  if (needsCellCreation && leadershipRole !== "leader") {
    return {
      message: "Somente um novo Líder pode aguardar a criação da célula.",
      success: false,
    };
  }

  if (!needsCellCreation && !uuidPattern.test(cellId)) {
    return { message: "Selecione uma célula válida.", success: false };
  }

  if (
    leadershipRole === "leader" &&
    !needsCellCreation &&
    formData.get("confirmLeaderReplacement") !== "yes"
  ) {
    return {
      message: "Confirme a substituição do Líder atual.",
      success: false,
    };
  }

  let adminClient: ReturnType<typeof createAdminClient>;
  let applicationOrigin: string;

  try {
    adminClient = createAdminClient();
    applicationOrigin = await getTrustedOrigin();
  } catch {
    return {
      message:
        "O cadastro de novos usuários ainda não foi configurado no servidor.",
      success: false,
    };
  }

  const supabase = await createClient();
  let cell: { id: string; name: string; is_active: boolean } | null = null;
  let currentLeaderships: Array<{
    cell_id: string;
    profile_id: string;
    role: string;
  }> = [];

  if (!needsCellCreation) {
    const [cellResult, leadershipsResult] = await Promise.all([
      supabase
        .from("cells")
        .select("id, name, is_active")
        .eq("id", cellId)
        .maybeSingle(),
      supabase
        .from("cell_leaderships")
        .select("cell_id, profile_id, role")
        .eq("cell_id", cellId)
        .is("ends_on", null),
    ]);

    cell = cellResult.data;
    currentLeaderships = leadershipsResult.data ?? [];
    const hasCurrentLeader = currentLeaderships.some(
      (leadership) => leadership.role === "leader",
    );

    if (
      cellResult.error ||
      leadershipsResult.error ||
      !cell?.is_active ||
      !hasCurrentLeader
    ) {
      return {
        message: "Não foi possível validar a célula selecionada.",
        success: false,
      };
    }
  }

  const { data: linkData, error: linkError } =
    await adminClient.auth.admin.generateLink({
      type: "invite",
      email,
      options: {
        data: { full_name: fullName },
        redirectTo: `${applicationOrigin}/atualizar-senha`,
      },
    });

  if (linkError || !linkData.user?.id || !getGeneratedLink(linkData, applicationOrigin, "invite")) {
    // Se o Auth criou uma conta, mas não devolveu nenhum link utilizável,
    // remove a conta incompleta para permitir uma nova tentativa limpa.
    if (!linkError && linkData.user?.id) {
      await adminClient.auth.admin.deleteUser(linkData.user.id);
    }

    const alreadyExists =
      linkError?.code === "email_exists" ||
      linkError?.message.toLocaleLowerCase("pt-BR").includes("already") ||
      linkError?.message.toLocaleLowerCase("pt-BR").includes("registered");

    if (alreadyExists) {
      const { data: recoveryData, error: recoveryError } =
        await adminClient.auth.admin.generateLink({
          type: "recovery",
          email,
          options: {
            redirectTo: `${applicationOrigin}/atualizar-senha`,
          },
        });

      if (
        !recoveryError &&
        recoveryData.user?.id &&
        getGeneratedLink(recoveryData, applicationOrigin, "recovery")
      ) {
        if (!needsCellCreation && cell) {
          const { data: existingActiveLeaderships, error: activeLeadershipError } =
            await supabase
              .from("cell_leaderships")
              .select("cell_id, profile_id, role")
              .eq("profile_id", recoveryData.user.id)
              .is("ends_on", null);

          if (activeLeadershipError) {
            return {
              message:
                "A conta existe, mas não foi possível verificar seus vínculos atuais.",
              success: false,
            };
          }

          const linkedToAnotherCell = (existingActiveLeaderships ?? []).some(
            (leadership) => leadership.cell_id !== cellId,
          );

          if (linkedToAnotherCell) {
            return {
              message:
                "Esta conta já está vinculada a outra célula. Encerre o vínculo anterior antes de transferi-la.",
              success: false,
            };
          }

          const currentLeader = currentLeaderships.find(
            (leadership) => leadership.role === "leader",
          );
          const currentViceIds = currentLeaderships
            .filter((leadership) => leadership.role === "vice_leader")
            .map((leadership) => leadership.profile_id);
          const targetLeaderId =
            leadershipRole === "leader"
              ? recoveryData.user.id
              : currentLeader?.profile_id;
          const targetViceIds =
            leadershipRole === "vice_leader"
              ? Array.from(new Set([...currentViceIds, recoveryData.user.id]))
              : currentViceIds;

          if (!targetLeaderId) {
            return {
              message: "A célula selecionada não possui um Líder válido.",
              success: false,
            };
          }

          const { error: leadershipError } = await supabase.rpc(
            "update_cell_leadership",
            {
              target_cell_id: cellId,
              target_name: cell.name,
              target_effective_on: getSaoPauloDate(),
              target_leader_profile_id: targetLeaderId,
              target_vice_profile_ids: targetViceIds,
            },
          );

          if (leadershipError) {
            return {
              message:
                "A conta existe, mas não foi possível vinculá-la à célula. Verifique se ela já possui um vínculo ativo.",
              success: false,
            };
          }
        }

        await supabase.rpc("record_admin_operation", {
          target_action: "account.password_link.create",
          target_type: "profile",
          target_id: recoveryData.user.id,
          target_metadata: {},
        });

        return {
          message: "A conta já existia. Um novo link de acesso foi gerado.",
          success: true,
          inviteLink: getGeneratedLink(
            recoveryData,
            applicationOrigin,
            "recovery",
          ) ?? undefined,
          invitedName: fullName,
        };
      }
    }

    return {
      message: "Não foi possível criar o convite. Tente novamente.",
      success: false,
    };
  }

  const createdProfileId = linkData.user.id;

  // Alguns usuários existentes (especialmente contas ainda não confirmadas)
  // podem ser retornados pelo generateLink sem um erro de e-mail duplicado.
  // Nesse caso, não tentamos preparar um segundo perfil: geramos somente um
  // link de recuperação para a conta já existente.
  const { data: existingProfile, error: existingProfileError } = await adminClient
    .from("profiles")
    .select("id")
    .eq("id", createdProfileId)
    .maybeSingle();

  if (existingProfileError) {
    return {
      message: "Não foi possível verificar a conta existente. Tente novamente.",
      success: false,
    };
  }

  if (existingProfile) {
    const existingUserIsPending =
      !linkData.user.last_sign_in_at && !linkData.user.email_confirmed_at;

    if (existingUserIsPending) {
      const { error: profilePreparationError } = await supabase.rpc(
        "prepare_invited_leadership_profile",
        {
          target_profile_id: createdProfileId,
          target_full_name: fullName,
        },
      );

      if (profilePreparationError) {
        // Para o fluxo "célula ainda será cadastrada", a conta pode ser
        // preparada diretamente pelo cliente administrativo. Isso mantém o
        // cadastro utilizável mesmo quando o perfil já foi criado pelo Auth
        // com metadados diferentes do convite original.
        if (needsCellCreation) {
          const { error: fallbackProfileError } = await adminClient
            .from("profiles")
            .update({ full_name: fullName })
            .eq("id", createdProfileId);

          if (fallbackProfileError) {
            return {
              message:
                "A conta pendente existe, mas não foi possível preparar o perfil. Tente gerar o link novamente.",
              success: false,
            };
          }
        } else {
          return {
            message:
              "A conta pendente existe, mas não foi possível preparar o perfil. Tente gerar o link novamente.",
            success: false,
          };
        }
      }

      if (!needsCellCreation && cell) {
        const existingLeadership = currentLeaderships.find(
          (leadership) => leadership.profile_id === createdProfileId,
        );
        const currentLeader = currentLeaderships.find(
          (leadership) => leadership.role === "leader",
        );
        const currentViceIds = currentLeaderships
          .filter((leadership) => leadership.role === "vice_leader")
          .map((leadership) => leadership.profile_id);
        const targetLeaderId =
          leadershipRole === "leader"
            ? createdProfileId
            : currentLeader?.profile_id;
        const targetViceIds =
          leadershipRole === "vice_leader"
            ? Array.from(new Set([...currentViceIds, createdProfileId]))
            : currentViceIds;

        if (!targetLeaderId) {
          return {
            message: "A célula selecionada não possui um Líder válido.",
            success: false,
          };
        }

        if (
          !existingLeadership ||
          existingLeadership.role !== leadershipRole ||
          existingLeadership.cell_id !== cellId
        ) {
          const { error: leadershipError } = await supabase.rpc(
            "update_cell_leadership",
            {
              target_cell_id: cellId,
              target_name: cell.name,
              target_effective_on: getSaoPauloDate(),
              target_leader_profile_id: targetLeaderId,
              target_vice_profile_ids: targetViceIds,
            },
          );

          if (leadershipError) {
            return {
              message:
                "A conta existe, mas não foi possível concluir o vínculo com a célula. Verifique se ela já está vinculada a outra célula.",
              success: false,
            };
          }
        }
      }

      await supabase.rpc("record_admin_operation", {
        target_action: "account.password_link.create",
        target_type: "profile",
        target_id: createdProfileId,
        target_metadata: {
          source: "existing_pending_account",
          cell_id: needsCellCreation ? null : cellId,
          leadership_role: leadershipRole,
        },
      });

      return {
        message:
          "A conta pendente foi preparada. Copie e envie o novo link de primeiro acesso.",
        success: true,
        inviteLink: getGeneratedLink(linkData, applicationOrigin, "invite") ?? undefined,
        invitedName: fullName,
        needsCellCreation,
      };
    }

    const { data: recoveryData, error: recoveryError } =
      await adminClient.auth.admin.generateLink({
        type: "recovery",
        email,
        options: {
          redirectTo: `${applicationOrigin}/atualizar-senha`,
        },
      });

    if (
      recoveryError ||
      !recoveryData.user?.id ||
      !getGeneratedLink(recoveryData, applicationOrigin, "recovery")
    ) {
      return {
        message: "Não foi possível gerar um novo link para esta conta.",
        success: false,
      };
    }

    await supabase.rpc("record_admin_operation", {
      target_action: "account.password_link.create",
      target_type: "profile",
      target_id: recoveryData.user.id,
      target_metadata: { source: "existing_profile" },
    });

    return {
      message: "A conta já existe. Um novo link de acesso foi gerado.",
      success: true,
      inviteLink: getGeneratedLink(recoveryData, applicationOrigin, "recovery") ?? undefined,
      invitedName: fullName,
    };
  }

  const rollbackCreatedUser = async () => {
    await adminClient.auth.admin.deleteUser(createdProfileId);
  };

  const { error: profileError } = await supabase.rpc(
    "prepare_invited_leadership_profile",
    {
      target_profile_id: createdProfileId,
      target_full_name: fullName,
    },
  );

  if (profileError) {
    if (needsCellCreation) {
      const { error: fallbackProfileError } = await adminClient
        .from("profiles")
        .update({ full_name: fullName })
        .eq("id", createdProfileId);

      if (fallbackProfileError) {
        await rollbackCreatedUser();
        return {
          message: "Não foi possível preparar o perfil da nova conta.",
          success: false,
        };
      }
    } else {
      await rollbackCreatedUser();
      return {
        message: "Não foi possível preparar o perfil da nova conta.",
        success: false,
      };
    }
  }

  if (!needsCellCreation && cell) {
    const currentLeader = currentLeaderships.find(
      (leadership) => leadership.role === "leader",
    );
    const currentViceIds = currentLeaderships
      .filter((leadership) => leadership.role === "vice_leader")
      .map((leadership) => leadership.profile_id);
    const targetLeaderId =
      leadershipRole === "leader"
        ? createdProfileId
        : currentLeader?.profile_id;
    const targetViceIds =
      leadershipRole === "vice_leader"
        ? [...currentViceIds, createdProfileId]
        : currentViceIds;

    if (!targetLeaderId) {
      await rollbackCreatedUser();
      return {
        message: "A célula selecionada não possui um Líder válido.",
        success: false,
      };
    }

    const { error: leadershipError } = await supabase.rpc(
      "update_cell_leadership",
      {
        target_cell_id: cellId,
        target_name: cell.name,
        target_effective_on: getSaoPauloDate(),
        target_leader_profile_id: targetLeaderId,
        target_vice_profile_ids: targetViceIds,
      },
    );

    if (leadershipError) {
      await rollbackCreatedUser();
      return {
        message:
          "A conta não foi criada porque não foi possível concluir o vínculo com a célula.",
        success: false,
      };
    }
  }

  await supabase.rpc("record_admin_operation", {
    target_action: "account.invite.create",
    target_type: "profile",
    target_id: createdProfileId,
    target_metadata: {
      cell_id: needsCellCreation ? null : cellId,
      leadership_role: leadershipRole,
      awaiting_cell_creation: needsCellCreation,
    },
  });

  revalidatePath("/portal/admin");
  revalidatePath("/portal/admin/celulas");
  if (!needsCellCreation) {
    revalidatePath(`/portal/admin/celulas/${cellId}`);
  }

  return {
    message: "Conta criada. Copie e envie o link de primeiro acesso.",
    success: true,
    inviteLink: getGeneratedLink(linkData, applicationOrigin, "invite") ?? undefined,
    invitedName: fullName,
    needsCellCreation,
  };
}
