import { SiteShell } from "@/components/site-shell";
import type { ReactNode } from "react";

export default function PublicLayout({ children }: { children: ReactNode }) {
  return <SiteShell>{children}</SiteShell>;
}
