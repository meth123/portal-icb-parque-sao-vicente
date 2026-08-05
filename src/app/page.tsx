export default function Home() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-50 px-6 py-16 dark:bg-zinc-950">
      <section className="w-full max-w-xl rounded-3xl border border-zinc-200 bg-white p-8 text-center shadow-sm dark:border-zinc-800 dark:bg-zinc-900 sm:p-12">
        <p className="mb-5 text-sm font-semibold uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
          Em desenvolvimento
        </p>
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50 sm:text-4xl">
          Portal ICB Parque São Vicente
        </h1>
        <p className="mt-5 text-base leading-7 text-zinc-600 dark:text-zinc-300">
          Este é um projeto experimental de aprendizado em desenvolvimento web.
        </p>
      </section>
    </main>
  );
}
