type PublicPagePlaceholderProps = {
  title: string;
  description: string;
};

export function PublicPagePlaceholder({
  title,
  description,
}: PublicPagePlaceholderProps) {
  return (
    <section className="flex w-full items-center justify-center px-6 py-16">
      <div className="w-full max-w-2xl rounded-3xl border border-zinc-200 bg-white p-8 text-center shadow-sm sm:p-12">
        <p className="mb-5 text-sm font-semibold uppercase tracking-[0.2em] text-zinc-600">
          Página em construção
        </p>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          {title}
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-base leading-7 text-zinc-700">
          {description}
        </p>
      </div>
    </section>
  );
}
