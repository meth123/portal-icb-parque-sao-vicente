"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth/current-user";
import { canManageDocumentLibrary } from "@/lib/data/document-library";
import { createClient } from "@/lib/supabase/server";

export type DeleteDocumentPublicationState = {
  message: string;
  success: boolean;
};

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type DeletionTarget = {
  bucket_id: string;
  object_path: string;
};

export async function deleteDocumentPublication(
  publicationId: string,
  _previousState: DeleteDocumentPublicationState,
  _formData: FormData,
): Promise<DeleteDocumentPublicationState> {
  void _previousState;
  void _formData;

  const user = await getCurrentUser();

  if (
    !uuidPattern.test(publicationId) ||
    !user?.isActive ||
    !(await canManageDocumentLibrary())
  ) {
    return {
      message: "Sua conta não possui permissão para excluir documentos.",
      success: false,
    };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc(
    "begin_document_publication_deletion",
    { target_publication_id: publicationId },
  );
  const target = Array.isArray(data)
    ? (data[0] as DeletionTarget | undefined)
    : undefined;

  if (error || !target?.bucket_id || !target.object_path) {
    return {
      message: "Não foi possível localizar ou preparar esse documento para exclusão.",
      success: false,
    };
  }

  const { error: storageError } = await supabase.storage
    .from(target.bucket_id)
    .remove([target.object_path]);

  if (storageError) {
    await supabase.rpc("cancel_document_publication_deletion", {
      target_publication_id: publicationId,
    });

    return {
      message: "Não foi possível remover o PDF privado. O documento foi mantido na biblioteca.",
      success: false,
    };
  }

  const { error: finishError } = await supabase.rpc(
    "finish_document_publication_deletion",
    { target_publication_id: publicationId },
  );

  if (finishError) {
    revalidatePath("/portal/documentos");
    return {
      message: "O PDF foi removido, mas a limpeza do registro precisa ser concluída.",
      success: false,
    };
  }

  revalidatePath("/portal");
  revalidatePath("/portal/documentos");

  return {
    message: "Documento excluído.",
    success: true,
  };
}
