export type CellDashboardMetricSource = {
  membersCount: number;
  guestsCount: number;
  firstTimeGuestsCount: number;
};

export function calculateCellDashboardMetrics(
  reports: CellDashboardMetricSource[],
) {
  const totals = reports.reduce(
    (result, report) => ({
      members: result.members + report.membersCount,
      guests: result.guests + report.guestsCount,
      firstTimeGuests:
        result.firstTimeGuests + report.firstTimeGuestsCount,
      attendance:
        result.attendance + report.membersCount + report.guestsCount,
    }),
    { members: 0, guests: 0, firstTimeGuests: 0, attendance: 0 },
  );

  return {
    reports: reports.length,
    members: totals.members,
    guests: totals.guests,
    firstTimeGuests: totals.firstTimeGuests,
    averageAttendance:
      reports.length === 0
        ? 0
        : Math.round((totals.attendance / reports.length) * 10) / 10,
  };
}

export function calculatePastoralDashboardMetrics(
  reports: CellDashboardMetricSource[],
) {
  const metrics = calculateCellDashboardMetrics(reports);

  return {
    ...metrics,
    averageMembers:
      metrics.reports === 0
        ? 0
        : Math.round((metrics.members / metrics.reports) * 10) / 10,
    averageGuests:
      metrics.reports === 0
        ? 0
        : Math.round((metrics.guests / metrics.reports) * 10) / 10,
  };
}

export type PastoralCellSummarySource = {
  id: string;
  name: string;
  networkName: string;
  cellTypeName: string;
};

export type PastoralCellReportSource = CellDashboardMetricSource & {
  cellId: string;
};

export function calculatePastoralCellSummaries(
  cells: PastoralCellSummarySource[],
  reports: PastoralCellReportSource[],
) {
  return cells.map((cell) => ({
    ...cell,
    metrics: calculatePastoralDashboardMetrics(
      reports.filter((report) => report.cellId === cell.id),
    ),
  }));
}

export type PastoralMonthlyReport = CellDashboardMetricSource & {
  meetingOn: string;
};

export type PastoralHistoryMonths = 3 | 6 | 12;

export function normalizePastoralHistoryMonths(
  value: string | undefined,
): PastoralHistoryMonths {
  if (value === "3" || value === "12") {
    return Number(value) as PastoralHistoryMonths;
  }

  return 6;
}

export function calculatePastoralFirstTimeHistory(
  months: string[],
  reports: PastoralMonthlyReport[],
) {
  return months.map((month) => ({
    month,
    firstTimeGuests: reports
      .filter((report) => report.meetingOn.slice(0, 7) === month)
      .reduce(
        (total, report) => total + report.firstTimeGuestsCount,
        0,
      ),
  }));
}

export type EvangelismHistoryVersion = {
  versionId: string;
  meetingOn: string;
};

export type EvangelismHistoryEntry = {
  id: string;
  versionId: string;
};

export type EvangelismHistoryParticipant = {
  entryId: string;
  leadershipId: string;
};

export function calculateEvangelismHistory(
  versions: EvangelismHistoryVersion[],
  entries: EvangelismHistoryEntry[],
  participants: EvangelismHistoryParticipant[],
) {
  const leadershipByEntryId = new Map<string, string[]>();

  for (const participant of participants) {
    const current = leadershipByEntryId.get(participant.entryId) ?? [];
    current.push(participant.leadershipId);
    leadershipByEntryId.set(participant.entryId, current);
  }

  return versions
    .map((version) => {
      const versionEntries = entries.filter(
        (entry) => entry.versionId === version.versionId,
      );
      const leadershipIds = new Set(
        versionEntries.flatMap(
          (entry) => leadershipByEntryId.get(entry.id) ?? [],
        ),
      );

      return {
        versionId: version.versionId,
        meetingOn: version.meetingOn,
        records: versionEntries.length,
        leadershipParticipants: leadershipIds.size,
      };
    })
    .sort((first, second) => second.meetingOn.localeCompare(first.meetingOn));
}

export type WeeklyLeadershipStatus = {
  didEvangelize: boolean;
  leadershipId: string;
};

export type PastoralEvangelismHistoryEntry = WeeklyLeadershipStatus & {
  id: string;
  meetingOn: string;
};

export type PastoralEvangelismHistoryParticipant = {
  entryId: string;
  leadershipId: string;
};

export function calculateMonthlyEvangelismParticipation(
  statuses: WeeklyLeadershipStatus[],
  positiveParticipantIds: string[],
) {
  const accompaniedLeadershipIds = new Set([
    ...statuses.map((status) => status.leadershipId),
    ...positiveParticipantIds,
  ]);
  const evangelizedLeadershipIds = new Set(positiveParticipantIds);
  const accompanied = accompaniedLeadershipIds.size;
  const evangelized = evangelizedLeadershipIds.size;

  return {
    accompanied,
    evangelized,
    percentage:
      accompanied === 0 ? null : Math.round((evangelized / accompanied) * 100),
  };
}

export function calculatePastoralEvangelismHistory(
  months: string[],
  entries: PastoralEvangelismHistoryEntry[],
  participants: PastoralEvangelismHistoryParticipant[],
) {
  return months.map((month) => {
    const monthlyEntries = entries.filter(
      (entry) => entry.meetingOn.slice(0, 7) === month,
    );
    const monthlyEntryIds = new Set(monthlyEntries.map((entry) => entry.id));
    const monthlyParticipants = participants.filter((participant) =>
      monthlyEntryIds.has(participant.entryId),
    );

    return {
      month,
      ...calculateMonthlyEvangelismParticipation(
        monthlyEntries.map((entry) => ({
          didEvangelize: entry.didEvangelize,
          leadershipId: entry.leadershipId,
        })),
        monthlyParticipants.map((participant) => participant.leadershipId),
      ),
    };
  });
}

export function calculatePersonalEvangelismSummary(
  leadershipId: string,
  entries: EvangelismHistoryEntry[],
  participants: EvangelismHistoryParticipant[],
) {
  const participatedEntryIds = new Set(
    participants
      .filter((participant) => participant.leadershipId === leadershipId)
      .map((participant) => participant.entryId),
  );
  const participatedEntries = entries.filter((entry) =>
    participatedEntryIds.has(entry.id),
  );

  return {
    records: participatedEntries.length,
    reports: new Set(participatedEntries.map((entry) => entry.versionId)).size,
    didEvangelize: participatedEntries.length > 0,
  };
}
