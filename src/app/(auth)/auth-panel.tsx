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
    <div>
      <header>
        {eyebrow ? (
          <p className="text-sm font-semibold text-theme-primary">{eyebrow}</p>
        ) : null}
        <h1
          className={`${eyebrow ? "mt-2" : ""} text-3xl font-semibold text-app-foreground`}
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
