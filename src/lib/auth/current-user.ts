import "server-only";

import { cache } from "react";
import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";

export type GlobalRole = "user" | "pastor" | "administrator";

export type CurrentUser = {
  id: string;
  email: string | null;
  fullName: string | null;
  globalRole: GlobalRole;
  isSupervisor: boolean;
  isActive: boolean;
};

const globalRoles: GlobalRole[] = ["user", "pastor", "administrator"];

export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  await connection();

  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const claims = claimsData?.claims;

  if (!claims || typeof claims.sub !== "string") {
    return null;
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("full_name, global_role, is_supervisor, is_active")
    .eq("id", claims.sub)
    .maybeSingle();

  if (error || !profile) {
    return null;
  }

  const globalRole = globalRoles.includes(profile.global_role as GlobalRole)
    ? (profile.global_role as GlobalRole)
    : "user";

  return {
    id: claims.sub,
    email: typeof claims.email === "string" ? claims.email : null,
    fullName: profile.full_name,
    globalRole,
    isSupervisor: profile.is_supervisor,
    isActive: profile.is_active,
  };
});
