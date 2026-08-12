export type ManualName = {
  key: number;
  name: string;
};

export type GuestItem = {
  key: number;
  name: string;
  isFirstTime: boolean;
};

export type GuestGroup = {
  key: number;
  responsibleName: string;
  guests: GuestItem[];
};

export type EvangelismRecordDraft = {
  key: number;
  primaryLeadershipId: string;
  leadershipIds: string[];
  evangelismOn: string;
  durationText: string;
  comments: string;
  participants: ManualName[];
};

export type NotEvangelizedDraft = Record<string, string>;

export type StoredReportDraft = {
  version: 2;
  savedAt: string;
  meetingOn: string;
  meetingFormat: "in_person" | "online";
  leaderWasPresent: "yes" | "no";
  selectedViceIds: string[];
  noViceWasPresent: boolean;
  members: ManualName[];
  guestGroups: GuestGroup[];
  evangelismRecords: EvangelismRecordDraft[];
  notEvangelized: NotEvangelizedDraft;
  step: 1 | 2;
};

export type LegacyStoredReportDraft = {
  version: 1;
  savedAt: string;
  meetingOn: string;
  meetingFormat: "in_person" | "online";
  leaderWasPresent: "yes" | "no";
  selectedViceIds: string[];
  noViceWasPresent: boolean;
  members: ManualName[];
  guests: Array<{
    key: number;
    name: string;
    responsibleName: string;
    isFirstTime: boolean;
  }>;
  evangelism: Record<
    string,
    {
      didEvangelize: "" | "yes" | "no";
      evangelismOn: string;
      durationText: string;
      comments: string;
      participants: ManualName[];
    }
  >;
  step: 1 | 2;
};
