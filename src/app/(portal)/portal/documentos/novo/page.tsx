import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import {
  canManageDocumentLibrary,
  getActiveDocumentCategories,
} from "@/lib/data/document-library";
import { DocumentUploadForm } from "./document-upload-form";

export const metadata: Metadata = {
  title: "Publicar documento | ICB Conecta",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function NewDocumentPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login?erro=perfil");
  }

  if (!user.isActive || !(await canManageDocumentLibrary())) {
    redirect("/portal/documentos");
  }

  const categoryOptions = await getActiveDocumentCategories();

  if (!categoryOptions || categoryOptions.hasError) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-zinc-100 px-4 py-10 sm:px-6">
        <section className="w-full max-w-lg rounded-3xl border border-zinc-200 bg-white p-6 text-center shadow-sm sm:p-10">
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-950">
            Publicação indisponível
          </h1>
          <p className="mt-4 leading-7 text-zinc-700">
            Não foi possível carregar as categorias de documentos. Tente
            novamente mais tarde.
          </p>
          <Link
            href="/portal/documentos"
            className="mt-8 flex min-h-12 items-center justify-center rounded-xl border border-zinc-300 px-5 font-semibold text-zinc-900 hover:bg-zinc-100"
          >
            Voltar à biblioteca
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-100 px-4 py-10 sm:px-6">
      <section className="mx-auto w-full max-w-4xl rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-10">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-zinc-600">
          Biblioteca · Fase 4
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-zinc-950 sm:text-4xl">
          Publicar documento
        </h1>
        <p className="mt-4 max-w-3xl leading-7 text-zinc-700">
          O PDF será armazenado de forma privada. Somente usuários autenticados
          e autorizados poderão acessá-lo futuramente pela biblioteca.
        </p>

        {categoryOptions.categories.length > 0 ? (
          <DocumentUploadForm
            categories={categoryOptions.categories}
            currentUserId={user.id}
          />
        ) : (
          <p
            role="alert"
            className="mt-8 rounded-xl border border-amber-200 bg-amber-50 px-4 py-4 text-amber-900"
          >
            Nenhuma categoria ativa está disponível para publicação.
          </p>
        )}

        <Link
          href="/portal/documentos"
          className="mt-6 flex min-h-12 w-full items-center justify-center rounded-xl border border-zinc-300 bg-white px-5 font-semibold text-zinc-900 hover:bg-zinc-100 sm:w-auto sm:min-w-52"
        >
          Cancelar e voltar
        </Link>
      </section>
    </main>
  );
}
