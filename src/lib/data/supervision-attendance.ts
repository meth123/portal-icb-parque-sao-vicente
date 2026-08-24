import "server-only";

import {
  canManageSupervisionAttendance,
  getCurrentUser,
} from "@/lib/auth/current-user";
import { createClient } from "@/lib/supabase/server";

export type SupervisionAttendanceNetwork = {
  id: string;
  name: string;
  code: "RJ" | "H.M";
};

export type SupervisionAttendanceSessionSummary = {
  id: string;
  sessionOn: string;
  status: "draft" | "finalized";
  networkId: string;
  networkName: string;
  networkCode: "RJ" | "H.M";
  total: number;
  present: number;
  absent: number;
  unmarked: number;
  percentage: number;
};

export type SupervisionAttendancePerson = {
  profileId: string;
  fullName: string;
  present: boolean | null;
  cellName: string | null;
  leadershipRole: "leader" | "vice_leader" | null;
};

export type SupervisionAttendanceSession = SupervisionAttendanceSessionSummary & {
  createdAt: string;
  finalizedAt: string | null;
  responsibleName: string;
  finalizedByName: string | null;
  people: SupervisionAttendancePerson[];
};

type SupervisionAttendanceOverview = {
  networks: SupervisionAttendanceNetwork[];
  sessions: SupervisionAttendanceSessionSummary[];
};

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function getSupervisionAttendanceOverview() {
  const user = await getCurrentUser();
  if (!user || !canManageSupervisionAttendance(user)) return null;

  const supabase = await createClient();
  const { data, error } = await supabase.rpc(
    "get_supervision_attendance_overview",
  );

  return {
    overview: error ? null : (data as SupervisionAttendanceOverview | null),
    hasError: Boolean(error || !data),
  };
}

export async function getSupervisionAttendanceSession(sessionId: string) {
  const user = await getCurrentUser();
  if (!user || !canManageSupervisionAttendance(user)) return null;
  if (!uuidPattern.test(sessionId)) return { session: null, hasError: false };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc(
    "get_supervision_attendance_session",
    { target_session_id: sessionId },
  );

  return {
    session: error ? null : (data as SupervisionAttendanceSession | null),
    hasError: Boolean(error),
  };
}
