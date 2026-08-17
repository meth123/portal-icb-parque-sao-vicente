import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import {
  canManageDocumentLibrary,
  getDocumentLibraryOverview,
} from "@/lib/data/document-library";
import { DeleteDocumentForm } from "./delete-document-form";

export const metadata: Metadata = {
  title: "Biblioteca de documentos | ICB Conecta",
  robots: {
    index: false,
    follow: false,
  },
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value));
}

type DocumentsPageProps = {
  searchParams: Promise<{
    categoria?: string | string[];
    erro?: string | string[];
  }>;
};

export default async function DocumentsPage({
  searchParams,
}: DocumentsPageProps) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login?erro=perfil");
  }

  if (!user.isActive) {
    redirect("/portal");
  }

  const { categoria, erro } = await searchParams;
  const selectedCategoryId =
    typeof categoria === "string" ? categoria : undefined;
  const library = await getDocumentLibraryOverview(selectedCategoryId);

  if (!library) {
    redirect("/portal");
  }

  const canManage = await canManageDocumentLibrary();
  const hasDownloadError = erro === "download";

  return (
    <main className="min-h-screen bg-zinc-100 px-4 py-10 sm:px-6">
      <section className="mx-auto w-full max-w-5xl rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-10">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-zinc-600">
          Área interna · Fase 4
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-zinc-950 sm:text-4xl">
          Biblioteca de documentos
        </h1>
        <div className="mt-4 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
          <p className="max-w-3xl text-base leading-7 text-zinc-700">
            Consulte mensagens de célula e outros materiais disponibilizados
            para a liderança.
          </p>
          {canManage ? (
            <Link
              href="/portal/documentos/novo"
              className="flex min-h-12 w-full shrink-0 items-center justify-center rounded-xl bg-zinc-950 px-5 font-semibold text-white transition-colors hover:bg-zinc-800 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-zinc-900 sm:w-auto"
            >
              Publicar documento
            </Link>
          ) : null}
        </div>

        {hasDownloadError ? (
          <p
            role="alert"
            className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-4 text-red-800"
          >
            Não foi possível baixar esse documento. Atualize a página e tente
            novamente.
          </p>
        ) : null}

        {library.hasError ? (
          <p
            role="alert"
            className="mt-8 rounded-xl border border-red-200 bg-red-50 px-4 py-4 text-red-800"
          >
            Não foi possível carregar a biblioteca. Tente novamente mais tarde.
          </p>
        ) : (
          <>
            <section aria-labelledby="categories-heading" className="mt-8">
              <h2
                id="categories-heading"
                className="text-xl font-semibold text-zinc-950"
              >
                Filtrar por categoria
              </h2>
              <form method="get" className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
                <label className="w-full sm:max-w-md">
                  <span className="sr-only">Categoria</span>
                  <select
                    name="categoria"
                    defaultValue={library.selectedCategoryId}
                    className="min-h-12 w-full rounded-xl border border-zinc-300 bg-white px-4 text-zinc-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900"
                  >
                    <option value="">Todas as categorias</option>
                    {library.categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  type="submit"
                  className="min-h-12 rounded-xl bg-zinc-950 px-5 font-semibold text-white hover:bg-zinc-800 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-zinc-900"
                >
                  Aplicar filtro
                </button>
                {library.selectedCategoryId ? (
                  <Link
                    href="/portal/documentos"
                    className="flex min-h-12 items-center justify-center rounded-xl border border-zinc-300 bg-white px-5 font-semibold text-zinc-900 hover:bg-zinc-100 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-zinc-900"
                  >
                    Limpar
                  </Link>
                ) : null}
              </form>
            </section>

            <section aria-labelledby="publications-heading" className="mt-10">
              <div className="flex flex-wrap items-baseline justify-between gap-3">
                <h2
                  id="publications-heading"
                  className="text-xl font-semibold text-zinc-950"
                >
                  Publicações
                </h2>
                <p className="text-sm text-zinc-600">
                  {library.publications.length}{" "}
                  {library.publications.length === 1
                    ? "documento disponível"
                    : "documentos disponíveis"}
                </p>
              </div>

              {library.publications.length > 0 ? (
                <ul className="mt-4 grid gap-4 md:grid-cols-2">
                  {library.publications.map((publication) => {
                    const category = library.categories.find(
                      (item) => item.id === publication.categoryId,
                    );

                    return (
                      <li
                        key={publication.id}
                        className="rounded-2xl border border-zinc-200 bg-zinc-50 p-5"
                      >
                        <p className="text-sm font-semibold text-zinc-600">
                          {category?.name ?? "Documento"}
                        </p>
                        <h3 className="mt-2 text-lg font-semibold text-zinc-950">
                          {publication.title}
                        </h3>
                        <dl className="mt-4 text-sm text-zinc-600">
                          <div className="flex flex-wrap gap-x-2">
                            <dt>Data da postagem</dt>
                            <dd>{formatDate(publication.publishedAt)}</dd>
                          </div>
                        </dl>
                        <a
                          href={`/portal/documentos/${publication.id}/download`}
                          className="mt-5 flex min-h-12 w-full items-center justify-center rounded-xl border border-zinc-300 bg-white px-5 font-semibold text-zinc-900 transition-colors hover:bg-zinc-100 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-zinc-900"
                        >
                          Baixar PDF
                        </a>
                        {canManage ? (
                          <DeleteDocumentForm publicationId={publication.id} />
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <div className="mt-4 rounded-2xl border border-dashed border-zinc-300 bg-zinc-50 p-6 text-center sm:p-10">
                  <h3 className="text-lg font-semibold text-zinc-950">
                    Nenhum documento publicado ainda
                  </h3>
                  <p className="mt-2 leading-7 text-zinc-600">
                    As próximas mensagens e materiais aparecerão aqui.
                  </p>
                </div>
              )}
            </section>
          </>
        )}

        <Link
          href="/portal"
          className="mt-8 flex min-h-12 w-full items-center justify-center rounded-xl border border-zinc-300 bg-white px-5 font-semibold text-zinc-900 transition-colors hover:bg-zinc-100 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-zinc-900 sm:w-auto sm:min-w-52"
        >
          Voltar ao ICB Conecta
        </Link>
      </section>
    </main>
  );
}
