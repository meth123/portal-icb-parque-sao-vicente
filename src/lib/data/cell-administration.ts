import "server-only";

import {
  canAccessAdministration,
  canManageCellAdministration,
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

type CellManagementProfileRow = {
  profile_id: string;
  full_name: string | null;
  email: string;
  global_role: string;
  is_supervisor: boolean;
  can_manage_cells: boolean;
  is_active: boolean;
  current_cell_id: string | null;
  current_cell_role: string | null;
  current_cell_name: string | null;
  current_network_id: string | null;
  current_network_name: string | null;
  current_cell_type_id: string | null;
  current_cell_type_name: string | null;
};

export type AdministrationProfile = CellManagementProfileRow;

export type ManagedCellSummary = {
  id: string;
  name: string;
  isActive: boolean;
  networkId: string;
  networkName: string;
  cellTypeId: string;
  cellTypeName: string;
  leaderName: string;
  viceLeaderNames: string[];
};

export type ManagedCellDetail = ManagedCellSummary & {
  startedOn: string | null;
  leaderProfileId: string;
  viceProfileIds: string[];
};

export async function getAdministrationOverview() {
  const user = await getCurrentUser();

  if (!user || !canAccessAdministration(user)) return null;

  const supabase = await createClient();
  const [profilesResult, cellsResult] = await Promise.all([
    supabase.rpc("get_cell_management_profile_directory"),
    supabase
      .from("cells")
      .select("id", { count: "exact", head: true })
      .eq("is_active", true),
  ]);

  return {
    profiles: (profilesResult.data ?? []) as CellManagementProfileRow[],
    activeCellCount: cellsResult.count ?? 0,
    hasError: Boolean(profilesResult.error || cellsResult.error),
  };
}

export async function getCellAdministrationOptions(targetCellId?: string) {
  const user = await getCurrentUser();

  if (!user || !canManageCellAdministration(user)) {
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
      supabase.rpc("get_cell_management_profile_directory"),
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

  const leaders = (
    (profilesResult.data ?? []) as CellManagementProfileRow[]
  )
    .filter(
      (profile) =>
        profile.is_active === true &&
        profile.global_role === "user" &&
        (!profile.current_cell_role ||
          profile.current_cell_id === targetCellId),
    )
    .map((profile) => {
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
    });

  const hasError = Boolean(
    networksResult.error ||
      cellTypesResult.error ||
      citiesResult.error ||
      neighborhoodsResult.error ||
      profilesResult.error,
  );

  return { cellTypes, neighborhoods, leaders, hasError };
}

type RawCell = {
  id: string;
  name: string;
  is_active: boolean;
  started_on: string | null;
};

type RawLeadership = {
  cell_id: string;
  profile_id: string;
  role: "leader" | "vice_leader";
};

type RawClassification = {
  cell_id: string;
  cell_type_id: string;
};

type RawCellType = {
  id: string;
  network_id: string;
  name: string;
};

type RawNetwork = {
  id: string;
  name: string;
};

export async function getManagedCells(): Promise<{
  cells: ManagedCellSummary[];
  hasError: boolean;
} | null> {
  const user = await getCurrentUser();

  if (!user || !canManageCellAdministration(user)) return null;

  const supabase = await createClient();
  const [
    cellsResult,
    leadershipsResult,
    classificationsResult,
    cellTypesResult,
    networksResult,
    profilesResult,
  ] = await Promise.all([
    supabase
      .from("cells")
      .select("id, name, is_active, started_on")
      .order("name"),
    supabase
      .from("cell_leaderships")
      .select("cell_id, profile_id, role")
      .is("ends_on", null),
    supabase
      .from("cell_classifications")
      .select("cell_id, cell_type_id")
      .is("ends_on", null),
    supabase.from("cell_types").select("id, network_id, name"),
    supabase.from("networks").select("id, name"),
    supabase.rpc("get_cell_management_profile_directory"),
  ]);

  const profileNames = new Map(
    ((profilesResult.data ?? []) as CellManagementProfileRow[]).map((profile) => [
      profile.profile_id,
      profile.full_name ?? profile.email,
    ]),
  );
  const leaderships = (leadershipsResult.data ?? []) as RawLeadership[];
  const classifications = (classificationsResult.data ?? []) as RawClassification[];
  const cellTypes = (cellTypesResult.data ?? []) as RawCellType[];
  const networks = (networksResult.data ?? []) as RawNetwork[];
  const cellTypesById = new Map(cellTypes.map((cellType) => [cellType.id, cellType]));
  const networksById = new Map(networks.map((network) => [network.id, network]));

  const cells = ((cellsResult.data ?? []) as RawCell[]).map((cell) => {
    const currentLeaderships = leaderships.filter(
      (leadership) => leadership.cell_id === cell.id,
    );
    const leader = currentLeaderships.find(
      (leadership) => leadership.role === "leader",
    );
    const classification = classifications.find(
      (item) => item.cell_id === cell.id,
    );
    const cellType = classification
      ? cellTypesById.get(classification.cell_type_id)
      : undefined;
    const network = cellType
      ? networksById.get(cellType.network_id)
      : undefined;

    return {
      id: cell.id,
      name: cell.name,
      isActive: cell.is_active,
      networkId: network?.id ?? "",
      networkName: network?.name ?? "Rede não encontrada",
      cellTypeId: cellType?.id ?? "",
      cellTypeName: cellType?.name ?? "Tipo não encontrado",
      leaderName: leader
        ? (profileNames.get(leader.profile_id) ?? "Nome não informado")
        : "Líder não encontrado",
      viceLeaderNames: currentLeaderships
        .filter((leadership) => leadership.role === "vice_leader")
        .map(
          (leadership) =>
            profileNames.get(leadership.profile_id) ?? "Nome não informado",
        )
        .sort((first, second) => first.localeCompare(second, "pt-BR")),
    } satisfies ManagedCellSummary;
  });

  return {
    cells,
    hasError: Boolean(
      cellsResult.error ||
        leadershipsResult.error ||
        classificationsResult.error ||
        cellTypesResult.error ||
        networksResult.error ||
        profilesResult.error,
    ),
  };
}

export async function getManagedAccounts(): Promise<{
  profiles: AdministrationProfile[];
  hasError: boolean;
} | null> {
  const user = await getCurrentUser();

  if (!user || !canManageCellAdministration(user)) return null;

  const supabase = await createClient();
  const profilesResult = await supabase.rpc(
    "get_cell_management_profile_directory",
  );

  return {
    profiles: (profilesResult.data ?? []) as CellManagementProfileRow[],
    hasError: Boolean(profilesResult.error),
  };
}

export async function getManagedCell(
  cellId: string,
): Promise<{
  cell: ManagedCellDetail | null;
  leaders: CellLeaderOption[];
  hasError: boolean;
} | null> {
  const user = await getCurrentUser();

  if (!user || !canManageCellAdministration(user)) return null;

  const supabase = await createClient();
  const [cellResult, leadershipsResult, options] = await Promise.all([
    supabase
      .from("cells")
      .select("id, name, is_active, started_on")
      .eq("id", cellId)
      .eq("is_active", true)
      .maybeSingle(),
    supabase
      .from("cell_leaderships")
      .select("cell_id, profile_id, role")
      .eq("cell_id", cellId)
      .is("ends_on", null),
    getCellAdministrationOptions(cellId),
  ]);

  if (!options) return null;

  const rawCell = cellResult.data as RawCell | null;
  const leaderships = (leadershipsResult.data ?? []) as RawLeadership[];
  const leader = leaderships.find(
    (leadership) => leadership.role === "leader",
  );
  const profileNames = new Map(
    options.leaders.map((profile) => [profile.value, profile.label]),
  );

  const cell =
    rawCell && leader
      ? ({
          id: rawCell.id,
          name: rawCell.name,
          isActive: rawCell.is_active,
          networkId: "",
          networkName: "",
          cellTypeId: "",
          cellTypeName: "",
          startedOn: rawCell.started_on,
          leaderProfileId: leader.profile_id,
          viceProfileIds: leaderships
            .filter((leadership) => leadership.role === "vice_leader")
            .map((leadership) => leadership.profile_id)
            .sort(),
          leaderName:
            profileNames.get(leader.profile_id) ?? "Nome não informado",
          viceLeaderNames: leaderships
            .filter((leadership) => leadership.role === "vice_leader")
            .map(
              (leadership) =>
                profileNames.get(leadership.profile_id) ??
                "Nome não informado",
            )
            .sort((first, second) => first.localeCompare(second, "pt-BR")),
        } satisfies ManagedCellDetail)
      : null;

  return {
    cell,
    leaders: options.leaders,
    hasError: Boolean(
      cellResult.error || leadershipsResult.error || options.hasError,
    ),
  };
}
