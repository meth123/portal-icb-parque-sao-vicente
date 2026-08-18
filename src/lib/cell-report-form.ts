export type LeadershipLinkedRecord = {
  leadershipIds: readonly string[];
};

export type LeadershipEvangelismDraft = LeadershipLinkedRecord & {
  primaryLeadershipId: string;
};

export type GuestGroupInput = {
  responsibleName: string;
  guests: ReadonlyArray<{
    key: number;
    name: string;
    isFirstTime: boolean;
  }>;
};

export type CellReportInitialData = {
  meetingOn: string;
  meetingFormat: "in_person" | "online";
  leaderWasPresent: "yes" | "no";
  selectedViceIds: string[];
  noViceWasPresent: boolean;
  members: Array<{ name: string }>;
  guestGroups: Array<{
    responsibleName: string;
    guests: Array<{ name: string; isFirstTime: boolean }>;
  }>;
  evangelismRecords: Array<{
    primaryLeadershipId: string;
    leadershipIds: string[];
    evangelismOn: string;
    durationText: string;
    comments: string;
    participants: Array<{ name: string }>;
  }>;
  notEvangelized: Record<string, string>;
};

export function getLeadershipRecords<T extends LeadershipLinkedRecord>(
  records: readonly T[],
  leadershipId: string,
) {
  return records.filter((record) =>
    record.leadershipIds.includes(leadershipId),
  );
}

export function getFirstPendingLeadershipId(
  leadershipIds: readonly string[],
  records: readonly LeadershipLinkedRecord[],
  notEvangelized: Readonly<Record<string, string>>,
) {
  return leadershipIds.find((leadershipId) => {
    const participated = records.some((record) =>
      record.leadershipIds.includes(leadershipId),
    );
    const wasMarkedAsNotEvangelized = Object.prototype.hasOwnProperty.call(
      notEvangelized,
      leadershipId,
    );
    return !participated && !wasMarkedAsNotEvangelized;
  });
}

export function removeIncompleteLeadershipDrafts<
  T extends LeadershipEvangelismDraft,
>(
  records: readonly T[],
  leadershipId: string,
  isIncomplete: (record: T) => boolean,
) {
  return records.flatMap((record) => {
    if (!isIncomplete(record)) {
      return [record];
    }

    if (record.primaryLeadershipId === leadershipId) {
      return [];
    }

    if (!record.leadershipIds.includes(leadershipId)) {
      return [record];
    }

    return [
      {
        ...record,
        leadershipIds: record.leadershipIds.filter(
          (id) => id !== leadershipId,
        ),
      },
    ];
  });
}

export function flattenGuestGroups(groups: readonly GuestGroupInput[]) {
  return groups.flatMap((group) =>
    group.guests.map((guest) => ({
      ...guest,
      responsibleName: group.responsibleName,
    })),
  );
}

export function parsePastedNames(value: string) {
  return value
    .split(/\r?\n/)
    .map((name) => name.trim())
    .filter((name) => name.length > 0);
}

export function filterLettersAndSpaces(value: string) {
  return value.replace(/[^\p{L} ]/gu, "");
}

export function filterNameListInput(value: string) {
  return value.replace(/[^\p{L}\r\n ]/gu, "");
}

export function normalizeLettersAndSpacesName(value: string) {
  const normalized = value.trim().replace(/\s+/g, " ");

  return normalized.length > 0 && /^[\p{L}]+(?: [\p{L}]+)*$/u.test(normalized)
    ? normalized
    : null;
}
