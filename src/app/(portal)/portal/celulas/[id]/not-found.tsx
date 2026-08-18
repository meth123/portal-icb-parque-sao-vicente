import Link from "next/link";
import { House } from "lucide-react";
import { buttonClassName } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageContainer } from "@/components/ui/page-container";

export default function CellNotFound() {
  return (
    <main className="flex min-h-[calc(100dvh-5rem)] items-center bg-app-background py-8 lg:min-h-dvh">
      <PageContainer width="narrow">
        <EmptyState
          icon={<House className="size-7" />}
          title="Não foi possível abrir esta célula"
          description="O registro não existe ou sua conta não possui acesso a ele."
          action={
            <Link href="/portal/organizacao" className={buttonClassName({ variant: "secondary" })}>
              Voltar às células
            </Link>
          }
        />
      </PageContainer>
    </main>
  );
}
