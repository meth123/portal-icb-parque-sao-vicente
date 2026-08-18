import type { Metadata } from "next";
import Link from "next/link";
import { CalendarDays, Download, FileText, Plus } from "lucide-react";
import { redirect } from "next/navigation";
import { Alert } from "@/components/ui/alert";
import { buttonClassName } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { FilterPanel } from "@/components/ui/filter-panel";
import { PageContainer } from "@/components/ui/page-container";
import { PageHeader } from "@/components/ui/page-header";
import { SectionHeader } from "@/components/ui/section-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { getCurrentUser } from "@/lib/auth/current-user";
import { canManageDocumentLibrary, getDocumentLibraryOverview } from "@/lib/data/document-library";
import { DeleteDocumentForm } from "./delete-document-form";

export const metadata: Metadata = {
  title: "Biblioteca de documentos | ICB Conecta",
  robots: { index: false, follow: false },
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
  searchParams: Promise<{ categoria?: string | string[]; erro?: string | string[] }>;
};

export default async function DocumentsPage({ searchParams }: DocumentsPageProps) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?erro=perfil");
  if (!user.isActive) redirect("/portal");

  const { categoria, erro } = await searchParams;
  const selectedCategoryId = typeof categoria === "string" ? categoria : undefined;
  const library = await getDocumentLibraryOverview(selectedCategoryId);
  if (!library) redirect("/portal");

  const canManage = await canManageDocumentLibrary();

  return (
    <main className="min-h-full bg-app-background py-6 sm:py-8">
      <PageContainer width="wide">
        <PageHeader
          eyebrow="Biblioteca"
          title="Documentos"
          description="Mensagens de célula e materiais preparados para apoiar a liderança."
          actions={
            canManage ? (
              <Link href="/portal/documentos/novo" className={buttonClassName()}>
                <Plus aria-hidden="true" className="size-5" />
                Publicar documento
              </Link>
            ) : null
          }
        />

        {erro === "download" ? (
          <Alert tone="danger" className="mt-6">
            Não foi possível baixar esse documento. Atualize a página e tente novamente.
          </Alert>
        ) : null}

        {library.hasError ? (
          <Alert tone="danger" className="mt-8">
            Não foi possível carregar a biblioteca. Tente novamente mais tarde.
          </Alert>
        ) : (
          <>
            <FilterPanel
              className="mt-8"
              title="Filtrar documentos"
              activeFilters={library.selectedCategoryId ? 1 : 0}
            >
              <form method="get" className="flex flex-col gap-3 sm:flex-row sm:items-end">
                <label className="w-full sm:max-w-md">
                  <span className="mb-2 block text-sm font-semibold text-app-foreground">Categoria</span>
                  <select
                    name="categoria"
                    defaultValue={library.selectedCategoryId}
                    className="min-h-12 w-full rounded-xl border border-app-border bg-surface px-4 text-app-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
                  >
                    <option value="">Todas as categorias</option>
                    {library.categories.map((category) => (
                      <option key={category.id} value={category.id}>{category.name}</option>
                    ))}
                  </select>
                </label>
                <button type="submit" className={buttonClassName({ size: "compact" })}>Aplicar</button>
                {library.selectedCategoryId ? (
                  <Link href="/portal/documentos" className={buttonClassName({ variant: "ghost", size: "compact" })}>
                    Limpar
                  </Link>
                ) : null}
              </form>
            </FilterPanel>

            <section aria-labelledby="publications-heading" className="mt-8">
              <SectionHeader
                id="publications-heading"
                title="Publicações"
                description="Arquivos disponíveis para consulta e download."
                action={
                  <StatusBadge tone="theme">
                    {library.publications.length} {library.publications.length === 1 ? "arquivo" : "arquivos"}
                  </StatusBadge>
                }
              />

              {library.publications.length > 0 ? (
                <ul className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {library.publications.map((publication) => {
                    const category = library.categories.find((item) => item.id === publication.categoryId);
                    return (
                      <li key={publication.id} className="flex min-w-0 flex-col rounded-2xl border border-app-border bg-surface p-5">
                        <div className="flex items-start justify-between gap-4">
                          <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-theme-primary-subtle text-theme-primary-active">
                            <FileText aria-hidden="true" className="size-5" />
                          </span>
                          <StatusBadge tone="neutral" className="max-w-full truncate">
                            {category?.name ?? "Documento"}
                          </StatusBadge>
                        </div>
                        <h3 className="mt-5 break-words text-lg font-semibold text-app-foreground">{publication.title}</h3>
                        <p className="mt-2 flex items-center gap-2 text-sm text-app-secondary">
                          <CalendarDays aria-hidden="true" className="size-4 shrink-0" />
                          Publicado em {formatDate(publication.publishedAt)}
                        </p>
                        <div className="mt-auto flex gap-2 pt-6">
                          <a
                            href={`/portal/documentos/${publication.id}/download`}
                            className={buttonClassName({ variant: "secondary", size: "compact", className: "min-w-0 flex-1" })}
                          >
                            <Download aria-hidden="true" className="size-4" />
                            Baixar PDF
                          </a>
                          {canManage ? <DeleteDocumentForm publicationId={publication.id} /> : null}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <EmptyState
                  className="mt-4"
                  icon={<FileText className="size-7" />}
                  title="Nenhum documento encontrado"
                  description={library.selectedCategoryId ? "Não há publicações nesta categoria." : "As próximas mensagens e materiais aparecerão aqui."}
                />
              )}
            </section>
          </>
        )}
      </PageContainer>
    </main>
  );
}
