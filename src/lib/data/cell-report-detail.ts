import "server-only";

import { cache } from "react";
import { getCurrentUser } from "@/lib/auth/current-user";
import { createClient } from "@/lib/supabase/server";

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type RawVersion = {
  id: string;
  report_id: string;
  cell_id: string;
  cell_name: string;
  version_number: number;
  meeting_format: "in_person" | "online";
  leader_was_present: boolean;
  leader_leadership_id: string;
  no_vice_leader_was_present: boolean;
  members_count: number;
  guests_count: number;
  first_time_guests_count: number;
  submitted_by: string;
  submitted_at: string;
  is_current: boolean;
  meeting_on: string;
};

type RawCellLeadership = {
  id: string;
  profile_id: string;
  role: "leader" | "vice_leader";
  starts_on: string;
  ends_on: string | null;
  full_name: string | null;
};

type RawEvangelismEntry = {
  id: string;
  cell_leadership_id: string;
  did_evangelize: boolean;
  evangelism_on: string | null;
  duration_text: string | null;
  comments: string;
};

type RawCellReportDetailBundle = {
  version: RawVersion;
  leadership: RawCellLeadership[];
  submittedByName: string | null;
  members: Array<{ position: number; name: string }>;
  guests: Array<{
    position: number;
    name: string;
    responsible_name: string;
    is_first_time: boolean;
  }>;
  vicePresences: Array<{ cell_leadership_id: string }>;
  evangelismEntries: RawEvangelismEntry[];
  manualParticipants: Array<{
    evangelism_entry_id: string;
    position: number;
    name: string;
  }>;
  leadershipParticipants: Array<{
    evangelism_entry_id: string;
    cell_leadership_id: string;
  }>;
};

export type CellReportVersionDetail = {
  id: string;
  reportId: string;
  cellId: string;
  cellName: string;
  meetingOn: string;
  versionNumber: number;
  meetingFormat: "in_person" | "online";
  leaderWasPresent: boolean;
  leaderLeadershipId: string;
  leaderName: string;
  noViceLeaderWasPresent: boolean;
  presentViceLeadershipIds: string[];
  presentViceLeaderNames: string[];
  membersCount: number;
  guestsCount: number;
  firstTimeGuestsCount: number;
  submittedByName: string;
  submittedAt: string;
  isCurrent: boolean;
  leadership: Array<{
    leadershipId: string;
    name: string;
    role: "leader" | "vice_leader";
  }>;
  members: Array<{ position: number; name: string }>;
  guests: Array<{
    position: number;
    name: string;
    responsibleName: string;
    isFirstTime: boolean;
  }>;
  evangelismEntries: Array<{
    id: string;
    registeredByLeadershipId: string;
    registeredByName: string;
    didEvangelize: boolean;
    leadershipIds: string[];
    leadershipNames: string[];
    evangelismOn: string | null;
    durationText: string | null;
    comments: string;
    participantNames: string[];
  }>;
};

export const getCellReportVersionDetail = cache(
  async (versionId: string): Promise<CellReportVersionDetail | null> => {
    if (!uuidPattern.test(versionId)) {
      return null;
    }

    const user = await getCurrentUser();

    if (!user?.isActive) {
      return null;
    }

    const supabase = await createClient();
    const { data, error } = await supabase.rpc(
      "get_cell_report_detail_bundle",
      { target_version_id: versionId },
    );
    const bundle = data as RawCellReportDetailBundle | null;

    if (error || !bundle?.version) {
      return null;
    }

    const version = bundle.version;
    const cellLeaderships = bundle.leadership;
    const leadershipById = new Map(
      cellLeaderships.map((leadership) => [leadership.id, leadership]),
    );

    function getLeadershipName(leadershipId: string) {
      const leadership = leadershipById.get(leadershipId);

      if (!leadership) {
        return "Liderança não identificada";
      }

      return (
        leadership.full_name ??
        (leadership.role === "leader"
          ? "Líder sem nome"
          : "Vice-líder sem nome")
      );
    }

    const manualParticipants = bundle.manualParticipants;
    const leadershipParticipants = bundle.leadershipParticipants;
    const presentViceLeaderNames = bundle.vicePresences
      .map((presence) => getLeadershipName(presence.cell_leadership_id))
      .sort((first, second) => first.localeCompare(second, "pt-BR"));
    const presentViceLeadershipIds = bundle.vicePresences.map(
      (presence) => presence.cell_leadership_id,
    );
    const leadershipAtMeeting = cellLeaderships
      .filter(
        (leadership) =>
          leadership.starts_on <= version.meeting_on &&
          (!leadership.ends_on || leadership.ends_on > version.meeting_on),
      )
      .map((leadership) => ({
        leadershipId: leadership.id,
        name: getLeadershipName(leadership.id),
        role: leadership.role,
      }))
      .sort((first, second) => {
        if (first.role !== second.role) {
          return first.role === "leader" ? -1 : 1;
        }

        return first.name.localeCompare(second.name, "pt-BR");
      });

    return {
      id: version.id,
      reportId: version.report_id,
      cellId: version.cell_id,
      cellName: version.cell_name,
      meetingOn: version.meeting_on,
      versionNumber: version.version_number,
      meetingFormat: version.meeting_format,
      leaderWasPresent: version.leader_was_present,
      leaderLeadershipId: version.leader_leadership_id,
      leaderName: getLeadershipName(version.leader_leadership_id),
      noViceLeaderWasPresent: version.no_vice_leader_was_present,
      presentViceLeadershipIds,
      presentViceLeaderNames,
      membersCount: version.members_count,
      guestsCount: version.guests_count,
      firstTimeGuestsCount: version.first_time_guests_count,
      submittedByName: bundle.submittedByName ?? "Usuário autorizado",
      submittedAt: version.submitted_at,
      isCurrent: version.is_current,
      leadership: leadershipAtMeeting,
      members: bundle.members.map((member) => ({
        position: member.position,
        name: member.name,
      })),
      guests: bundle.guests.map((guest) => ({
        position: guest.position,
        name: guest.name,
        responsibleName: guest.responsible_name,
        isFirstTime: guest.is_first_time,
      })),
      evangelismEntries: bundle.evangelismEntries.map((entry) => ({
        id: entry.id,
        registeredByLeadershipId: entry.cell_leadership_id,
        registeredByName: getLeadershipName(entry.cell_leadership_id),
        didEvangelize: entry.did_evangelize,
        leadershipIds: leadershipParticipants
          .filter((participant) => participant.evangelism_entry_id === entry.id)
          .map((participant) => participant.cell_leadership_id),
        leadershipNames: leadershipParticipants
          .filter((participant) => participant.evangelism_entry_id === entry.id)
          .map((participant) =>
            getLeadershipName(participant.cell_leadership_id),
          ),
        evangelismOn: entry.evangelism_on,
        durationText: entry.duration_text,
        comments: entry.comments,
        participantNames: manualParticipants
          .filter((participant) => participant.evangelism_entry_id === entry.id)
          .sort((first, second) => first.position - second.position)
          .map((participant) => participant.name),
      })),
    };
  },
);
