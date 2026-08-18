import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, FileUp } from "lucide-react";
import { redirect } from "next/navigation";
import { Alert } from "@/components/ui/alert";
import { buttonClassName } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageContainer } from "@/components/ui/page-container";
import { PageHeader } from "@/components/ui/page-header";
import { Surface } from "@/components/ui/surface";
import { getCurrentUser } from "@/lib/auth/current-user";
import { canManageDocumentLibrary, getActiveDocumentCategories } from "@/lib/data/document-library";
import { DocumentUploadForm } from "./document-upload-form";

export const metadata: Metadata = {
  title: "Publicar documento | ICB Conecta",
  robots: { index: false, follow: false },
};

export default async function NewDocumentPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?erro=perfil");
  if (!user.isActive || !(await canManageDocumentLibrary())) redirect("/portal/documentos");

  const categoryOptions = await getActiveDocumentCategories();

  return (
    <main className="min-h-full bg-app-background py-6 sm:py-8">
      <PageContainer>
        <PageHeader
          eyebrow="Biblioteca"
          title="Publicar documento"
          description="Adicione um PDF à biblioteca interna da liderança."
          actions={
            <Link href="/portal/documentos" className={buttonClassName({ variant: "secondary" })}>
              <ArrowLeft aria-hidden="true" className="size-5" />
              Voltar
            </Link>
          }
        />

        {!categoryOptions || categoryOptions.hasError ? (
          <EmptyState
            className="mt-8"
            icon={<FileUp className="size-7" />}
            title="Publicação indisponível"
            description="Não foi possível carregar as categorias. Tente novamente mais tarde."
            action={<Link href="/portal/documentos" className={buttonClassName({ variant: "secondary" })}>Voltar à biblioteca</Link>}
          />
        ) : categoryOptions.categories.length > 0 ? (
          <Surface className="mt-8 p-5 sm:p-7">
            <DocumentUploadForm categories={categoryOptions.categories} currentUserId={user.id} />
          </Surface>
        ) : (
          <Alert tone="warning" className="mt-8">
            Nenhuma categoria ativa está disponível para publicação.
          </Alert>
        )}
      </PageContainer>
    </main>
  );
}
