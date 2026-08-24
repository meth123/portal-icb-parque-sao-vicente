import type { ReactNode } from "react";

type AuthPanelProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  children: ReactNode;
};

export function AuthPanel({
  eyebrow,
  title,
  description,
  children,
}: AuthPanelProps) {
  return (
    <div className="animate-[auth-enter_360ms_var(--ease-out)_both] motion-reduce:animate-none">
      <header>
        {eyebrow ? (
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-theme-primary">
            {eyebrow}
          </p>
        ) : null}
        <h1
          className={`${eyebrow ? "mt-2" : ""} text-[1.75rem] font-semibold leading-tight tracking-[-0.025em] text-app-foreground sm:text-3xl`}
        >
          {title}
        </h1>
        {description ? (
          <p className="mt-3 text-base leading-7 text-app-secondary">
            {description}
          </p>
        ) : null}
      </header>
      {children}
    </div>
  );
}
