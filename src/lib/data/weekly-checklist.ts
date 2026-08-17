import "server-only";

import { getCurrentUser } from "@/lib/auth/current-user";
import {
  formatWeeklyChecklistRange,
  getWeeklyChecklistPeriod,
  type WeeklyChecklistPeriod,
} from "@/lib/weekly-checklist";
import { createClient } from "@/lib/supabase/server";

const avatarBucket = "profile-avatars";

type RawWeeklyChecklistRow = {
  profile_id: string;
  full_name: string | null;
  avatar_path: string | null;
  cell_id: string;
  cell_name: string;
  leadership_role: "leader" | "vice_leader";
  network_id: string;
  network_name: string;
  prayed_in_group: boolean | null;
  fasted_for_cell: boolean | null;
  responded_at: string | null;
  evangelism_status: "yes" | "no" | "pending";
};

export type WeeklyChecklistPerson = {
  profileId: string;
  fullName: string;
  avatarUrl: string | null;
  cellId: string;
  cellName: string;
  leadershipRole: "leader" | "vice_leader";
  networkId: string;
  networkName: string;
  prayedInGroup: boolean | null;
  fastedForCell: boolean | null;
  respondedAt: string | null;
  evangelismStatus: "yes" | "no" | "pending";
};

export type WeeklyChecklistData = {
  period: WeeklyChecklistPeriod;
  periodLabel: string;
  people: WeeklyChecklistPerson[];
  currentPerson: WeeklyChecklistPerson | null;
  canRespond: boolean;
  hasError: boolean;
};

export async function getWeeklyChecklistData(options?: {
  includeAvatars?: boolean;
}): Promise<WeeklyChecklistData | null> {
  const user = await getCurrentUser();

  if (!user?.isActive) return null;

  const period = getWeeklyChecklistPeriod();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc(
    "get_weekly_leadership_checklist",
    { target_week_starts_on: period.weekStartsOn },
  );

  if (error) {
    return {
      period,
      periodLabel: formatWeeklyChecklistRange(period),
      people: [],
      currentPerson: null,
      canRespond: false,
      hasError: true,
    };
  }

  const rows = (data ?? []) as RawWeeklyChecklistRow[];
  const avatarUrls = new Map<string, string>();

  if (options?.includeAvatars !== false) {
    await Promise.all(
      rows.map(async (row) => {
        const expectedPath = `${row.profile_id}/avatar`;

        if (row.avatar_path !== expectedPath) return;

        const { data: signedAvatar } = await supabase.storage
          .from(avatarBucket)
          .createSignedUrl(expectedPath, 300);

        if (signedAvatar?.signedUrl) {
          avatarUrls.set(row.profile_id, signedAvatar.signedUrl);
        }
      }),
    );
  }

  const people = rows.map(
    (row): WeeklyChecklistPerson => ({
      profileId: row.profile_id,
      fullName: row.full_name ?? "Nome não informado",
      avatarUrl: avatarUrls.get(row.profile_id) ?? null,
      cellId: row.cell_id,
      cellName: row.cell_name,
      leadershipRole: row.leadership_role,
      networkId: row.network_id,
      networkName: row.network_name,
      prayedInGroup: row.prayed_in_group,
      fastedForCell: row.fasted_for_cell,
      respondedAt: row.responded_at,
      evangelismStatus: row.evangelism_status,
    }),
  );
  const currentPerson =
    people.find((person) => person.profileId === user.id) ?? null;

  return {
    period,
    periodLabel: formatWeeklyChecklistRange(period),
    people,
    currentPerson,
    canRespond:
      period.isOpen && user.globalRole === "user" && currentPerson !== null,
    hasError: false,
  };
}
