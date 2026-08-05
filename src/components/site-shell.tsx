import type { ReactNode } from "react";

type SiteShellProps = {
  children: ReactNode;
};

export function SiteShell({ children }: SiteShellProps) {
  return (
    <div className="flex min-h-screen flex-col bg-zinc-50 text-zinc-950 dark:bg-zinc-950 dark:text-zinc-50">
      <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-5">
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-xl bg-zinc-900 text-sm font-bold tracking-tight text-white dark:bg-zinc-50 dark:text-zinc-950">
              ICB
            </span>
            <span className="text-sm font-semibold tracking-tight sm:text-base">
              Portal ICB Parque São Vicente
            </span>
          </div>
          <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
            Projeto experimental
          </span>
        </div>
      </header>

      <main className="flex flex-1">{children}</main>

      <footer className="border-t border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mx-auto w-full max-w-6xl px-6 py-5 text-center text-sm text-zinc-500 dark:text-zinc-400">
          Projeto em desenvolvimento.
        </div>
      </footer>
    </div>
  );
}
