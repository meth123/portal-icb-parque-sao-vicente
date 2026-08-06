import "server-only";

import { getCurrentUser } from "@/lib/auth/current-user";
import { createClient } from "@/lib/supabase/server";

export type NetworkOverview = {
  id: string;
  name: string;
  code: string;
  isActive: boolean;
};

export type CellTypeOverview = {
  id: string;
  networkId: string;
  name: string;
  isActive: boolean;
};

export type CityOverview = {
  id: string;
  name: string;
  stateCode: string;
  isActive: boolean;
};

export type NeighborhoodOverview = {
  id: string;
  cityId: string;
  name: string;
  isActive: boolean;
};

export type CellOverview = {
  id: string;
  name: string;
  isActive: boolean;
  classification: string;
  schedule: string;
  location: string;
  leader: string;
};

export type CellLeadershipOverview = {
  profileId: string;
  name: string;
  role: "Líder" | "Vice-líder";
  startsOn: string;
};

export type CellDetails = CellOverview & {
  startedOn: string | null;
  leaderships: CellLeadershipOverview[];
  hasError: boolean;
};

type RawCell = {
  id: string;
  name: string;
  is_active: boolean;
};

type RawCurrentClassification = {
  cell_id: string;
  cell_type_id: string;
};

type RawCurrentSchedule = {
  cell_id: string;
  weekday: number;
  meeting_time: string;
};

type RawCurrentLocation = {
  cell_id: string;
  neighborhood_id: string;
};

type RawCurrentLeader = {
  cell_id: string;
  profile_id: string;
};

type RawProfileName = {
  profile_id: string;
  full_name: string | null;
};

const weekdayNames = [
  "domingo",
  "segunda-feira",
  "terça-feira",
  "quarta-feira",
  "quinta-feira",
  "sexta-feira",
  "sábado",
];

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function formatDate(date: string) {
  const [year, month, day] = date.split("-");
  return `${day}/${month}/${year}`;
}

export async function getOrganizationOverview() {
  const user = await getCurrentUser();

  if (!user?.isActive) {
    return null;
  }

  const supabase = await createClient();
  const [
    networksResult,
    cellTypesResult,
    citiesResult,
    neighborhoodsResult,
    cellsResult,
    classificationsResult,
    schedulesResult,
    locationsResult,
    leadersResult,
  ] = await Promise.all([
    supabase.from("networks").select("id, name, code, is_active").order("name"),
    supabase
      .from("cell_types")
      .select("id, network_id, name, is_active")
      .order("name"),
    supabase.from("cities").select("id, name, state_code, is_active").order("name"),
    supabase
      .from("neighborhoods")
      .select("id, city_id, name, is_active")
      .order("name"),
    supabase.from("cells").select("id, name, is_active").order("name"),
    supabase
      .from("cell_classifications")
      .select("cell_id, cell_type_id")
      .is("ends_on", null),
    supabase
      .from("cell_schedules")
      .select("cell_id, weekday, meeting_time")
      .is("ends_on", null),
    supabase
      .from("cell_locations")
      .select("cell_id, neighborhood_id")
      .is("ends_on", null),
    supabase
      .from("cell_leaderships")
      .select("cell_id, profile_id")
      .eq("role", "leader")
      .is("ends_on", null),
  ]);

  const networks = (networksResult.data ?? []).map((network) => ({
    id: network.id,
    name: network.name,
    code: network.code,
    isActive: network.is_active,
  })) satisfies NetworkOverview[];
  const cellTypes = (cellTypesResult.data ?? []).map((cellType) => ({
    id: cellType.id,
    networkId: cellType.network_id,
    name: cellType.name,
    isActive: cellType.is_active,
  })) satisfies CellTypeOverview[];
  const cities = (citiesResult.data ?? []).map((city) => ({
    id: city.id,
    name: city.name,
    stateCode: city.state_code,
    isActive: city.is_active,
  })) satisfies CityOverview[];
  const neighborhoods = (neighborhoodsResult.data ?? []).map(
    (neighborhood) => ({
      id: neighborhood.id,
      cityId: neighborhood.city_id,
      name: neighborhood.name,
      isActive: neighborhood.is_active,
    }),
  ) satisfies NeighborhoodOverview[];

  const currentLeaders = (leadersResult.data ?? []) as RawCurrentLeader[];
  const profilesResult =
    currentLeaders.length > 0
      ? await supabase.rpc("get_accessible_leadership_directory")
      : { data: [] as RawProfileName[], error: null };

  const profileNames = new Map(
    ((profilesResult.data ?? []) as RawProfileName[]).map((profile) => [
      profile.profile_id,
      profile.full_name,
    ]),
  );
  const cellTypesById = new Map(cellTypes.map((cellType) => [cellType.id, cellType]));
  const networksById = new Map(networks.map((network) => [network.id, network]));
  const neighborhoodsById = new Map(
    neighborhoods.map((neighborhood) => [neighborhood.id, neighborhood]),
  );
  const citiesById = new Map(cities.map((city) => [city.id, city]));
  const classificationsByCell = new Map(
    ((classificationsResult.data ?? []) as RawCurrentClassification[]).map(
      (classification) => [classification.cell_id, classification],
    ),
  );
  const schedulesByCell = new Map(
    ((schedulesResult.data ?? []) as RawCurrentSchedule[]).map((schedule) => [
      schedule.cell_id,
      schedule,
    ]),
  );
  const locationsByCell = new Map(
    ((locationsResult.data ?? []) as RawCurrentLocation[]).map((location) => [
      location.cell_id,
      location,
    ]),
  );
  const leadersByCell = new Map(
    currentLeaders.map((leadership) => [leadership.cell_id, leadership]),
  );

  const cells = ((cellsResult.data ?? []) as RawCell[]).map((cell) => {
    const classification = classificationsByCell.get(cell.id);
    const cellType = classification
      ? cellTypesById.get(classification.cell_type_id)
      : undefined;
    const network = cellType ? networksById.get(cellType.networkId) : undefined;
    const schedule = schedulesByCell.get(cell.id);
    const currentLocation = locationsByCell.get(cell.id);
    const neighborhood = currentLocation
      ? neighborhoodsById.get(currentLocation.neighborhood_id)
      : undefined;
    const city = neighborhood ? citiesById.get(neighborhood.cityId) : undefined;
    const leadership = leadersByCell.get(cell.id);
    const visibleLeaderName = leadership
      ? profileNames.get(leadership.profile_id)
      : null;
    const currentUserFallback =
      leadership?.profile_id === user.id
        ? (user.fullName ?? user.email ?? "Conta atual")
        : "Nome protegido";

    return {
      id: cell.id,
      name: cell.name,
      isActive: cell.is_active,
      classification:
        network && cellType
          ? `${network.code} — ${cellType.name}`
          : "Não informada",
      schedule: schedule
        ? `${weekdayNames[schedule.weekday] ?? "dia inválido"}, ${schedule.meeting_time.slice(0, 5)}`
        : "Não informado",
      location:
        city && neighborhood
          ? `${neighborhood.name}, ${city.name} — ${city.stateCode}`
          : "Não informada",
      leader: leadership
        ? (visibleLeaderName ?? currentUserFallback)
        : "Não informado",
    } satisfies CellOverview;
  });

  const hasError = Boolean(
    networksResult.error ||
      cellTypesResult.error ||
      citiesResult.error ||
      neighborhoodsResult.error ||
      cellsResult.error ||
      classificationsResult.error ||
      schedulesResult.error ||
      locationsResult.error ||
      leadersResult.error ||
      profilesResult.error,
  );

  return { networks, cellTypes, cities, neighborhoods, cells, hasError };
}

type RawClassificationDetails = {
  starts_on: string;
  cell_types: {
    name: string;
    networks: { code: string } | null;
  } | null;
};

type RawLocationDetails = {
  starts_on: string;
  neighborhoods: {
    name: string;
    cities: { name: string; state_code: string } | null;
  } | null;
};

type RawLeadershipDetails = {
  profile_id: string;
  role: "leader" | "vice_leader";
  starts_on: string;
};

export async function getCellDetails(cellId: string): Promise<CellDetails | null> {
  if (!uuidPattern.test(cellId)) {
    return null;
  }

  const user = await getCurrentUser();

  if (!user?.isActive) {
    return null;
  }

  const supabase = await createClient();
  const cellResult = await supabase
    .from("cells")
    .select("id, name, is_active, started_on")
    .eq("id", cellId)
    .maybeSingle();

  if (cellResult.error) {
    return {
      id: cellId,
      name: "Célula",
      isActive: false,
      startedOn: null,
      classification: "Não informada",
      schedule: "Não informado",
      location: "Não informada",
      leader: "Não informado",
      leaderships: [],
      hasError: true,
    };
  }

  if (!cellResult.data) {
    return null;
  }

  const [
    classificationResult,
    scheduleResult,
    locationResult,
    leadershipsResult,
    directoryResult,
  ] = await Promise.all([
    supabase
      .from("cell_classifications")
      .select("starts_on, cell_types(name, networks(code))")
      .eq("cell_id", cellId)
      .is("ends_on", null)
      .maybeSingle(),
    supabase
      .from("cell_schedules")
      .select("weekday, meeting_time, starts_on")
      .eq("cell_id", cellId)
      .is("ends_on", null)
      .maybeSingle(),
    supabase
      .from("cell_locations")
      .select("starts_on, neighborhoods(name, cities(name, state_code))")
      .eq("cell_id", cellId)
      .is("ends_on", null)
      .maybeSingle(),
    supabase
      .from("cell_leaderships")
      .select("profile_id, role, starts_on")
      .eq("cell_id", cellId)
      .is("ends_on", null)
      .order("role")
      .order("starts_on"),
    supabase.rpc("get_accessible_leadership_directory"),
  ]);

  const classification = classificationResult.data as
    | RawClassificationDetails
    | null;
  const schedule = scheduleResult.data as RawCurrentSchedule | null;
  const location = locationResult.data as RawLocationDetails | null;
  const rawLeaderships = (leadershipsResult.data ?? []) as RawLeadershipDetails[];
  const profileNames = new Map(
    ((directoryResult.data ?? []) as RawProfileName[]).map((profile) => [
      profile.profile_id,
      profile.full_name,
    ]),
  );
  const cellType = classification?.cell_types;
  const neighborhood = location?.neighborhoods;

  const leaderships = rawLeaderships.map((leadership) => {
    const visibleName = profileNames.get(leadership.profile_id);
    const currentUserFallback =
      leadership.profile_id === user.id
        ? (user.fullName ?? user.email ?? "Conta atual")
        : "Nome protegido";

    return {
      profileId: leadership.profile_id,
      name: visibleName ?? currentUserFallback,
      role: leadership.role === "leader" ? "Líder" : "Vice-líder",
      startsOn: formatDate(leadership.starts_on),
    } satisfies CellLeadershipOverview;
  });
  const leader = leaderships.find((leadership) => leadership.role === "Líder");
  const hasError = Boolean(
    classificationResult.error ||
      scheduleResult.error ||
      locationResult.error ||
      leadershipsResult.error ||
      directoryResult.error,
  );

  return {
    id: cellResult.data.id,
    name: cellResult.data.name,
    isActive: cellResult.data.is_active,
    startedOn: cellResult.data.started_on
      ? formatDate(cellResult.data.started_on)
      : null,
    classification:
      cellType?.networks && cellType
        ? `${cellType.networks.code} — ${cellType.name}`
        : "Não informada",
    schedule: schedule
      ? `${weekdayNames[schedule.weekday] ?? "dia inválido"}, ${schedule.meeting_time.slice(0, 5)}`
      : "Não informado",
    location:
      neighborhood?.cities && neighborhood
        ? `${neighborhood.name}, ${neighborhood.cities.name} — ${neighborhood.cities.state_code}`
        : "Não informada",
    leader: leader?.name ?? "Não informado",
    leaderships,
    hasError,
  };
}
