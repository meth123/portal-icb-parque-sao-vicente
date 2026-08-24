export const controlClassName =
  "min-h-12 w-full rounded-[0.875rem] border border-app-border bg-surface px-4 text-base text-app-foreground shadow-[0_1px_0_rgba(35,29,39,0.02)] outline-none transition-[border-color,box-shadow,background-color] duration-150 placeholder:text-app-secondary/75 hover:border-theme-primary-border focus:border-theme-primary focus:ring-3 focus:ring-theme-primary-soft disabled:cursor-not-allowed disabled:bg-surface-muted disabled:text-app-secondary disabled:opacity-70 read-only:bg-surface-muted";

export const compactControlClassName =
  "min-h-11 w-full rounded-[0.8125rem] border border-app-border bg-surface px-3 text-base text-app-foreground outline-none transition-[border-color,box-shadow,background-color] duration-150 hover:border-theme-primary-border focus:border-theme-primary focus:ring-3 focus:ring-theme-primary-soft disabled:cursor-not-allowed disabled:bg-surface-muted disabled:text-app-secondary disabled:opacity-70";

export const dangerControlClassName = `${controlClassName} focus:!border-danger focus:!ring-danger-soft`;

export const choiceClassName =
  "cursor-pointer rounded-[0.875rem] border border-app-border bg-surface transition-[border-color,background-color,box-shadow,transform] duration-150 ease-out hover:border-theme-primary-border hover:bg-theme-primary-subtle active:scale-[0.98] active:bg-theme-primary-soft has-[:checked]:border-theme-primary has-[:checked]:bg-theme-primary-soft has-[:checked]:shadow-[inset_0_0_0_1px_var(--theme-primary)] has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-focus has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-60 motion-reduce:transform-none";
