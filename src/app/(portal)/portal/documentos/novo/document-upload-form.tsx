"use client";

import { FileUp, Upload } from "lucide-react";
import { startTransition, useActionState, useEffect, useRef, useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { FormSection } from "@/components/ui/form-section";
import type { DocumentCategorySummary } from "@/lib/data/document-library";
import { createClient } from "@/lib/supabase/client";
import { createDocumentPublication, type CreateDocumentPublicationState } from "./actions";

type DocumentUploadFormProps = {
  categories: DocumentCategorySummary[];
  currentUserId: string;
};

const initialState: CreateDocumentPublicationState = { message: "" };
const maximumPdfSize = 10 * 1024 * 1024;
const inputClassName = "min-h-12 w-full rounded-xl border border-app-border bg-surface px-4 text-app-foreground outline-none focus:border-theme-primary focus:ring-2 focus:ring-theme-primary-soft disabled:opacity-60";

export function DocumentUploadForm({ categories, currentUserId }: DocumentUploadFormProps) {
  const [state, formAction, actionPending] = useActionState(createDocumentPublication, initialState);
  const [uploading, setUploading] = useState(false);
  const [clientMessage, setClientMessage] = useState("");
  const [selectedFileName, setSelectedFileName] = useState("");
  const pendingCleanupPath = useRef<string | null>(null);
  const isPending = uploading || actionPending;

  useEffect(() => {
    if (!state.message || !pendingCleanupPath.current) return;
    const path = pendingCleanupPath.current;
    pendingCleanupPath.current = null;
    void createClient().storage.from("document-library").remove([path]);
  }, [state.message]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isPending) return;

    setClientMessage("");
    const form = event.currentTarget;
    const fileInput = form.elements.namedItem("pdfFile");
    const file = fileInput instanceof HTMLInputElement ? fileInput.files?.[0] : undefined;

    if (!file) {
      setClientMessage("Selecione o arquivo PDF que será publicado.");
      return;
    }
    if (file.type !== "application/pdf" || !file.name.toLowerCase().endsWith(".pdf")) {
      setClientMessage("Selecione um arquivo no formato PDF.");
      return;
    }
    if (file.size < 1 || file.size > maximumPdfSize) {
      setClientMessage("O PDF deve possuir no máximo 10 MB.");
      return;
    }

    const formData = new FormData(form);
    formData.delete("pdfFile");
    setUploading(true);
    const storageObjectPath = `${currentUserId}/${crypto.randomUUID()}.pdf`;
    const supabase = createClient();
    const { error } = await supabase.storage.from("document-library").upload(storageObjectPath, file, {
      cacheControl: "3600",
      contentType: "application/pdf",
      upsert: false,
    });

    if (error) {
      setUploading(false);
      setClientMessage("Não foi possível enviar o PDF. Confirme sua sessão e tente novamente.");
      return;
    }

    pendingCleanupPath.current = storageObjectPath;
    formData.set("storageObjectPath", storageObjectPath);
    formData.set("originalFileName", file.name);
    formData.set("fileSizeBytes", String(file.size));
    setUploading(false);
    startTransition(() => formAction(formData));
  }

  const message = clientMessage || state.message;

  return (
    <form onSubmit={handleSubmit} className="space-y-7">
      <FormSection title="Informações" description="Identifique o material para que ele seja encontrado com facilidade.">
        <div className="grid gap-5 md:grid-cols-2">
          <FormField id="title" label="Título" required className="md:col-span-2">
            <input id="title" name="title" type="text" minLength={2} maxLength={180} required disabled={isPending} className={inputClassName} />
          </FormField>
          <FormField id="categoryId" label="Categoria" required>
            <select id="categoryId" name="categoryId" required defaultValue="" disabled={isPending} className={inputClassName}>
              <option value="" disabled>Selecione uma categoria</option>
              {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
            </select>
          </FormField>
          <FormField id="description" label="Descrição" hint="Opcional">
            <textarea id="description" name="description" rows={3} maxLength={2000} disabled={isPending} className={`${inputClassName} py-3`} />
          </FormField>
        </div>
      </FormSection>

      <FormSection title="Arquivo" description="O PDF ficará privado e disponível somente para usuários autorizados.">
        <FormField id="pdfFile" label="Arquivo PDF" hint="Formato PDF, com tamanho máximo de 10 MB." required>
          <div className="rounded-xl border border-dashed border-theme-primary-border bg-theme-primary-subtle p-4">
            <div className="mb-3 flex items-center gap-3 text-theme-primary-active">
              <span className="flex size-10 items-center justify-center rounded-xl bg-surface"><FileUp aria-hidden="true" className="size-5" /></span>
              <span className="text-sm font-semibold">Selecione o material para publicação</span>
            </div>
            <input
              id="pdfFile"
              name="pdfFile"
              type="file"
              accept="application/pdf,.pdf"
              required
              disabled={isPending}
              className="sr-only"
              onChange={(event) => setSelectedFileName(event.target.files?.[0]?.name ?? "")}
            />
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <label
                htmlFor="pdfFile"
                className="inline-flex min-h-11 cursor-pointer items-center justify-center rounded-xl bg-theme-primary px-4 text-sm font-semibold text-theme-primary-foreground hover:bg-theme-primary-hover"
              >
                Escolher PDF
              </label>
              <span className="min-w-0 break-words text-sm text-app-secondary">
                {selectedFileName || "Nenhum arquivo selecionado"}
              </span>
            </div>
          </div>
        </FormField>
      </FormSection>

      {message ? <Alert tone="danger">{message}</Alert> : null}

      <div className="flex justify-end border-t border-app-border pt-6">
        <Button type="submit" disabled={isPending} className="w-full sm:w-auto sm:min-w-56">
          <Upload aria-hidden="true" className="size-5" />
          {uploading ? "Enviando PDF..." : actionPending ? "Registrando publicação..." : "Publicar documento"}
        </Button>
      </div>
    </form>
  );
}
