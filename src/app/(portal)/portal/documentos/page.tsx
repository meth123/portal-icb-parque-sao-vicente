import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  BookMarked,
  BookOpenText,
  CalendarDays,
  ClipboardList,
  Download,
  FileCheck2,
  FileText,
  HeartHandshake,
  MessageSquareText,
  NotebookTabs,
  Plus,
  ScrollText,
  type LucideIcon,
} from "lucide-react";
import { redirect } from "next/navigation";
import { Alert } from "@/components/ui/alert";
import { buttonClassName } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageContainer } from "@/components/ui/page-container";
import { PageHeader } from "@/components/ui/page-header";
import { SectionHeader } from "@/components/ui/section-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { getCurrentUser } from "@/lib/auth/current-user";
import {
  canManageDocumentLibrary,
  getDocumentLibraryOverview,
  type DocumentCategorySummary,
} from "@/lib/data/document-library";
import { DeleteDocumentForm } from "./delete-document-form";

export const metadata: Metadata = {
  title: "Biblioteca de documentos | ICB Conecta",
  robots: { index: false, follow: false },
};

const categoryPresentation: Record<
  string,
  { description: string; icon: LucideIcon; title?: string }
> = {
  "cell-messages": {
    description: "Mensagens e conteúdos para os encontros.",
    icon: MessageSquareText,
  },
  consolidation: {
    description: "Lições para acompanhar os primeiros passos.",
    icon: HeartHandshake,
  },
  "consolidation-manual": {
    description: "Orientações para quem cuida e acompanha.",
    icon: BookMarked,
  },
  "consolidation-reports": {
    description: "Fichas e relatórios de acompanhamento.",
    icon: ClipboardList,
  },
  "post-encounter": {
    description: "Estudos e materiais do Pós-Encontro.",
    icon: BookOpenText,
  },
  "monthly-organization-form": {
    description: "Fichas mensais e semanais de organização.",
    icon: FileCheck2,
  },
  "confession-prayer": {
    description: "Material para oração e confissão.",
    icon: ScrollText,
  },
  "prayer-guide": {
    title: "Roteiro e ficha de oração",
    description:
      "Ficha para a primeira visita à célula e roteiro para aprender o devocional.",
    icon: NotebookTabs,
  },
  "one-year-bible-reading": {
    description: "Planejamento mensal da leitura bíblica.",
    icon: BookOpenText,
  },
};

const monthOrder = [
  "janeiro",
  "fevereiro",
  "março",
  "abril",
  "maio",
  "junho",
  "julho",
  "agosto",
  "setembro",
  "outubro",
  "novembro",
  "dezembro",
];
const lessonOrder = [
  "primeira lição",
  "segunda lição",
  "terceira lição",
  "quarta lição",
  "quinta lição",
  "sexta lição",
  "sétima lição",
  "oitava lição",
];

const featuredCategoryOrder = [
  "consolidation",
  "post-encounter",
  "monthly-organization-form",
  "prayer-guide",
];

function materialSequence(title: string) {
  const normalizedTitle = title.toLocaleLowerCase("pt-BR");
  const study = normalizedTitle.match(/estudo\s+(\d+)/);
  if (study) return Number(study[1]);

  const lessonIndex = lessonOrder.findIndex((lesson) =>
    normalizedTitle.includes(lesson),
  );
  if (lessonIndex >= 0) return lessonIndex + 1;

  const monthIndex = monthOrder.findIndex((month) =>
    normalizedTitle.includes(month),
  );
  if (monthIndex >= 0) return monthIndex + 1;

  return Number.MAX_SAFE_INTEGER;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value));
}

function presentationFor(category: DocumentCategorySummary) {
  return (
    categoryPresentation[category.code] ?? {
      description: "Materiais disponíveis para consulta.",
      icon: FileText,
    }
  );
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
  if (!user) redirect("/login?erro=perfil");
  if (!user.isActive) redirect("/portal");

  const { categoria, erro } = await searchParams;
  const selectedCategoryId =
    typeof categoria === "string" ? categoria : undefined;
  const library = await getDocumentLibraryOverview(selectedCategoryId);
  if (!library) redirect("/portal");

  const canManage = await canManageDocumentLibrary();
  const selectedCategory = library.categories.find(
    (category) => category.id === library.selectedCategoryId,
  );
  const orderedCategories = [...library.categories].sort((first, second) => {
    const firstIndex = featuredCategoryOrder.indexOf(first.code);
    const secondIndex = featuredCategoryOrder.indexOf(second.code);
    const firstPosition = firstIndex === -1 ? Number.MAX_SAFE_INTEGER : firstIndex;
    const secondPosition =
      secondIndex === -1 ? Number.MAX_SAFE_INTEGER : secondIndex;

    return (
      firstPosition - secondPosition ||
      first.name.localeCompare(second.name, "pt-BR")
    );
  });
  const orderedPublications = [...library.publications].sort(
    (first, second) => {
      const sequenceDifference =
        materialSequence(first.title) - materialSequence(second.title);

      return sequenceDifference || first.title.localeCompare(second.title, "pt-BR");
    },
  );

  return (
    <main className="min-h-full bg-app-background py-6 sm:py-8">
      <PageContainer width="wide">
        <PageHeader
          eyebrow="Biblioteca"
          title="Materiais para servir melhor"
          description="Encontre mensagens, estudos, fichas e roteiros organizados por assunto."
          actions={
            canManage ? (
              <Link
                href="/portal/documentos/novo"
                className={buttonClassName()}
              >
                <Plus aria-hidden="true" className="size-5" />
                Publicar documento
              </Link>
            ) : null
          }
        />

        {erro === "download" ? (
          <Alert tone="danger" className="mt-6">
            Não foi possível baixar esse documento. Atualize a página e tente
            novamente.
          </Alert>
        ) : null}

        {library.hasError ? (
          <Alert tone="danger" className="mt-8">
            Não foi possível carregar a biblioteca. Tente novamente mais tarde.
          </Alert>
        ) : selectedCategory ? (
          <section aria-labelledby="category-heading" className="mt-8">
            <Link
              href="/portal/documentos"
              className={buttonClassName({
                variant: "ghost",
                size: "compact",
                className: "-ml-4",
              })}
            >
              <ArrowLeft aria-hidden="true" className="size-4" />
              Todas as categorias
            </Link>

            <div className="mt-5 flex items-start gap-4 border-b border-app-border pb-6">
              {(() => {
                const presentation = presentationFor(selectedCategory);
                const CategoryIcon = presentation.icon;

                return (
                  <span
                    aria-hidden="true"
                    className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-theme-primary-soft text-theme-primary-active"
                  >
                    <CategoryIcon className="size-6" strokeWidth={1.8} />
                  </span>
                );
              })()}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-3">
                  <h2
                    id="category-heading"
                    className="text-2xl font-semibold tracking-[-0.02em] text-app-foreground sm:text-3xl"
                  >
                    {presentationFor(selectedCategory).title ??
                      selectedCategory.name}
                  </h2>
                  <StatusBadge tone="theme">
                    {orderedPublications.length}{" "}
                    {orderedPublications.length === 1
                      ? "material"
                      : "materiais"}
                  </StatusBadge>
                </div>
                <p className="mt-2 max-w-2xl leading-7 text-app-secondary">
                  {presentationFor(selectedCategory).description}
                </p>
              </div>
            </div>

            {orderedPublications.length > 0 ? (
              <ul className="divide-y divide-app-border sm:mt-2">
                {orderedPublications.map((publication) => (
                  <li
                    key={publication.id}
                    className="flex flex-col gap-4 py-5 sm:flex-row sm:items-center sm:gap-5"
                  >
                    <span
                      aria-hidden="true"
                      className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-surface-muted text-theme-primary-active"
                    >
                      <FileText className="size-5" strokeWidth={1.8} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <h3 className="break-words font-semibold leading-6 text-app-foreground">
                        {publication.title}
                      </h3>
                      <p className="mt-1 flex items-center gap-2 text-sm text-app-secondary">
                        <CalendarDays
                          aria-hidden="true"
                          className="size-4 shrink-0"
                        />
                        Publicado em {formatDate(publication.publishedAt)}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <a
                        href={`/portal/documentos/${publication.id}/download`}
                        className={buttonClassName({
                          variant: "secondary",
                          size: "compact",
                          className: "min-w-0 flex-1 sm:flex-none",
                        })}
                      >
                        <Download aria-hidden="true" className="size-4" />
                        Baixar PDF
                      </a>
                      {canManage ? (
                        <DeleteDocumentForm publicationId={publication.id} />
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState
                className="mt-5"
                icon={<FileText className="size-7" />}
                title="Nenhum material nesta categoria"
                description="Os próximos documentos aparecerão aqui quando forem publicados."
              />
            )}
          </section>
        ) : (
          <section aria-labelledby="categories-heading" className="mt-8">
            <SectionHeader
              id="categories-heading"
              title="Explore por categoria"
              description="Escolha uma seção para ver somente os materiais relacionados."
              action={
                <StatusBadge tone="theme">
                  {library.totalPublicationCount}{" "}
                  {library.totalPublicationCount === 1
                    ? "material"
                    : "materiais"}
                </StatusBadge>
              }
            />

            {orderedCategories.length > 0 ? (
              <ul className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {orderedCategories.map((category) => {
                  const presentation = presentationFor(category);
                  const CategoryIcon = presentation.icon;
                  const count = library.categoryCounts[category.id] ?? 0;

                  return (
                    <li key={category.id}>
                      <Link
                        href={`/portal/documentos?categoria=${category.id}`}
                        className="group grid min-h-32 h-full grid-cols-[2.75rem_minmax(0,1fr)_auto] items-start gap-3 rounded-[var(--radius-surface)] border border-app-border bg-surface p-4 shadow-[var(--shadow-subtle)] transition-[background-color,border-color,box-shadow,transform] duration-150 hover:border-theme-primary-border hover:bg-theme-primary-subtle hover:shadow-[var(--shadow-raised)] active:scale-[0.985] active:shadow-none focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-focus motion-reduce:transform-none sm:p-5"
                      >
                        <span
                          aria-hidden="true"
                          className="flex size-11 items-center justify-center rounded-xl bg-theme-primary-soft text-theme-primary-active"
                        >
                          <CategoryIcon className="size-5" strokeWidth={1.8} />
                        </span>
                        <span className="min-w-0">
                          <span className="block font-semibold leading-6 text-app-foreground">
                            {presentation.title ?? category.name}
                          </span>
                          <span className="mt-1 block text-sm leading-5 text-app-secondary">
                            {presentation.description}
                          </span>
                          <span className="mt-3 block text-xs font-semibold text-theme-primary-active">
                            {count} {count === 1 ? "material" : "materiais"}
                          </span>
                        </span>
                        <ArrowRight
                          aria-hidden="true"
                          className="mt-1 size-5 shrink-0 text-theme-primary transition-transform group-hover:translate-x-1 group-active:translate-x-1.5 motion-reduce:transform-none"
                          strokeWidth={1.8}
                        />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <EmptyState
                className="mt-5"
                icon={<FileText className="size-7" />}
                title="Biblioteca em organização"
                description="As categorias de materiais aparecerão aqui."
              />
            )}
          </section>
        )}
      </PageContainer>
    </main>
  );
}
