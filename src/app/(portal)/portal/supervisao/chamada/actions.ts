"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  canManageSupervisionAttendance,
  getCurrentUser,
} from "@/lib/auth/current-user";
import { getSaoPauloDate } from "@/lib/dates/sao-paulo";
import {
  isValidSupervisionDate,
  normalizeSupervisionNetworkCode,
} from "@/lib/supervision-attendance";
import { createClient } from "@/lib/supabase/server";

export type SupervisionAttendanceActionState = {
  message: string;
  success: boolean;
};

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function readString(formData: FormData, field: string) {
  const value = formData.get(field);
  return typeof value === "string" ? value.trim() : "";
}

async function getAuthorizedUser() {
  const user = await getCurrentUser();
  return user && canManageSupervisionAttendance(user) ? user : null;
}

export async function createSupervisionAttendance(
  _previousState: SupervisionAttendanceActionState,
  formData: FormData,
): Promise<SupervisionAttendanceActionState> {
  if (!(await getAuthorizedUser())) {
    return { message: "Sua conta não possui permissão para iniciar chamadas.", success: false };
  }

  const networkCode = normalizeSupervisionNetworkCode(
    readString(formData, "networkCode"),
  );
  const sessionOn = readString(formData, "sessionOn");

  if (!networkCode) {
    return { message: "Selecione RJ ou HM.", success: false };
  }

  if (
    !isValidSupervisionDate(sessionOn) ||
    sessionOn > getSaoPauloDate()
  ) {
    return { message: "Informe uma data válida, sem usar uma data futura.", success: false };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc(
    "create_supervision_attendance_session",
    {
      target_network_code: networkCode,
      target_session_on: sessionOn,
    },
  );

  if (error || typeof data !== "string" || !uuidPattern.test(data)) {
    const messages: Record<string, string> = {
      SUPERVISION_ATTENDANCE_FORBIDDEN:
        "Sua conta não possui permissão para iniciar chamadas.",
      SUPERVISION_ATTENDANCE_INVALID_DATE: "Informe uma data válida.",
      SUPERVISION_ATTENDANCE_INVALID_NETWORK: "Selecione RJ ou HM.",
    };
    return {
      message:
        messages[error?.message ?? ""] ??
        "Não foi possível iniciar a chamada. Tente novamente.",
      success: false,
    };
  }

  revalidatePath("/portal/supervisao/chamada");
  redirect(`/portal/supervisao/chamada/${data}`);
}

export async function finalizeSupervisionAttendance(
  _previousState: SupervisionAttendanceActionState,
  formData: FormData,
): Promise<SupervisionAttendanceActionState> {
  if (!(await getAuthorizedUser())) {
    return { message: "Sua conta não possui permissão para finalizar chamadas.", success: false };
  }

  const sessionId = readString(formData, "sessionId");
  const presentProfileIds = [
    ...new Set(
      formData
        .getAll("presentProfileIds")
        .filter((value): value is string => typeof value === "string")
        .filter((value) => uuidPattern.test(value)),
    ),
  ];

  if (!uuidPattern.test(sessionId)) {
    return { message: "Chamada inválida.", success: false };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc(
    "finalize_supervision_attendance_session",
    {
      target_session_id: sessionId,
      target_present_profile_ids: presentProfileIds,
    },
  );

  if (error) {
    const messages: Record<string, string> = {
      SUPERVISION_ATTENDANCE_FORBIDDEN:
        "Sua conta não possui permissão para finalizar chamadas.",
      SUPERVISION_ATTENDANCE_NOT_FOUND: "A chamada não foi encontrada.",
      SUPERVISION_ATTENDANCE_ALREADY_FINALIZED:
        "Esta chamada já foi finalizada.",
      SUPERVISION_ATTENDANCE_INVALID_PERSON:
        "A lista enviada contém uma pessoa que não pertence a esta chamada.",
    };
    return {
      message:
        messages[error.message] ??
        "Não foi possível finalizar a chamada. Tente novamente.",
      success: false,
    };
  }

  revalidatePath("/portal/supervisao/chamada");
  revalidatePath(`/portal/supervisao/chamada/${sessionId}`);
  redirect(`/portal/supervisao/chamada/${sessionId}?finalizada=1`);
}

export async function saveSupervisionAttendanceDraft(
  sessionId: string,
  presentProfileIds: string[],
): Promise<SupervisionAttendanceActionState> {
  if (!(await getAuthorizedUser())) {
    return { message: "Sua conta não possui permissão para editar chamadas.", success: false };
  }

  const validProfileIds = [
    ...new Set(presentProfileIds.filter((profileId) => uuidPattern.test(profileId))),
  ];
  if (
    !uuidPattern.test(sessionId) ||
    validProfileIds.length !== presentProfileIds.length
  ) {
    return { message: "Não foi possível salvar a chamada.", success: false };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("save_supervision_attendance_draft", {
    target_session_id: sessionId,
    target_present_profile_ids: validProfileIds,
  });

  if (error) {
    return {
      message:
        error.message === "SUPERVISION_ATTENDANCE_NOT_DRAFT"
          ? "Esta chamada não está mais em andamento."
          : "Não foi possível salvar a última marcação.",
      success: false,
    };
  }

  return { message: "", success: true };
}

export async function updateSupervisionAttendanceEntry(formData: FormData) {
  if (!(await getAuthorizedUser())) return false;

  const sessionId = readString(formData, "sessionId");
  const profileId = readString(formData, "profileId");
  const present = readString(formData, "present");

  if (
    !uuidPattern.test(sessionId) ||
    !uuidPattern.test(profileId) ||
    !["true", "false"].includes(present)
  ) {
    return false;
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc(
    "update_supervision_attendance_entry",
    {
      target_session_id: sessionId,
      target_profile_id: profileId,
      target_present: present === "true",
    },
  );

  if (!error) {
    revalidatePath("/portal/supervisao/chamada");
    revalidatePath(`/portal/supervisao/chamada/${sessionId}`);
  }

  return !error;
}
