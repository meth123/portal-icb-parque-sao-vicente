"use client";

import {
  startTransition,
  useActionState,
  useEffect,
  useRef,
  useState,
} from "react";
import type { DocumentCategorySummary } from "@/lib/data/document-library";
import { createClient } from "@/lib/supabase/client";
import {
  createDocumentPublication,
  type CreateDocumentPublicationState,
} from "./actions";

type DocumentUploadFormProps = {
  categories: DocumentCategorySummary[];
  currentUserId: string;
};

const initialState: CreateDocumentPublicationState = { message: "" };
const maximumPdfSize = 10 * 1024 * 1024;

export function DocumentUploadForm({
  categories,
  currentUserId,
}: DocumentUploadFormProps) {
  const [state, formAction, actionPending] = useActionState(
    createDocumentPublication,
    initialState,
  );
  const [uploading, setUploading] = useState(false);
  const [clientMessage, setClientMessage] = useState("");
  const pendingCleanupPath = useRef<string | null>(null);
  const isPending = uploading || actionPending;

  useEffect(() => {
    if (!state.message || !pendingCleanupPath.current) {
      return;
    }

    const path = pendingCleanupPath.current;
    pendingCleanupPath.current = null;

    void createClient().storage.from("document-library").remove([path]);
  }, [state.message]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isPending) {
      return;
    }

    setClientMessage("");
    const form = event.currentTarget;
    const fileInput = form.elements.namedItem("pdfFile");
    const file =
      fileInput instanceof HTMLInputElement ? fileInput.files?.[0] : undefined;

    if (!file) {
      setClientMessage("Selecione o arquivo PDF que será publicado.");
      return;
    }

    if (
      file.type !== "application/pdf" ||
      !file.name.toLowerCase().endsWith(".pdf")
    ) {
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
    const { error } = await supabase.storage
      .from("document-library")
      .upload(storageObjectPath, file, {
        cacheControl: "3600",
        contentType: "application/pdf",
        upsert: false,
      });

    if (error) {
      setUploading(false);
      setClientMessage(
        "Não foi possível enviar o PDF. Confirme sua sessão e tente novamente.",
      );
      return;
    }

    pendingCleanupPath.current = storageObjectPath;
    formData.set("storageObjectPath", storageObjectPath);
    formData.set("originalFileName", file.name);
    formData.set("fileSizeBytes", String(file.size));
    setUploading(false);

    startTransition(() => {
      formAction(formData);
    });
  }

  const message = clientMessage || state.message;

  return (
    <form onSubmit={handleSubmit} className="mt-8 space-y-6">
      <div>
        <label htmlFor="title" className="block font-semibold text-zinc-900">
          Título
        </label>
        <input
          id="title"
          name="title"
          type="text"
          minLength={2}
          maxLength={180}
          required
          disabled={isPending}
          className="mt-2 min-h-12 w-full rounded-xl border border-zinc-300 bg-white px-4 text-zinc-950 outline-none focus:border-zinc-950 focus:ring-2 focus:ring-zinc-300 disabled:opacity-60"
        />
      </div>

      <div>
        <label
          htmlFor="categoryId"
          className="block font-semibold text-zinc-900"
        >
          Categoria
        </label>
        <select
          id="categoryId"
          name="categoryId"
          required
          defaultValue=""
          disabled={isPending}
          className="mt-2 min-h-12 w-full rounded-xl border border-zinc-300 bg-white px-4 text-zinc-950 outline-none focus:border-zinc-950 focus:ring-2 focus:ring-zinc-300 disabled:opacity-60"
        >
          <option value="" disabled>
            Selecione uma categoria
          </option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label
          htmlFor="description"
          className="block font-semibold text-zinc-900"
        >
          Descrição <span className="font-normal text-zinc-600">(opcional)</span>
        </label>
        <textarea
          id="description"
          name="description"
          rows={4}
          maxLength={2000}
          disabled={isPending}
          className="mt-2 w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 text-zinc-950 outline-none focus:border-zinc-950 focus:ring-2 focus:ring-zinc-300 disabled:opacity-60"
        />
      </div>

      <div>
        <label htmlFor="pdfFile" className="block font-semibold text-zinc-900">
          Arquivo PDF
        </label>
        <input
          id="pdfFile"
          name="pdfFile"
          type="file"
          accept="application/pdf,.pdf"
          required
          disabled={isPending}
          className="mt-2 block w-full rounded-xl border border-zinc-300 bg-white px-3 py-3 text-zinc-800 file:mr-4 file:rounded-lg file:border-0 file:bg-zinc-950 file:px-4 file:py-2 file:font-semibold file:text-white disabled:opacity-60"
        />
        <p className="mt-2 text-sm text-zinc-600">
          Somente PDF, com tamanho máximo de 10 MB.
        </p>
      </div>

      {message ? (
        <p
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-4 text-red-800"
        >
          {message}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={isPending}
        className="min-h-12 w-full rounded-xl bg-zinc-950 px-5 font-semibold text-white transition-colors hover:bg-zinc-800 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-zinc-900 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto sm:min-w-56"
      >
        {uploading
          ? "Enviando PDF..."
          : actionPending
            ? "Registrando publicação..."
            : "Publicar documento"}
      </button>
    </form>
  );
}
