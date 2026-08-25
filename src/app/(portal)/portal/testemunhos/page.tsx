import type { Metadata } from "next";
import { ArrowLeft, ArrowRight, CalendarDays, Quote } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Alert } from "@/components/ui/alert";
import { buttonClassName } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageContainer } from "@/components/ui/page-container";
import { PageHeader } from "@/components/ui/page-header";
import { Surface } from "@/components/ui/surface";
import { getCurrentUser } from "@/lib/auth/current-user";
import {
  formatTestimonyDate,
  getTestimonyFeed,
  type TestimonyFeedItem,
} from "@/lib/data/testimonies";
import { DeleteTestimonyForm } from "./delete-testimony-form";
import { TestimonyComposer } from "./testimony-composer";
import { TestimonyReactions } from "./testimony-reactions";

export const metadata: Metadata = {
  title: "Testemunhos | ICB Conecta",
  robots: { index: false, follow: false },
};

type TestimoniesPageProps = {
  searchParams: Promise<{ cursor?: string | string[] }>;
};

export default async function TestimoniesPage({
  searchParams,
}: TestimoniesPageProps) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?erro=perfil");
  if (!user.isActive) redirect("/portal");

  const { cursor: cursorValue } = await searchParams;
  const cursor = typeof cursorValue === "string" ? cursorValue : undefined;
  const feed = await getTestimonyFeed(cursor);
  if (!feed) redirect("/portal");

  return (
    <main className="min-h-full bg-app-background py-6 sm:py-8">
      <PageContainer width="narrow">
        <PageHeader
          eyebrow="Comunidade"
          title="Testemunhos"
          description="Um espaço simples para registrar e celebrar o que Deus tem feito."
        />

        <TestimonyComposer canPublish={feed.canPublish} />

        <section aria-labelledby="testimonies-feed-title" className="mt-9">
          <div className="flex items-end justify-between gap-4 border-b border-app-border pb-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-theme-primary">
                Compartilhados
              </p>
              <h2
                id="testimonies-feed-title"
                className="mt-1 text-xl font-semibold text-app-foreground"
              >
                Testemunhos recentes
              </h2>
            </div>
          </div>

          {feed.hasError ? (
            <Alert tone="danger" className="mt-5">
              Não foi possível carregar os testemunhos. Atualize a página e
              tente novamente.
            </Alert>
          ) : feed.items.length > 0 ? (
            <ol className="mt-5 space-y-4">
              {feed.items.map((testimony) => (
                <li key={testimony.id}>
                  <TestimonyCard
                    testimony={testimony}
                    canModerate={feed.canModerate}
                  />
                </li>
              ))}
            </ol>
          ) : (
            <EmptyState
              className="mt-5"
              icon={<Quote className="size-7" />}
              title={cursor ? "Fim dos testemunhos" : "Nenhum testemunho ainda"}
              description={
                cursor
                  ? "Volte aos mais recentes para continuar a leitura."
                  : "O primeiro testemunho compartilhado aparecerá aqui."
              }
            />
          )}

          {!feed.hasError && (cursor || feed.nextCursor) ? (
            <nav
              aria-label="Paginação dos testemunhos"
              className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-between"
            >
              {cursor ? (
                <Link
                  href="/portal/testemunhos"
                  className={buttonClassName({
                    variant: "secondary",
                    size: "compact",
                  })}
                >
                  <ArrowLeft aria-hidden="true" className="size-4" />
                  Mais recentes
                </Link>
              ) : (
                <span />
              )}
              {feed.nextCursor ? (
                <Link
                  href={`/portal/testemunhos?cursor=${encodeURIComponent(feed.nextCursor)}`}
                  className={buttonClassName({
                    variant: "secondary",
                    size: "compact",
                  })}
                >
                  Testemunhos anteriores
                  <ArrowRight aria-hidden="true" className="size-4" />
                </Link>
              ) : null}
            </nav>
          ) : null}
        </section>
      </PageContainer>
    </main>
  );
}

function TestimonyCard({
  testimony,
  canModerate,
}: {
  testimony: TestimonyFeedItem;
  canModerate: boolean;
}) {
  const authorContext = testimony.authorCellName
    ? `${testimony.authorRoleLabel} • ${testimony.authorCellName}`
    : testimony.authorRoleLabel;

  return (
    <article>
      <Surface className="p-5 sm:p-6">
        <header className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h3 className="break-words font-semibold text-app-foreground">
              {testimony.authorName}
            </h3>
            <p className="mt-0.5 break-words text-sm text-app-secondary">
              {authorContext}
            </p>
          </div>
          {canModerate ? (
            <DeleteTestimonyForm testimonyId={testimony.id} />
          ) : null}
        </header>

        <p className="mt-5 whitespace-pre-wrap break-words text-[0.9375rem] leading-7 text-app-foreground sm:text-base">
          {testimony.content}
        </p>

        <div className="mt-5 border-t border-app-border pt-4">
          <TestimonyReactions
            testimonyId={testimony.id}
            amenCount={testimony.amenCount}
            likeCount={testimony.likeCount}
            viewerAmen={testimony.viewerAmen}
            viewerLike={testimony.viewerLike}
          />
          <p className="mt-4 flex items-center gap-2 text-xs text-app-secondary">
            <CalendarDays aria-hidden="true" className="size-3.5" />
            <time dateTime={testimony.createdAt}>
              {formatTestimonyDate(testimony.createdAt)}
            </time>
          </p>
        </div>
      </Surface>
    </article>
  );
}
