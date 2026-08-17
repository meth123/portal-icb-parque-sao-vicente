export default function Home() {
  return (
    <section className="flex w-full items-center justify-center px-6 py-16">
      <div className="w-full max-w-xl rounded-3xl border border-zinc-200 bg-white p-8 text-center shadow-sm sm:p-12">
        <p className="mb-5 text-sm font-semibold uppercase tracking-[0.2em] text-zinc-600">
          Em desenvolvimento
        </p>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          ICB Conecta
        </h1>
        <p className="mt-5 text-base leading-7 text-zinc-700">
          Este é um projeto experimental de aprendizado em desenvolvimento web.
        </p>
      </div>
    </section>
  );
}
