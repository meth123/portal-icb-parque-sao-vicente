import { PageContainer } from "@/components/ui/page-container";

export function DashboardLoading({ label }: { label: string }) {
  return (
    <main
      className="min-h-full bg-app-background py-6 sm:py-8"
      aria-busy="true"
      aria-live="polite"
    >
      <PageContainer width="wide">
        <p className="sr-only">{label}</p>
        <div className="space-y-6 motion-safe:animate-pulse" aria-hidden="true">
          <div className="space-y-3">
            <div className="h-4 w-28 rounded bg-surface-muted" />
            <div className="h-9 w-64 max-w-full rounded-lg bg-surface-muted" />
            <div className="h-5 w-96 max-w-full rounded bg-surface-muted" />
          </div>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {Array.from({ length: 4 }, (_, index) => (
              <div
                key={index}
                className="h-28 rounded-2xl border border-app-border bg-surface"
              />
            ))}
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="h-72 rounded-2xl border border-app-border bg-surface" />
            <div className="h-72 rounded-2xl border border-app-border bg-surface" />
          </div>
        </div>
      </PageContainer>
    </main>
  );
}
