import "server-only";

import { cache } from "react";
import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";

export type GlobalRole = "user" | "pastor" | "administrator";

export type CurrentUser = {
  id: string;
  email: string | null;
  fullName: string | null;
  avatarPath: string | null;
  birthDate: string | null;
  leadershipStartedOn: string | null;
  globalRole: GlobalRole;
  isSupervisor: boolean;
  canManageCells: boolean;
  isActive: boolean;
  mustChangePassword: boolean;
  currentCellId: string | null;
  currentLeadershipRole: "leader" | "vice_leader" | null;
  hasDocumentLibraryAccess: boolean;
  canManageDocumentLibrary: boolean;
};

const globalRoles: GlobalRole[] = ["user", "pastor", "administrator"];

type RawPortalSessionContext = {
  id: string;
  fullName: string | null;
  avatarPath: string | null;
  birthDate: string | null;
  leadershipStartedOn: string | null;
  globalRole: string;
  isSupervisor: boolean;
  canManageCells: boolean;
  isActive: boolean;
  mustChangePassword: boolean;
  currentCellId: string | null;
  currentLeadershipRole: "leader" | "vice_leader" | null;
  hasDocumentLibraryAccess: boolean;
  canManageDocumentLibrary: boolean;
};

export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  await connection();

  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const claims = claimsData?.claims;

  if (!claims || typeof claims.sub !== "string") {
    return null;
  }

  const { data, error } = await supabase.rpc("get_portal_session_context");
  const profile = data as RawPortalSessionContext | null;

  if (error || !profile || profile.id !== claims.sub) {
    return null;
  }

  const globalRole = globalRoles.includes(profile.globalRole as GlobalRole)
    ? (profile.globalRole as GlobalRole)
    : "user";

  return {
    id: claims.sub,
    email: typeof claims.email === "string" ? claims.email : null,
    fullName: profile.fullName,
    avatarPath: profile.avatarPath,
    birthDate: profile.birthDate,
    leadershipStartedOn: profile.leadershipStartedOn,
    globalRole,
    isSupervisor: profile.isSupervisor,
    canManageCells: profile.canManageCells,
    isActive: profile.isActive,
    mustChangePassword: profile.mustChangePassword,
    currentCellId: profile.currentCellId,
    currentLeadershipRole: profile.currentLeadershipRole,
    hasDocumentLibraryAccess: profile.hasDocumentLibraryAccess,
    canManageDocumentLibrary: profile.canManageDocumentLibrary,
  };
});

export function canAccessAdministration(user: CurrentUser) {
  return (
    user.isActive &&
    !user.mustChangePassword &&
    (user.globalRole === "administrator" || user.globalRole === "pastor")
  );
}

export function canManageCellAdministration(user: CurrentUser) {
  return (
    user.isActive &&
    !user.mustChangePassword &&
    (user.globalRole === "administrator" || user.globalRole === "pastor")
  );
}

export function canAccessPastoralDashboard(user: CurrentUser) {
  return (
    user.isActive &&
    !user.mustChangePassword &&
    (user.globalRole === "administrator" ||
      user.globalRole === "pastor" ||
      user.isSupervisor)
  );
}
