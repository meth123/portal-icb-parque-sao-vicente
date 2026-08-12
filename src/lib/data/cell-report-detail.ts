import "server-only";

import { cache } from "react";
import { getCurrentUser } from "@/lib/auth/current-user";
import { createClient } from "@/lib/supabase/server";

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type RawVersion = {
  id: string;
  report_id: string;
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

type RawReport = {
  id: string;
  cell_id: string;
  meeting_on: string;
};

type RawCellLeadership = {
  id: string;
  profile_id: string;
  role: "leader" | "vice_leader";
  starts_on: string;
  ends_on: string | null;
};

type RawDirectoryProfile = {
  profile_id: string;
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
    const versionResult = await supabase
      .from("cell_report_versions")
      .select(
        "id, report_id, version_number, meeting_format, leader_was_present, leader_leadership_id, no_vice_leader_was_present, members_count, guests_count, first_time_guests_count, submitted_by, submitted_at, is_current, meeting_on",
      )
      .eq("id", versionId)
      .maybeSingle();
    const version = versionResult.data as RawVersion | null;

    if (versionResult.error || !version) {
      return null;
    }

    const reportResult = await supabase
      .from("cell_reports")
      .select("id, cell_id, meeting_on")
      .eq("id", version.report_id)
      .maybeSingle();
    const report = reportResult.data as RawReport | null;

    if (reportResult.error || !report) {
      return null;
    }

    const [
      cellResult,
      membersResult,
      guestsResult,
      vicePresencesResult,
      evangelismResult,
      cellLeadershipsResult,
      directoryResult,
    ] = await Promise.all([
      supabase.from("cells").select("id, name").eq("id", report.cell_id).maybeSingle(),
      supabase
        .from("cell_report_member_entries")
        .select("position, name")
        .eq("report_version_id", version.id)
        .order("position"),
      supabase
        .from("cell_report_guest_entries")
        .select("position, name, responsible_name, is_first_time")
        .eq("report_version_id", version.id)
        .order("position"),
      supabase
        .from("cell_report_vice_presences")
        .select("cell_leadership_id")
        .eq("report_version_id", version.id),
      supabase
        .from("cell_report_evangelism_entries")
        .select(
          "id, cell_leadership_id, did_evangelize, evangelism_on, duration_text, comments",
        )
        .eq("report_version_id", version.id),
      supabase
        .from("cell_leaderships")
        .select("id, profile_id, role, starts_on, ends_on")
        .eq("cell_id", report.cell_id),
      supabase.rpc("get_accessible_leadership_directory"),
    ]);

    if (
      cellResult.error ||
      !cellResult.data ||
      membersResult.error ||
      guestsResult.error ||
      vicePresencesResult.error ||
      evangelismResult.error ||
      cellLeadershipsResult.error ||
      directoryResult.error
    ) {
      return null;
    }

    const evangelismEntries = (evangelismResult.data ?? []) as RawEvangelismEntry[];
    const evangelismEntryIds = evangelismEntries.map((entry) => entry.id);
    const [manualParticipantsResult, leadershipParticipantsResult] =
      evangelismEntryIds.length > 0
        ? await Promise.all([
            supabase
              .from("cell_report_evangelism_participants")
              .select("evangelism_entry_id, position, name")
              .in("evangelism_entry_id", evangelismEntryIds)
              .order("position"),
            supabase
              .from("cell_report_evangelism_leadership_participants")
              .select("evangelism_entry_id, cell_leadership_id")
              .in("evangelism_entry_id", evangelismEntryIds),
          ])
        : [
            { data: [], error: null },
            { data: [], error: null },
          ];

    if (manualParticipantsResult.error || leadershipParticipantsResult.error) {
      return null;
    }

    const cellLeaderships = (cellLeadershipsResult.data ?? []) as RawCellLeadership[];
    const leadershipById = new Map(
      cellLeaderships.map((leadership) => [leadership.id, leadership]),
    );
    const profileNames = new Map(
      ((directoryResult.data ?? []) as RawDirectoryProfile[]).map((profile) => [
        profile.profile_id,
        profile.full_name,
      ]),
    );

    function getLeadershipName(leadershipId: string) {
      const leadership = leadershipById.get(leadershipId);

      if (!leadership) {
        return "Liderança não identificada";
      }

      return (
        profileNames.get(leadership.profile_id) ??
        (leadership.role === "leader"
          ? "Líder sem nome"
          : "Vice-líder sem nome")
      );
    }

    const manualParticipants = (manualParticipantsResult.data ?? []) as Array<{
      evangelism_entry_id: string;
      position: number;
      name: string;
    }>;
    const leadershipParticipants = (leadershipParticipantsResult.data ?? []) as Array<{
      evangelism_entry_id: string;
      cell_leadership_id: string;
    }>;
    const presentViceLeaderNames = (
      (vicePresencesResult.data ?? []) as Array<{ cell_leadership_id: string }>
    )
      .map((presence) => getLeadershipName(presence.cell_leadership_id))
      .sort((first, second) => first.localeCompare(second, "pt-BR"));
    const presentViceLeadershipIds = (
      (vicePresencesResult.data ?? []) as Array<{ cell_leadership_id: string }>
    ).map((presence) => presence.cell_leadership_id);
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
      reportId: report.id,
      cellId: report.cell_id,
      cellName: cellResult.data.name,
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
      submittedByName: profileNames.get(version.submitted_by) ?? "Usuário autorizado",
      submittedAt: version.submitted_at,
      isCurrent: version.is_current,
      leadership: leadershipAtMeeting,
      members: (membersResult.data ?? []).map((member) => ({
        position: member.position,
        name: member.name,
      })),
      guests: (guestsResult.data ?? []).map((guest) => ({
        position: guest.position,
        name: guest.name,
        responsibleName: guest.responsible_name,
        isFirstTime: guest.is_first_time,
      })),
      evangelismEntries: evangelismEntries.map((entry) => ({
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
