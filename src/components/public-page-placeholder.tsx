type PublicPagePlaceholderProps = {
  title: string;
  description: string;
};

export function PublicPagePlaceholder({
  title,
  description,
}: PublicPagePlaceholderProps) {
  return (
    <section className="flex w-full items-center justify-center px-5 py-14 sm:px-7 sm:py-20">
      <div className="w-full max-w-2xl text-center">
        <span aria-hidden="true" className="mx-auto mb-6 block h-1 w-12 rounded-full bg-theme-primary" />
        <p className="mb-4 text-xs font-bold uppercase tracking-[0.16em] text-theme-primary">
          Página em construção
        </p>
        <h1 className="text-[2rem] font-semibold tracking-[-0.03em] text-app-foreground sm:text-4xl">
          {title}
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-base leading-7 text-app-secondary">
          {description}
        </p>
      </div>
    </section>
  );
}
