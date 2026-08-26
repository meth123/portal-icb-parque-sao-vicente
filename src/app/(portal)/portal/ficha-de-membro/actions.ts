"use server";

import { revalidatePath } from "next/cache";
import {
  canAccessAdministration,
  getCurrentUser,
} from "@/lib/auth/current-user";
import { getSaoPauloDate } from "@/lib/dates/sao-paulo";
import {
  type MemberRegistrationInput,
  validateMemberRegistration,
} from "@/lib/member-registration";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type MemberRegistrationState = {
  status: "idle" | "success" | "error";
  message: string;
  submissionId?: string;
};

export type MemberRegistrationManagementState = {
  status: "idle" | "success" | "error";
  message: string;
  registrationId?: string;
};

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function readString(formData: FormData, field: keyof MemberRegistrationInput) {
  const value = formData.get(field);
  return typeof value === "string" ? value : "";
}

function readMemberRegistrationInput(
  formData: FormData,
  photoObjectPath = readString(formData, "photoObjectPath"),
) {
  const values = Object.fromEntries(
    [
      "fullName",
      "birthDate",
      "rg",
      "addressStreet",
      "addressNumber",
      "neighborhood",
      "city",
      "postalCode",
      "baptismDate",
      "network",
      "disciplerName",
      "whatsapp",
    ].map((field) => [
      field,
      readString(formData, field as keyof MemberRegistrationInput),
    ]),
  ) as Omit<Record<keyof MemberRegistrationInput, string>, "photoObjectPath">;

  return { ...values, photoObjectPath };
}

async function cleanupUnregisteredPhoto(
  photoObjectPath: string,
  currentUserId: string,
) {
  const expectedPath = new RegExp(
    `^${currentUserId}/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\\.(jpg|jpeg|png|webp)$`,
    "i",
  );
  if (!expectedPath.test(photoObjectPath)) return;

  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("member_registrations")
      .select("id")
      .eq("photo_object_path", photoObjectPath)
      .maybeSingle();

    if (!error && !data) {
      await admin.storage.from("member-photos").remove([photoObjectPath]);
    }
  } catch {
    // A falha de limpeza não deve ocultar a mensagem principal do formulário.
  }
}

export async function submitMemberRegistration(
  _previousState: MemberRegistrationState,
  formData: FormData,
): Promise<MemberRegistrationState> {
  const user = await getCurrentUser();

  if (!user?.isActive || user.mustChangePassword) {
    return {
      status: "error",
      message: "Sua sessão não permite enviar esta ficha. Entre novamente e tente de novo.",
    };
  }

  const raw = readMemberRegistrationInput(formData);
  const validation = validateMemberRegistration(
    raw,
    user.id,
    getSaoPauloDate(),
  );

  if (!validation.ok) {
    await cleanupUnregisteredPhoto(raw.photoObjectPath, user.id);
    return { status: "error", message: validation.message };
  }

  const value = validation.value;
  const supabase = await createClient();
  const { error } = await supabase
    .from("member_registrations")
    .insert({
      full_name: value.fullName,
      photo_object_path: value.photoObjectPath,
      birth_date: value.birthDate,
      rg: value.rg,
      address_street: value.addressStreet,
      address_number: value.addressNumber,
      neighborhood: value.neighborhood,
      city: value.city,
      postal_code: value.postalCode,
      baptism_date: value.baptismDate,
      network: value.network,
      discipler_name: value.disciplerName,
      whatsapp: value.whatsapp,
    });

  if (error) {
    await cleanupUnregisteredPhoto(value.photoObjectPath, user.id);
    return {
      status: "error",
      message: "Não foi possível enviar a ficha agora. Revise os dados e tente novamente.",
    };
  }

  revalidatePath("/portal/ficha-de-membro/cadastros");
  return {
    status: "success",
    message: "Ficha de membro enviada com sucesso.",
    submissionId: crypto.randomUUID(),
  };
}

export async function updateMemberRegistration(
  _previousState: MemberRegistrationManagementState,
  formData: FormData,
): Promise<MemberRegistrationManagementState> {
  const user = await getCurrentUser();
  if (!user || !canAccessAdministration(user)) {
    return { status: "error", message: "Você não possui acesso para editar esta ficha." };
  }

  const registrationId = String(formData.get("registrationId") ?? "");
  if (!uuidPattern.test(registrationId)) {
    return { status: "error", message: "A ficha informada é inválida." };
  }

  const supabase = await createClient();
  const { data: existing, error: existingError } = await supabase
    .from("member_registrations")
    .select("submitted_by, photo_object_path")
    .eq("id", registrationId)
    .maybeSingle();

  if (existingError || !existing) {
    return { status: "error", message: "Não foi possível localizar esta ficha." };
  }

  const requestedPhotoPath = readString(formData, "photoObjectPath");
  const hasNewPhoto = Boolean(
    requestedPhotoPath && requestedPhotoPath !== existing.photo_object_path,
  );
  const photoObjectPath = hasNewPhoto
    ? requestedPhotoPath
    : existing.photo_object_path;
  const photoOwnerId = hasNewPhoto ? user.id : existing.submitted_by;
  const raw = readMemberRegistrationInput(formData, photoObjectPath);
  const validation = validateMemberRegistration(
    raw,
    photoOwnerId,
    getSaoPauloDate(),
  );

  if (!validation.ok) {
    if (hasNewPhoto) {
      await cleanupUnregisteredPhoto(requestedPhotoPath, user.id);
    }
    return { status: "error", message: validation.message };
  }

  const value = validation.value;
  const { error } = await supabase
    .from("member_registrations")
    .update({
      full_name: value.fullName,
      photo_object_path: value.photoObjectPath,
      birth_date: value.birthDate,
      rg: value.rg,
      address_street: value.addressStreet,
      address_number: value.addressNumber,
      neighborhood: value.neighborhood,
      city: value.city,
      postal_code: value.postalCode,
      baptism_date: value.baptismDate,
      network: value.network,
      discipler_name: value.disciplerName,
      whatsapp: value.whatsapp,
    })
    .eq("id", registrationId);

  if (error) {
    if (hasNewPhoto) {
      await cleanupUnregisteredPhoto(requestedPhotoPath, user.id);
    }
    return {
      status: "error",
      message: "Não foi possível salvar as alterações. Tente novamente.",
    };
  }

  if (hasNewPhoto) {
    try {
      await createAdminClient()
        .storage.from("member-photos")
        .remove([existing.photo_object_path]);
    } catch {
      // A ficha já aponta para a nova foto; a limpeza antiga pode ser refeita depois.
    }
  }

  revalidatePath("/portal/ficha-de-membro/cadastros");
  revalidatePath(`/portal/ficha-de-membro/cadastros/${registrationId}/editar`);
  return {
    status: "success",
    message: "Ficha atualizada com sucesso.",
    registrationId,
  };
}

export async function deleteMemberRegistration(
  _previousState: MemberRegistrationManagementState,
  formData: FormData,
): Promise<MemberRegistrationManagementState> {
  const user = await getCurrentUser();
  if (!user || !canAccessAdministration(user)) {
    return { status: "error", message: "Você não possui acesso para excluir esta ficha." };
  }

  const registrationId = String(formData.get("registrationId") ?? "");
  if (!uuidPattern.test(registrationId)) {
    return { status: "error", message: "A ficha informada é inválida." };
  }

  const supabase = await createClient();
  const { data: existing, error: existingError } = await supabase
    .from("member_registrations")
    .select("photo_bucket_id, photo_object_path")
    .eq("id", registrationId)
    .maybeSingle();

  if (existingError || !existing) {
    return { status: "error", message: "Não foi possível localizar esta ficha." };
  }

  const { error } = await supabase
    .from("member_registrations")
    .delete()
    .eq("id", registrationId);

  if (error) {
    return {
      status: "error",
      message: "Não foi possível excluir a ficha. Tente novamente.",
    };
  }

  try {
    await createAdminClient()
      .storage.from(existing.photo_bucket_id)
      .remove([existing.photo_object_path]);
  } catch {
    // A ficha já foi excluída; a limpeza do arquivo pode ser refeita depois.
  }

  revalidatePath("/portal/ficha-de-membro/cadastros");
  return {
    status: "success",
    message: "Ficha excluída.",
    registrationId,
  };
}
