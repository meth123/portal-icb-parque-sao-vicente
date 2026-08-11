import "server-only";

import {
  canAccessAdministration,
  getCurrentUser,
} from "@/lib/auth/current-user";
import { createClient } from "@/lib/supabase/server";

export type CellFormOption = {
  value: string;
  label: string;
};

export type CellLeaderOption = CellFormOption & {
  description: string;
};

type AdminProfileRow = {
  profile_id: string;
  full_name: string | null;
  email: string;
  global_role: string;
  is_supervisor: boolean;
};

export async function getCellAdministrationOptions() {
  const user = await getCurrentUser();

  if (!user || !canAccessAdministration(user)) {
    return null;
  }

  const supabase = await createClient();
  const [networksResult, cellTypesResult, citiesResult, neighborhoodsResult, profilesResult] =
    await Promise.all([
      supabase
        .from("networks")
        .select("id, name, code")
        .eq("is_active", true)
        .order("name"),
      supabase
        .from("cell_types")
        .select("id, network_id, name")
        .eq("is_active", true)
        .order("name"),
      supabase
        .from("cities")
        .select("id, name, state_code")
        .eq("is_active", true)
        .order("name"),
      supabase
        .from("neighborhoods")
        .select("id, city_id, name")
        .eq("is_active", true)
        .order("name"),
      supabase.rpc("get_admin_profile_directory"),
    ]);

  const networksById = new Map(
    (networksResult.data ?? []).map((network) => [network.id, network]),
  );
  const citiesById = new Map(
    (citiesResult.data ?? []).map((city) => [city.id, city]),
  );

  const cellTypes = (cellTypesResult.data ?? [])
    .map((cellType) => {
      const network = networksById.get(cellType.network_id);

      if (!network) {
        return null;
      }

      return {
        value: cellType.id,
        label: `${network.code} — ${cellType.name}`,
      } satisfies CellFormOption;
    })
    .filter((option): option is CellFormOption => option !== null)
    .sort((first, second) => first.label.localeCompare(second.label, "pt-BR"));

  const neighborhoods = (neighborhoodsResult.data ?? [])
    .map((neighborhood) => {
      const city = citiesById.get(neighborhood.city_id);

      if (!city) {
        return null;
      }

      return {
        value: neighborhood.id,
        label: `${neighborhood.name}, ${city.name} — ${city.state_code}`,
      } satisfies CellFormOption;
    })
    .filter((option): option is CellFormOption => option !== null)
    .sort((first, second) => first.label.localeCompare(second.label, "pt-BR"));

  const leaders = ((profilesResult.data ?? []) as AdminProfileRow[]).map(
    (profile) => {
      const profileLabels: string[] = [];

      if (profile.global_role === "administrator") {
        profileLabels.push("Administrador");
      } else if (profile.global_role === "pastor") {
        profileLabels.push("Pastor");
      }

      if (profile.is_supervisor) {
        profileLabels.push("Supervisor");
      }

      return {
        value: profile.profile_id,
        label: profile.full_name ?? profile.email,
        description:
          profileLabels.length > 0
            ? `${profile.email} · ${profileLabels.join(" · ")}`
            : profile.email,
      } satisfies CellLeaderOption;
    },
  );

  const hasError = Boolean(
    networksResult.error ||
      cellTypesResult.error ||
      citiesResult.error ||
      neighborhoodsResult.error ||
      profilesResult.error,
  );

  return { cellTypes, neighborhoods, leaders, hasError };
}
