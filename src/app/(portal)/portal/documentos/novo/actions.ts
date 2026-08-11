"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import { canManageDocumentLibrary } from "@/lib/data/document-library";
import { createClient } from "@/lib/supabase/server";

export type CreateDocumentPublicationState = {
  message: string;
};

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const maximumPdfSize = 10 * 1024 * 1024;

function readString(formData: FormData, field: string) {
  const value = formData.get(field);
  return typeof value === "string" ? value.trim() : "";
}

export async function createDocumentPublication(
  _previousState: CreateDocumentPublicationState,
  formData: FormData,
): Promise<CreateDocumentPublicationState> {
  const user = await getCurrentUser();

  if (!user?.isActive || !(await canManageDocumentLibrary())) {
    return {
      message: "Sua conta não possui permissão para publicar documentos.",
    };
  }

  const categoryId = readString(formData, "categoryId");
  const title = readString(formData, "title");
  const description = readString(formData, "description");
  const storageObjectPath = readString(formData, "storageObjectPath");
  const originalFileName = readString(formData, "originalFileName");
  const fileSizeBytes = Number(readString(formData, "fileSizeBytes"));

  const expectedPathPattern = new RegExp(
    `^${user.id}/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\\.pdf$`,
    "i",
  );

  if (!expectedPathPattern.test(storageObjectPath)) {
    return { message: "O arquivo enviado possui um caminho inválido." };
  }

  if (
    originalFileName.length < 5 ||
    originalFileName.length > 255 ||
    !originalFileName.toLowerCase().endsWith(".pdf")
  ) {
    return { message: "O nome original do arquivo é inválido." };
  }

  if (
    !Number.isSafeInteger(fileSizeBytes) ||
    fileSizeBytes < 1 ||
    fileSizeBytes > maximumPdfSize
  ) {
    return { message: "O PDF deve possuir no máximo 10 MB." };
  }

  const supabase = await createClient();
  const rejectPublication = async (
    message: string,
  ): Promise<CreateDocumentPublicationState> => {
    const { data: existingPublication, error: existingPublicationError } =
      await supabase
      .from("document_publications")
      .select("id")
      .eq("storage_object_path", storageObjectPath)
      .maybeSingle();

    if (!existingPublicationError && !existingPublication) {
      await supabase.storage
        .from("document-library")
        .remove([storageObjectPath]);
    }

    return { message };
  };

  if (!uuidPattern.test(categoryId)) {
    return rejectPublication("Selecione uma categoria válida.");
  }

  if (title.length < 2 || title.length > 180) {
    return rejectPublication("Informe um título entre 2 e 180 caracteres.");
  }

  if (description.length > 2000) {
    return rejectPublication(
      "A descrição deve possuir no máximo 2000 caracteres.",
    );
  }

  const { data, error } = await supabase.rpc("create_document_publication", {
    target_category_id: categoryId,
    target_title: title,
    target_description: description || null,
    target_reference_label: null,
    target_period_starts_on: null,
    target_period_ends_on: null,
    target_storage_object_path: storageObjectPath,
    target_original_file_name: originalFileName,
    target_file_size_bytes: fileSizeBytes,
  });

  if (error) {
    const safeMessagePrefixes = [
      "Apenas Administrador ou Pastor ativo",
      "Informe",
      "A descrição",
      "A categoria selecionada",
      "O caminho do arquivo",
      "O nome original do arquivo",
      "O PDF deve possuir",
      "O arquivo enviado",
      "O arquivo armazenado",
      "O tamanho informado",
    ];
    const safeMessage = safeMessagePrefixes.some((prefix) =>
      error.message.startsWith(prefix),
    )
      ? error.message
      : "Não foi possível registrar a publicação. Revise os dados e tente novamente.";

    return rejectPublication(safeMessage);
  }

  if (typeof data !== "string" || !uuidPattern.test(data)) {
    return {
      message: "A publicação foi processada, mas o identificador retornado é inválido.",
    };
  }

  revalidatePath("/portal");
  revalidatePath("/portal/documentos");
  redirect("/portal/documentos");
}
