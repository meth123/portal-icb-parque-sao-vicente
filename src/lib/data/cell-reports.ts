import "server-only";

import { cache } from "react";
import { getCurrentUser } from "@/lib/auth/current-user";
import { createClient } from "@/lib/supabase/server";

export type CellReportLeadershipOption = {
  leadershipId: string;
  name: string;
  role: "leader" | "vice_leader";
};

export type CellReportFormContext = {
  cellId: string;
  cellName: string;
  currentUserRole: "leader" | "vice_leader";
  leader: CellReportLeadershipOption;
  viceLeaders: CellReportLeadershipOption[];
  leadership: CellReportLeadershipOption[];
};

type RawCurrentLeadership = {
  cell_id: string;
  role: "leader" | "vice_leader";
};

type RawCellLeadership = {
  id: string;
  profile_id: string;
  role: "leader" | "vice_leader";
};

type RawDirectoryProfile = {
  profile_id: string;
  full_name: string | null;
};

export const getCellReportFormContext = cache(
  async (): Promise<CellReportFormContext | null> => {
    const user = await getCurrentUser();

    if (!user?.isActive) {
      return null;
    }

    const supabase = await createClient();
    const leadershipResult = await supabase
      .from("cell_leaderships")
      .select("cell_id, role")
      .eq("profile_id", user.id)
      .is("ends_on", null)
      .maybeSingle();
    const leadership = leadershipResult.data as RawCurrentLeadership | null;

    if (leadershipResult.error || !leadership) {
      return null;
    }

    const { data: canSubmit, error: canSubmitError } = await supabase.rpc(
      "can_submit_cell_report",
      { target_cell_id: leadership.cell_id },
    );

    if (canSubmitError || canSubmit !== true) {
      return null;
    }

    const [cellResult, cellLeadershipsResult, directoryResult] =
      await Promise.all([
        supabase
          .from("cells")
          .select("id, name")
          .eq("id", leadership.cell_id)
          .eq("is_active", true)
          .maybeSingle(),
        supabase
          .from("cell_leaderships")
          .select("id, profile_id, role")
          .eq("cell_id", leadership.cell_id)
          .is("ends_on", null)
          .order("starts_on"),
        supabase.rpc("get_accessible_leadership_directory"),
      ]);

    if (
      cellResult.error ||
      !cellResult.data ||
      cellLeadershipsResult.error ||
      directoryResult.error
    ) {
      return null;
    }

    const profileNames = new Map(
      ((directoryResult.data ?? []) as RawDirectoryProfile[]).map((profile) => [
        profile.profile_id,
        profile.full_name,
      ]),
    );
    const leadershipOptions = (
      (cellLeadershipsResult.data ?? []) as RawCellLeadership[]
    )
      .map((cellLeadership) => ({
        leadershipId: cellLeadership.id,
        name:
          profileNames.get(cellLeadership.profile_id) ??
          (cellLeadership.role === "leader"
            ? "Líder sem nome"
            : "Vice-líder sem nome"),
        role: cellLeadership.role,
      }))
      .sort((first, second) => {
        if (first.role !== second.role) {
          return first.role === "leader" ? -1 : 1;
        }

        return first.name.localeCompare(second.name, "pt-BR");
      });
    const leader = leadershipOptions.find((item) => item.role === "leader");

    if (!leader) {
      return null;
    }

    const viceLeaders = leadershipOptions.filter(
      (item) => item.role === "vice_leader",
    );

    return {
      cellId: cellResult.data.id,
      cellName: cellResult.data.name,
      currentUserRole: leadership.role,
      leader,
      viceLeaders,
      leadership: leadershipOptions,
    };
  },
);
