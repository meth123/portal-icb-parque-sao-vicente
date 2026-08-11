"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import {
  flattenGuestGroups,
  getFirstPendingLeadershipId,
  getLeadershipRecords,
  parsePastedNames,
  removeIncompleteLeadershipDrafts,
} from "@/lib/cell-report-form";
import type { CellReportInitialData } from "@/lib/cell-report-form";
import type { CellReportLeadershipOption } from "@/lib/data/cell-reports";
import { submitCellReport, type SubmitCellReportState } from "./actions";

const initialState: SubmitCellReportState = { message: "" };

type ManualName = {
  key: number;
  name: string;
};

type GuestItem = {
  key: number;
  name: string;
  isFirstTime: boolean;
};

type GuestGroup = {
  key: number;
  responsibleName: string;
  guests: GuestItem[];
};

type EvangelismRecordDraft = {
  key: number;
  primaryLeadershipId: string;
  leadershipIds: string[];
  evangelismOn: string;
  durationText: string;
  comments: string;
  participants: ManualName[];
};

type NotEvangelizedDraft = Record<string, string>;

type ReportFormProps = {
  cellId: string;
  cellName: string;
  defaultDate: string;
  draftKey: string;
  leader: CellReportLeadershipOption;
  viceLeaders: CellReportLeadershipOption[];
  leadership: CellReportLeadershipOption[];
  initialData?: CellReportInitialData;
  correctionSourceVersionId?: string;
};

type StoredReportDraft = {
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

type LegacyStoredReportDraft = {
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

const fieldClassName =
  "mt-2 min-h-12 w-full rounded-xl border border-zinc-300 bg-white px-4 text-base text-zinc-950 outline-none transition focus:border-zinc-700 focus:ring-2 focus:ring-zinc-200 disabled:cursor-wait disabled:opacity-60";

function RequiredMark() {
  return (
    <span aria-hidden="true" className="ml-1 text-red-700">
      *
    </span>
  );
}

function getEvangelismRecordError(draft: EvangelismRecordDraft) {
  if (draft.leadershipIds.length < 1) {
    return "Selecione ao menos uma pessoa da liderança.";
  }

  if (!draft.leadershipIds.includes(draft.primaryLeadershipId)) {
    return "A liderança principal precisa permanecer neste registro.";
  }

  if (!draft.evangelismOn) {
    return "Informe a Data do Evangelismo.";
  }

  if (!draft.durationText.trim()) {
    return "Informe o Tempo de Evangelismo.";
  }

  if (!draft.comments.trim()) {
    return "Preencha os Comentários.";
  }

  if (
    draft.participants.some(
      (participant) =>
        participant.name.trim().length < 1 ||
        participant.name.trim().length > 200,
    )
  ) {
    return "Preencha o nome de cada integrante adicionado.";
  }

  return "";
}

function createInitialSeed(
  initialData: CellReportInitialData | undefined,
  defaultDate: string,
  hasViceLeaders: boolean,
) {
  let key = 0;
  const nextKey = () => {
    key += 1;
    return key;
  };

  return {
    meetingOn: initialData?.meetingOn ?? defaultDate,
    meetingFormat: initialData?.meetingFormat ?? "in_person",
    leaderWasPresent: initialData?.leaderWasPresent ?? "yes",
    selectedViceIds: initialData?.selectedViceIds ?? [],
    noViceWasPresent:
      initialData?.noViceWasPresent ?? !hasViceLeaders,
    members:
      initialData?.members.map((member) => ({
        key: nextKey(),
        name: member.name,
      })) ?? [],
    guestGroups:
      initialData?.guestGroups.map((group) => ({
        key: nextKey(),
        responsibleName: group.responsibleName,
        guests: group.guests.map((guest) => ({
          key: nextKey(),
          name: guest.name,
          isFirstTime: guest.isFirstTime,
        })),
      })) ?? [],
    evangelismRecords:
      initialData?.evangelismRecords.map((record) => ({
        key: nextKey(),
        primaryLeadershipId: record.primaryLeadershipId,
        leadershipIds: [...record.leadershipIds],
        evangelismOn: record.evangelismOn,
        durationText: record.durationText,
        comments: record.comments,
        participants: record.participants.map((participant) => ({
          key: nextKey(),
          name: participant.name,
        })),
      })) ?? [],
    notEvangelized: { ...(initialData?.notEvangelized ?? {}) },
    maxKey: key,
  };
}

export function ReportForm({
  cellId,
  cellName,
  defaultDate,
  draftKey,
  leader,
  viceLeaders,
  leadership,
  initialData,
  correctionSourceVersionId,
}: ReportFormProps) {
  const [state, formAction, pending] = useActionState(
    submitCellReport,
    initialState,
  );
  const formRef = useRef<HTMLFormElement>(null);
  const [initialSeed] = useState(() =>
    createInitialSeed(initialData, defaultDate, viceLeaders.length > 0),
  );
  const nextLocalKey = useRef(initialSeed.maxKey);
  const [step, setStep] = useState<1 | 2>(1);
  const [localMessage, setLocalMessage] = useState("");
  const [draftReady, setDraftReady] = useState(false);
  const [draftMessage, setDraftMessage] = useState(
    "Preparando o rascunho automático...",
  );
  const [meetingOn, setMeetingOn] = useState(initialSeed.meetingOn);
  const [meetingFormat, setMeetingFormat] = useState<"in_person" | "online">(
    initialSeed.meetingFormat,
  );
  const [leaderWasPresent, setLeaderWasPresent] = useState<"yes" | "no">(
    initialSeed.leaderWasPresent,
  );
  const [selectedViceIds, setSelectedViceIds] = useState<string[]>(
    initialSeed.selectedViceIds,
  );
  const [noViceWasPresent, setNoViceWasPresent] = useState(
    initialSeed.noViceWasPresent,
  );
  const [members, setMembers] = useState<ManualName[]>(
    initialSeed.members,
  );
  const [bulkMembersOpen, setBulkMembersOpen] = useState(false);
  const [bulkMemberNames, setBulkMemberNames] = useState("");
  const [bulkMemberMessage, setBulkMemberMessage] = useState("");
  const [guestGroups, setGuestGroups] = useState<GuestGroup[]>(
    initialSeed.guestGroups,
  );
  const [evangelismRecords, setEvangelismRecords] = useState<
    EvangelismRecordDraft[]
  >(initialSeed.evangelismRecords);
  const [notEvangelized, setNotEvangelized] =
    useState<NotEvangelizedDraft>(initialSeed.notEvangelized);
  const [openNotEvangelizedLeadershipId, setOpenNotEvangelizedLeadershipId] =
    useState<string | null>(null);
  const [bulkGuestGroupKey, setBulkGuestGroupKey] = useState<number | null>(
    null,
  );
  const [bulkGuestNames, setBulkGuestNames] = useState("");
  const [bulkGuestMessage, setBulkGuestMessage] = useState("");
  const [openEvangelismRecordKey, setOpenEvangelismRecordKey] = useState<
    number | null
  >(null);

  useEffect(() => {
    const restoreTimeoutId = window.setTimeout(() => {
      try {
        const storedValue = window.localStorage.getItem(draftKey);

        if (!storedValue) {
          setDraftMessage("Rascunho salvo automaticamente.");
          setDraftReady(true);
          return;
        }

        const parsed: unknown = JSON.parse(storedValue);

        if (!parsed || typeof parsed !== "object" || !("version" in parsed)) {
          throw new Error("invalid-draft");
        }

        const draft = parsed as
          | Partial<StoredReportDraft>
          | Partial<LegacyStoredReportDraft>;

        if (draft.version !== 1 && draft.version !== 2) {
          throw new Error("invalid-draft-version");
        }

        if (
          typeof draft.meetingOn === "string" &&
          /^\d{4}-\d{2}-\d{2}$/.test(draft.meetingOn) &&
          !correctionSourceVersionId
        ) {
          setMeetingOn(draft.meetingOn);
        }

        if (
          draft.meetingFormat === "in_person" ||
          draft.meetingFormat === "online"
        ) {
          setMeetingFormat(draft.meetingFormat);
        }

        if (
          draft.leaderWasPresent === "yes" ||
          draft.leaderWasPresent === "no"
        ) {
          setLeaderWasPresent(draft.leaderWasPresent);
        }

        const validViceIds = new Set(
          viceLeaders.map((viceLeader) => viceLeader.leadershipId),
        );
        const restoredViceIds = Array.isArray(draft.selectedViceIds)
          ? draft.selectedViceIds.filter(
              (id): id is string =>
                typeof id === "string" && validViceIds.has(id),
            )
          : [];
        setSelectedViceIds([...new Set(restoredViceIds)]);
        setNoViceWasPresent(
          viceLeaders.length === 0 ||
            (restoredViceIds.length === 0 && draft.noViceWasPresent === true),
        );

        const restoredMembers = Array.isArray(draft.members)
          ? draft.members
              .slice(0, 500)
              .filter(
                (item): item is ManualName =>
                  Boolean(item) &&
                  typeof item.key === "number" &&
                  typeof item.name === "string",
              )
          : [];
        setMembers(restoredMembers);
        const validLeadershipIds = new Set(
          leadership.map((person) => person.leadershipId),
        );
        let restoredGuestGroups: GuestGroup[] = [];
        let restoredEvangelismRecords: EvangelismRecordDraft[] = [];
        let restoredNotEvangelized: NotEvangelizedDraft = {};
        let restoredKeys = restoredMembers.map((item) => item.key);

        if (draft.version === 2) {
          const currentDraft = draft as Partial<StoredReportDraft>;
          restoredGuestGroups = Array.isArray(currentDraft.guestGroups)
            ? currentDraft.guestGroups
                .slice(0, 500)
                .filter(
                  (group): group is GuestGroup =>
                    Boolean(group) &&
                    typeof group.key === "number" &&
                    typeof group.responsibleName === "string" &&
                    Array.isArray(group.guests),
                )
                .map((group) => ({
                  ...group,
                  guests: group.guests
                    .slice(0, 500)
                    .filter(
                      (guest): guest is GuestItem =>
                        Boolean(guest) &&
                        typeof guest.key === "number" &&
                        typeof guest.name === "string" &&
                        typeof guest.isFirstTime === "boolean",
                    ),
                }))
            : [];
          restoredEvangelismRecords = Array.isArray(
            currentDraft.evangelismRecords,
          )
            ? currentDraft.evangelismRecords
                .slice(0, 100)
                .filter(
                  (record): record is EvangelismRecordDraft =>
                    Boolean(record) &&
                    typeof record.key === "number" &&
                    typeof record.primaryLeadershipId === "string" &&
                    validLeadershipIds.has(record.primaryLeadershipId) &&
                    Array.isArray(record.leadershipIds) &&
                    typeof record.evangelismOn === "string" &&
                    typeof record.durationText === "string" &&
                    typeof record.comments === "string" &&
                    Array.isArray(record.participants),
                )
                .map((record) => ({
                  ...record,
                  leadershipIds: [
                    ...new Set(
                      record.leadershipIds.filter(
                        (id) =>
                          typeof id === "string" && validLeadershipIds.has(id),
                      ),
                    ),
                  ],
                  participants: record.participants
                    .slice(0, 100)
                    .filter(
                      (participant): participant is ManualName =>
                        Boolean(participant) &&
                        typeof participant.key === "number" &&
                        typeof participant.name === "string",
                    ),
                }))
                .filter((record) =>
                  record.leadershipIds.includes(record.primaryLeadershipId),
                )
            : [];

          if (
            currentDraft.notEvangelized &&
            typeof currentDraft.notEvangelized === "object" &&
            !Array.isArray(currentDraft.notEvangelized)
          ) {
            restoredNotEvangelized = Object.fromEntries(
              Object.entries(currentDraft.notEvangelized).filter(
                ([id, comments]) =>
                  validLeadershipIds.has(id) && typeof comments === "string",
              ),
            );
          }
        } else {
          const legacyDraft = draft as Partial<LegacyStoredReportDraft>;
          const legacyGuests = Array.isArray(legacyDraft.guests)
            ? legacyDraft.guests
                .slice(0, 500)
                .filter(
                  (guest) =>
                    Boolean(guest) &&
                    typeof guest.key === "number" &&
                    typeof guest.name === "string" &&
                    typeof guest.responsibleName === "string" &&
                    typeof guest.isFirstTime === "boolean",
                )
            : [];
          const groupsByResponsible = new Map<string, GuestGroup>();

          for (const guest of legacyGuests) {
            const group = groupsByResponsible.get(guest.responsibleName);
            const guestItem = {
              key: guest.key,
              name: guest.name,
              isFirstTime: guest.isFirstTime,
            };

            if (group) {
              group.guests.push(guestItem);
            } else {
              groupsByResponsible.set(guest.responsibleName, {
                key: guest.key,
                responsibleName: guest.responsibleName,
                guests: [guestItem],
              });
            }
          }

          restoredGuestGroups = [...groupsByResponsible.values()];
          let generatedKey = Math.max(
            0,
            ...restoredMembers.map((item) => item.key),
            ...legacyGuests.map((item) => item.key),
          );

          if (
            legacyDraft.evangelism &&
            typeof legacyDraft.evangelism === "object" &&
            !Array.isArray(legacyDraft.evangelism)
          ) {
            for (const person of leadership) {
              const legacyEntry =
                legacyDraft.evangelism[person.leadershipId];

              if (!legacyEntry || typeof legacyEntry !== "object") {
                continue;
              }

              if (legacyEntry.didEvangelize === "yes") {
                generatedKey += 1;
                restoredEvangelismRecords.push({
                  key: generatedKey,
                  primaryLeadershipId: person.leadershipId,
                  leadershipIds: [person.leadershipId],
                  evangelismOn:
                    typeof legacyEntry.evangelismOn === "string"
                      ? legacyEntry.evangelismOn
                      : "",
                  durationText:
                    typeof legacyEntry.durationText === "string"
                      ? legacyEntry.durationText
                      : "",
                  comments:
                    typeof legacyEntry.comments === "string"
                      ? legacyEntry.comments
                      : "",
                  participants: Array.isArray(legacyEntry.participants)
                    ? legacyEntry.participants
                        .slice(0, 100)
                        .filter(
                          (participant): participant is ManualName =>
                            Boolean(participant) &&
                            typeof participant.key === "number" &&
                            typeof participant.name === "string",
                        )
                    : [],
                });
              } else if (legacyEntry.didEvangelize === "no") {
                restoredNotEvangelized[person.leadershipId] =
                  typeof legacyEntry.comments === "string"
                    ? legacyEntry.comments
                    : "";
              }
            }
          }
        }

        let restoredGuestCount = 0;
        restoredGuestGroups = restoredGuestGroups.flatMap((group) => {
          const availableSlots = 500 - restoredGuestCount;
          const restoredGuests = group.guests.slice(0, availableSlots);

          if (group.guests.length > 0 && restoredGuests.length === 0) {
            return [];
          }

          restoredGuestCount += restoredGuests.length;
          return [{ ...group, guests: restoredGuests }];
        });

        const evangelizedLeadershipIds = new Set(
          restoredEvangelismRecords.flatMap((record) => record.leadershipIds),
        );
        restoredNotEvangelized = Object.fromEntries(
          Object.entries(restoredNotEvangelized).filter(
            ([id]) => !evangelizedLeadershipIds.has(id),
          ),
        );
        setGuestGroups(restoredGuestGroups);
        setEvangelismRecords(restoredEvangelismRecords);
        setNotEvangelized(restoredNotEvangelized);
        setOpenNotEvangelizedLeadershipId(null);
        setOpenEvangelismRecordKey(null);
        setStep(draft.step === 2 ? 2 : 1);

        restoredKeys = [
          ...restoredKeys,
          ...restoredGuestGroups.flatMap((group) => [
            group.key,
            ...group.guests.map((guest) => guest.key),
          ]),
          ...restoredEvangelismRecords.flatMap((record) => [
            record.key,
            ...record.participants.map((participant) => participant.key),
          ]),
        ];
        nextLocalKey.current = Math.max(0, ...restoredKeys);
        setDraftMessage(
          draft.version === 1
            ? "Rascunho anterior recuperado e atualizado neste aparelho."
            : "Rascunho recuperado deste aparelho.",
        );
      } catch {
        window.localStorage.removeItem(draftKey);
        setDraftMessage(
          "O rascunho anterior estava inválido e foi descartado com segurança.",
        );
      } finally {
        setDraftReady(true);
      }
    }, 0);

    return () => window.clearTimeout(restoreTimeoutId);
  }, [correctionSourceVersionId, draftKey, leadership, viceLeaders]);

  useEffect(() => {
    if (!draftReady) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      const draft: StoredReportDraft = {
        version: 2,
        savedAt: new Date().toISOString(),
        meetingOn,
        meetingFormat,
        leaderWasPresent,
        selectedViceIds,
        noViceWasPresent,
        members,
        guestGroups,
        evangelismRecords,
        notEvangelized,
        step,
      };

      try {
        window.localStorage.setItem(draftKey, JSON.stringify(draft));
        setDraftMessage("Rascunho salvo automaticamente.");
      } catch {
        setDraftMessage(
          "Não foi possível salvar o rascunho neste aparelho. Mantenha esta página aberta.",
        );
      }
    }, 500);

    return () => window.clearTimeout(timeoutId);
  }, [
    draftKey,
    draftReady,
    evangelismRecords,
    guestGroups,
    leaderWasPresent,
    meetingFormat,
    meetingOn,
    members,
    noViceWasPresent,
    notEvangelized,
    selectedViceIds,
    step,
  ]);

  function newKey() {
    nextLocalKey.current += 1;
    return nextLocalKey.current;
  }

  function discardDraft() {
    try {
      window.localStorage.removeItem(draftKey);
    } catch {
      // Os estados abaixo ainda limpam o formulário visível.
    }

    nextLocalKey.current = initialSeed.maxKey;
    setMeetingOn(initialSeed.meetingOn);
    setMeetingFormat(initialSeed.meetingFormat);
    setLeaderWasPresent(initialSeed.leaderWasPresent);
    setSelectedViceIds([...initialSeed.selectedViceIds]);
    setNoViceWasPresent(initialSeed.noViceWasPresent);
    setMembers(initialSeed.members.map((member) => ({ ...member })));
    setBulkMembersOpen(false);
    setBulkMemberNames("");
    setBulkMemberMessage("");
    setGuestGroups(
      initialSeed.guestGroups.map((group) => ({
        ...group,
        guests: group.guests.map((guest) => ({ ...guest })),
      })),
    );
    setBulkGuestGroupKey(null);
    setBulkGuestNames("");
    setBulkGuestMessage("");
    setEvangelismRecords(
      initialSeed.evangelismRecords.map((record) => ({
        ...record,
        leadershipIds: [...record.leadershipIds],
        participants: record.participants.map((participant) => ({
          ...participant,
        })),
      })),
    );
    setNotEvangelized({ ...initialSeed.notEvangelized });
    setOpenNotEvangelizedLeadershipId(null);
    setStep(1);
    setOpenEvangelismRecordKey(null);
    setLocalMessage("");
    setDraftMessage(
      initialData
        ? "Alterações descartadas; a versão anterior foi restaurada."
        : "Rascunho descartado.",
    );
  }

  function updateEvangelismRecord(
    recordKey: number,
    updater: (current: EvangelismRecordDraft) => EvangelismRecordDraft,
  ) {
    setEvangelismRecords((current) =>
      current.map((record) =>
        record.key === recordKey ? updater(record) : record,
      ),
    );
  }

  function addEvangelismRecord(primaryLeadershipId: string) {
    const recordKey = newKey();
    setNotEvangelized((current) => {
      const next = { ...current };
      delete next[primaryLeadershipId];
      return next;
    });
    setEvangelismRecords((current) => [
      ...current,
      {
        key: recordKey,
        primaryLeadershipId,
        leadershipIds: [primaryLeadershipId],
        evangelismOn: "",
        durationText: "",
        comments: "",
        participants: [],
      },
    ]);
    setOpenEvangelismRecordKey(recordKey);
    setOpenNotEvangelizedLeadershipId(null);
    setLocalMessage("");
  }

  function handleRecordLeadershipSelection(
    recordKey: number,
    leadershipId: string,
    checked: boolean,
  ) {
    updateEvangelismRecord(recordKey, (record) => ({
      ...record,
      leadershipIds: checked
        ? [...new Set([...record.leadershipIds, leadershipId])]
        : record.leadershipIds.filter((id) => id !== leadershipId),
    }));

    if (checked) {
      setNotEvangelized((current) => {
        const next = { ...current };
        delete next[leadershipId];
        return next;
      });
    }
  }

  function removeEvangelismRecord(recordKey: number) {
    setEvangelismRecords((current) =>
      current.filter((record) => record.key !== recordKey),
    );
    setOpenEvangelismRecordKey((current) =>
      current === recordKey ? null : current,
    );
  }

  function markNotEvangelized(leadershipId: string) {
    setEvangelismRecords((current) =>
      removeIncompleteLeadershipDrafts(
        current,
        leadershipId,
        (record) => Boolean(getEvangelismRecordError(record)),
      ),
    );
    setOpenEvangelismRecordKey(null);
    setNotEvangelized((current) => ({ ...current, [leadershipId]: "" }));
    setOpenNotEvangelizedLeadershipId(leadershipId);
    setLocalMessage("");
  }

  function finishNotEvangelizedComment(leadershipId: string) {
    if (!notEvangelized[leadershipId]?.trim()) {
      setLocalMessage("Preencha os Comentários de quem não evangelizou.");
      return;
    }

    setOpenNotEvangelizedLeadershipId(null);
    setLocalMessage("");
  }

  function addGuestGroup() {
    if (guests.length >= 500) {
      return;
    }

    const groupKey = newKey();
    setGuestGroups((current) => [
      ...current,
      {
        key: groupKey,
        responsibleName: "",
        guests: [],
      },
    ]);
  }

  function openBulkMemberInput() {
    setBulkMembersOpen(true);
    setBulkMemberNames("");
    setBulkMemberMessage("");
    setLocalMessage("");
  }

  function closeBulkMemberInput() {
    setBulkMembersOpen(false);
    setBulkMemberNames("");
    setBulkMemberMessage("");
  }

  function addPastedMembers() {
    const names = parsePastedNames(bulkMemberNames);

    if (names.length === 0) {
      setBulkMemberMessage("Cole ao menos um nome de membro, um por linha.");
      return;
    }

    if (names.some((name) => name.length > 200)) {
      setBulkMemberMessage("Cada nome de membro deve ter até 200 caracteres.");
      return;
    }

    if (members.length + names.length > 500) {
      setBulkMemberMessage(
        `Esta lista ultrapassa o limite de 500 membros. Você ainda pode adicionar ${500 - members.length}.`,
      );
      return;
    }

    setMembers((current) => [
      ...current,
      ...names.map((name) => ({ key: newKey(), name })),
    ]);
    closeBulkMemberInput();
    setLocalMessage("");
  }

  function addGuestToGroup(groupKey: number) {
    if (guests.length >= 500) {
      return;
    }

    const guestKey = newKey();
    setGuestGroups((current) =>
      current.map((group) =>
        group.key === groupKey
          ? {
              ...group,
              guests: [
                ...group.guests,
                { key: guestKey, name: "", isFirstTime: false },
              ],
            }
          : group,
      ),
    );
  }

  function updateGuestGroup(
    groupKey: number,
    updater: (current: GuestGroup) => GuestGroup,
  ) {
    setGuestGroups((current) =>
      current.map((group) =>
        group.key === groupKey ? updater(group) : group,
      ),
    );
  }

  function removeGuestGroup(groupKey: number) {
    const group = guestGroups.find((item) => item.key === groupKey);

    if (
      group?.guests.length &&
      !window.confirm(
        "Remover este responsável e todos os convidados vinculados a ele?",
      )
    ) {
      return;
    }

    setGuestGroups((current) =>
      current.filter((groupItem) => groupItem.key !== groupKey),
    );

    if (bulkGuestGroupKey === groupKey) {
      setBulkGuestGroupKey(null);
      setBulkGuestNames("");
      setBulkGuestMessage("");
    }
  }

  function removeGuestFromGroup(groupKey: number, guestKey: number) {
    const removesGroup = guestGroups.some(
      (group) => group.key === groupKey && group.guests.length === 1,
    );
    setGuestGroups((current) =>
      current.flatMap((group) => {
        if (group.key !== groupKey) {
          return [group];
        }

        const remainingGuests = group.guests.filter(
          (guest) => guest.key !== guestKey,
        );
        return remainingGuests.length > 0
          ? [{ ...group, guests: remainingGuests }]
          : [];
      }),
    );

    if (removesGroup && bulkGuestGroupKey === groupKey) {
      closeBulkGuestInput();
    }
  }

  function openBulkGuestInput(groupKey: number) {
    setBulkGuestGroupKey(groupKey);
    setBulkGuestNames("");
    setBulkGuestMessage("");
    setLocalMessage("");
  }

  function closeBulkGuestInput() {
    setBulkGuestGroupKey(null);
    setBulkGuestNames("");
    setBulkGuestMessage("");
  }

  function addPastedGuests(groupKey: number) {
    const names = parsePastedNames(bulkGuestNames);

    if (names.length === 0) {
      setBulkGuestMessage("Cole ao menos um nome de convidado, um por linha.");
      return;
    }

    if (names.some((name) => name.length > 200)) {
      setBulkGuestMessage(
        "Cada nome de convidado deve ter até 200 caracteres.",
      );
      return;
    }

    if (guests.length + names.length > 500) {
      setBulkGuestMessage(
        `Esta lista ultrapassa o limite de 500 convidados. Você ainda pode adicionar ${500 - guests.length}.`,
      );
      return;
    }

    const addedGuests = names.map((name) => ({
      key: newKey(),
      name,
      isFirstTime: false,
    }));
    updateGuestGroup(groupKey, (current) => ({
      ...current,
      guests: [...current.guests, ...addedGuests],
    }));
    closeBulkGuestInput();
    setLocalMessage("");
  }

  function handleViceSelection(leadershipId: string, checked: boolean) {
    setNoViceWasPresent(false);
    setSelectedViceIds((current) =>
      checked
        ? [...current, leadershipId]
        : current.filter((id) => id !== leadershipId),
    );
  }

  function handleNoVicePresence(checked: boolean) {
    setNoViceWasPresent(checked);

    if (checked) {
      setSelectedViceIds([]);
    }
  }

  function advanceToEvangelism() {
    setLocalMessage("");

    if (!formRef.current?.reportValidity()) {
      return;
    }

    if (!noViceWasPresent && selectedViceIds.length === 0) {
      setLocalMessage(
        "Selecione os Vices presentes ou confirme que nenhum esteve presente.",
      );
      return;
    }

    setStep(2);
    setOpenEvangelismRecordKey(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function finishEvangelismRecord(recordKey: number) {
    const record = evangelismRecords.find((item) => item.key === recordKey);
    const error = record
      ? getEvangelismRecordError(record)
      : "O registro não foi encontrado.";

    if (error) {
      setLocalMessage(error);
      return;
    }

    setLocalMessage("");
    setOpenEvangelismRecordKey(null);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    setLocalMessage("");

    if (step !== 2) {
      event.preventDefault();
      advanceToEvangelism();
      return;
    }

    const firstIncompleteRecord = evangelismRecords.find((record) =>
      Boolean(getEvangelismRecordError(record)),
    );

    if (firstIncompleteRecord) {
      event.preventDefault();
      setOpenEvangelismRecordKey(firstIncompleteRecord.key);
      setLocalMessage(getEvangelismRecordError(firstIncompleteRecord));
      return;
    }

    const firstPendingLeadershipId = getFirstPendingLeadershipId(
      leadership.map((person) => person.leadershipId),
      evangelismRecords,
      notEvangelized,
    );
    const firstPendingLeadership = leadership.find(
      (person) => person.leadershipId === firstPendingLeadershipId,
    );

    if (firstPendingLeadership) {
      event.preventDefault();
      setLocalMessage(
        `Informe o evangelismo ou o motivo de ${firstPendingLeadership.name}.`,
      );
    }
  }

  const validEvangelismRecords = evangelismRecords.filter(
    (record) => !getEvangelismRecordError(record),
  );
  const guests = flattenGuestGroups(guestGroups);
  const firstTimeGuests = guests.filter((guest) => guest.isFirstTime).length;
  const totalParticipants = members.length + guests.length;
  const serializedMembers = members.map(({ name }) => ({ name }));
  const serializedGuests = guests.map(
    ({ name, responsibleName, isFirstTime }) => ({
      name,
      responsibleName,
      isFirstTime,
    }),
  );
  const serializedEvangelism = [
    ...evangelismRecords.map((record) => ({
      leadershipId: record.primaryLeadershipId,
      leadershipIds: record.leadershipIds,
      didEvangelize: true,
      evangelismOn: record.evangelismOn,
      durationText: record.durationText.trim(),
      comments: record.comments.trim(),
      participants: record.participants.map(({ name }) => ({ name })),
    })),
    ...leadership
      .filter(
        (person) =>
          !evangelismRecords.some((record) =>
            record.leadershipIds.includes(person.leadershipId),
          ),
      )
      .filter((person) =>
        Object.prototype.hasOwnProperty.call(
          notEvangelized,
          person.leadershipId,
        ),
      )
      .map((person) => ({
        leadershipId: person.leadershipId,
        leadershipIds: [] as string[],
        didEvangelize: false,
        evangelismOn: "",
        durationText: "",
        comments: notEvangelized[person.leadershipId].trim(),
        participants: [] as Array<{ name: string }>,
      })),
  ];

  return (
    <form
      ref={formRef}
      action={formAction}
      onSubmit={handleSubmit}
      className="mt-8 space-y-7"
    >
      <input type="hidden" name="cellId" value={cellId} />
      {correctionSourceVersionId ? (
        <input
          type="hidden"
          name="correctionSourceVersionId"
          value={correctionSourceVersionId}
        />
      ) : null}
      <input type="hidden" name="meetingOn" value={meetingOn} />
      <input type="hidden" name="meetingFormat" value={meetingFormat} />
      <input
        type="hidden"
        name="leaderWasPresent"
        value={leaderWasPresent}
      />
      <input
        type="hidden"
        name="noViceWasPresent"
        value={noViceWasPresent ? "yes" : "no"}
      />
      <input
        type="hidden"
        name="viceLeadershipIdsJson"
        value={JSON.stringify(selectedViceIds)}
      />
      <input
        type="hidden"
        name="membersJson"
        value={JSON.stringify(serializedMembers)}
      />
      <input
        type="hidden"
        name="guestsJson"
        value={JSON.stringify(serializedGuests)}
      />
      <input
        type="hidden"
        name="evangelismJson"
        value={JSON.stringify(serializedEvangelism)}
      />

      <ol className="grid grid-cols-2 gap-3" aria-label="Etapas da Ficha">
        <li
          className={`rounded-xl border px-4 py-3 text-sm font-semibold ${
            step === 1
              ? "border-zinc-950 bg-zinc-950 text-white"
              : "border-zinc-300 bg-white text-zinc-700"
          }`}
        >
          1. Organização
        </li>
        <li
          className={`rounded-xl border px-4 py-3 text-sm font-semibold ${
            step === 2
              ? "border-zinc-950 bg-zinc-950 text-white"
              : "border-zinc-300 bg-white text-zinc-700"
          }`}
        >
          2. Evangelismo
        </li>
      </ol>

      {state.message || localMessage ? (
        <p
          role="alert"
          aria-live="polite"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-4 text-red-800"
        >
          {localMessage || state.message}
        </p>
      ) : null}

      <div className="rounded-2xl bg-zinc-100 px-5 py-4">
        <p className="text-sm text-zinc-600">Célula</p>
        <p className="mt-1 text-lg font-semibold text-zinc-950">{cellName}</p>
      </div>

      <div className="flex flex-col gap-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-left sm:flex-row sm:items-center sm:justify-between">
        <p aria-live="polite" className="text-sm text-blue-950">
          {draftMessage}
        </p>
        <button
          type="button"
          onClick={discardDraft}
          disabled={pending || !draftReady}
          className="min-h-10 shrink-0 rounded-xl border border-blue-300 bg-white px-4 text-sm font-semibold text-blue-950 hover:bg-blue-100 disabled:opacity-60"
        >
          Descartar
        </button>
      </div>

      {step === 1 ? (
        <>
          <div className="grid gap-6 sm:grid-cols-2">
            <div>
              <label htmlFor="meetingOnUi" className="font-semibold text-zinc-950">
                Data da Célula
                <RequiredMark />
              </label>
              <input
                id="meetingOnUi"
                type="date"
                value={meetingOn}
                onChange={(event) => setMeetingOn(event.target.value)}
                required
                disabled={pending || Boolean(correctionSourceVersionId)}
                className={fieldClassName}
              />
              {correctionSourceVersionId ? (
                <p className="mt-2 text-sm leading-6 text-zinc-600">
                  A data permanece fixa para garantir que o envio seja uma nova
                  versão desta mesma Ficha.
                </p>
              ) : null}
            </div>

            <fieldset>
              <legend className="font-semibold text-zinc-950">
                Formato da reunião
                <RequiredMark />
              </legend>
              <div className="mt-2 grid grid-cols-2 gap-3">
                {[
                  ["in_person", "Presencial"],
                  ["online", "Online"],
                ].map(([value, label]) => (
                  <label
                    key={value}
                    className="flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border border-zinc-300 bg-white px-4"
                  >
                    <input
                      type="radio"
                      name="meetingFormatUi"
                      value={value}
                      checked={meetingFormat === value}
                      onChange={() =>
                        setMeetingFormat(value as "in_person" | "online")
                      }
                      required
                      disabled={pending}
                      className="h-5 w-5 accent-zinc-950"
                    />
                    {label}
                  </label>
                ))}
              </div>
            </fieldset>
          </div>

          <fieldset>
            <legend className="font-semibold text-zinc-950">
              {leader.name} esteve presente?
              <RequiredMark />
            </legend>
            <p className="mt-1 text-sm text-zinc-600">Líder da célula</p>
            <div className="mt-2 grid grid-cols-2 gap-3 sm:max-w-sm">
              {[
                ["yes", "Sim"],
                ["no", "Não"],
              ].map(([value, label]) => (
                <label
                  key={value}
                  className="flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border border-zinc-300 bg-white px-4"
                >
                  <input
                    type="radio"
                    name="leaderPresenceUi"
                    value={value}
                    checked={leaderWasPresent === value}
                    onChange={() =>
                      setLeaderWasPresent(value as "yes" | "no")
                    }
                    required
                    disabled={pending}
                    className="h-5 w-5 accent-zinc-950"
                  />
                  {label}
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend className="font-semibold text-zinc-950">
              Vice-líderes presentes
              <RequiredMark />
            </legend>
            {viceLeaders.length > 0 ? (
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {viceLeaders.map((viceLeader) => (
                  <label
                    key={viceLeader.leadershipId}
                    className="flex min-h-14 cursor-pointer items-center gap-3 rounded-xl border border-zinc-300 bg-white p-4 hover:bg-zinc-50"
                  >
                    <input
                      type="checkbox"
                      checked={selectedViceIds.includes(viceLeader.leadershipId)}
                      onChange={(event) =>
                        handleViceSelection(
                          viceLeader.leadershipId,
                          event.target.checked,
                        )
                      }
                      disabled={pending || noViceWasPresent}
                      className="h-5 w-5 shrink-0 accent-zinc-950"
                    />
                    <span className="font-medium text-zinc-950">
                      {viceLeader.name}
                    </span>
                  </label>
                ))}
              </div>
            ) : (
              <p className="mt-2 text-sm text-zinc-600">
                Esta célula não possui Vice-líderes vinculados atualmente.
              </p>
            )}
            <label className="mt-3 flex min-h-14 cursor-pointer items-center gap-3 rounded-xl border border-zinc-300 bg-zinc-50 p-4">
              <input
                type="checkbox"
                checked={noViceWasPresent}
                onChange={(event) => handleNoVicePresence(event.target.checked)}
                disabled={pending || viceLeaders.length === 0}
                className="h-5 w-5 shrink-0 accent-zinc-950"
              />
              <span className="font-medium text-zinc-950">
                Nenhum Vice-líder esteve presente
              </span>
            </label>
          </fieldset>

          <section aria-labelledby="members-heading">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 id="members-heading" className="font-semibold text-zinc-950">
                  Membros
                </h2>
                <p className="mt-1 text-sm text-zinc-600">
                  Deixe vazio se nenhum membro esteve presente.
                </p>
              </div>
              {members.length > 0 ? (
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm("Remover todos os membros adicionados?")) {
                      setMembers([]);
                      closeBulkMemberInput();
                    }
                  }}
                  disabled={pending}
                  className="min-h-11 rounded-xl border border-red-200 bg-white px-4 font-semibold text-red-800 hover:bg-red-50"
                >
                  Excluir todos
                </button>
              ) : null}
            </div>
            <div className="mt-4 space-y-3">
              {members.map((member, index) => (
                <div
                  key={member.key}
                  className="grid gap-3 rounded-2xl border border-zinc-200 p-4 sm:grid-cols-[1fr_auto] sm:items-end"
                >
                  <div>
                    <label
                      htmlFor={`member-${member.key}`}
                      className="font-medium text-zinc-900"
                    >
                      Nome do membro {index + 1}
                      <RequiredMark />
                    </label>
                    <input
                      id={`member-${member.key}`}
                      type="text"
                      value={member.name}
                      onChange={(event) =>
                        setMembers((current) =>
                          current.map((item) =>
                            item.key === member.key
                              ? { ...item, name: event.target.value }
                              : item,
                          ),
                        )
                      }
                      required
                      maxLength={200}
                      disabled={pending}
                      className={fieldClassName}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setMembers((current) =>
                        current.filter((item) => item.key !== member.key),
                      )
                    }
                    disabled={pending}
                    className="min-h-12 rounded-xl border border-red-200 bg-white px-4 font-semibold text-red-800 hover:bg-red-50"
                  >
                    Remover
                  </button>
                </div>
              ))}
            </div>
            <div className="mt-3 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() =>
                  setMembers((current) => [
                    ...current,
                    { key: newKey(), name: "" },
                  ])
                }
                disabled={pending || members.length >= 500}
                className="min-h-11 w-full rounded-xl border border-zinc-300 bg-white px-4 font-semibold text-zinc-900 hover:bg-zinc-100 sm:w-auto"
              >
                + Adicionar um membro
              </button>
              <button
                type="button"
                onClick={
                  bulkMembersOpen
                    ? closeBulkMemberInput
                    : openBulkMemberInput
                }
                aria-expanded={bulkMembersOpen}
                aria-controls="bulk-member-names"
                disabled={pending || members.length >= 500}
                className="min-h-11 w-full rounded-xl border border-zinc-300 bg-white px-4 font-semibold text-zinc-900 hover:bg-zinc-100 sm:w-auto"
              >
                <span aria-hidden="true">⚡</span> Adicionar vários de uma vez
              </button>
            </div>

            {bulkMembersOpen ? (
              <div
                id="bulk-member-names"
                className="mt-4 rounded-xl border border-blue-200 bg-blue-50 p-4"
              >
                <label
                  htmlFor="bulk-members"
                  className="font-semibold text-blue-950"
                >
                  Cole os nomes dos membros, um por linha.
                </label>
                <textarea
                  id="bulk-members"
                  rows={7}
                  value={bulkMemberNames}
                  onChange={(event) => setBulkMemberNames(event.target.value)}
                  placeholder={"João\nAndré\nMaria"}
                  disabled={pending}
                  className={`${fieldClassName} py-3`}
                />
                {bulkMemberMessage ? (
                  <p
                    role="alert"
                    className="mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
                  >
                    {bulkMemberMessage}
                  </p>
                ) : null}
                <div className="mt-3 flex flex-col gap-3 sm:flex-row">
                  <button
                    type="button"
                    onClick={addPastedMembers}
                    disabled={pending}
                    className="min-h-11 rounded-xl bg-zinc-950 px-4 font-semibold text-white hover:bg-zinc-800"
                  >
                    Adicionar nomes
                  </button>
                  <button
                    type="button"
                    onClick={closeBulkMemberInput}
                    disabled={pending}
                    className="min-h-11 rounded-xl border border-zinc-300 bg-white px-4 font-semibold text-zinc-900 hover:bg-zinc-100"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            ) : null}
          </section>

          <section aria-labelledby="guests-heading">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 id="guests-heading" className="font-semibold text-zinc-950">
                  Convidados
                </h2>
                <p className="mt-1 text-sm text-zinc-600">
                  Agrupe os convidados pela pessoa responsável. Deixe vazio se
                  não houve convidados.
                </p>
              </div>
              {guests.length > 0 ? (
                <button
                  type="button"
                  onClick={() => {
                    if (
                      window.confirm("Remover todos os convidados adicionados?")
                    ) {
                      setGuestGroups([]);
                      closeBulkGuestInput();
                    }
                  }}
                  disabled={pending}
                  className="min-h-11 rounded-xl border border-red-200 bg-white px-4 font-semibold text-red-800 hover:bg-red-50"
                >
                  Excluir todos
                </button>
              ) : null}
            </div>
            <div className="mt-4 space-y-4">
              {guestGroups.map((group, groupIndex) => (
                <div
                  key={group.key}
                  className="rounded-2xl border border-zinc-300 bg-zinc-50 p-4 sm:p-5"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                    <div className="min-w-0 flex-1">
                      <label
                        htmlFor={`responsible-${group.key}`}
                        className="font-semibold text-zinc-950"
                      >
                        Responsável {groupIndex + 1}
                        <RequiredMark />
                      </label>
                      <input
                        id={`responsible-${group.key}`}
                        type="text"
                        value={group.responsibleName}
                        onChange={(event) =>
                          updateGuestGroup(group.key, (current) => ({
                            ...current,
                            responsibleName: event.target.value,
                          }))
                        }
                        placeholder="Ex.: Eugênio"
                        required
                        maxLength={200}
                        disabled={pending}
                        className={fieldClassName}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => removeGuestGroup(group.key)}
                      disabled={pending}
                      className="min-h-12 rounded-xl border border-red-200 bg-white px-4 font-semibold text-red-800 hover:bg-red-50"
                    >
                      Remover responsável
                    </button>
                  </div>

                  <div className="mt-4 space-y-3">
                    {group.guests.map((guest, guestIndex) => (
                      <div
                        key={guest.key}
                        className="rounded-xl border border-zinc-200 bg-white p-4"
                      >
                        <label
                          htmlFor={`guest-${guest.key}`}
                          className="font-medium text-zinc-900"
                        >
                          Nome do convidado {guestIndex + 1}
                          <RequiredMark />
                        </label>
                        <input
                          id={`guest-${guest.key}`}
                          type="text"
                          value={guest.name}
                          onChange={(event) =>
                            updateGuestGroup(group.key, (current) => ({
                              ...current,
                              guests: current.guests.map((item) =>
                                item.key === guest.key
                                  ? { ...item, name: event.target.value }
                                  : item,
                              ),
                            }))
                          }
                          required
                          maxLength={200}
                          disabled={pending}
                          className={fieldClassName}
                        />
                        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                          <label className="flex min-h-11 cursor-pointer items-center gap-3">
                            <input
                              type="checkbox"
                              checked={guest.isFirstTime}
                              onChange={(event) =>
                                updateGuestGroup(group.key, (current) => ({
                                  ...current,
                                  guests: current.guests.map((item) =>
                                    item.key === guest.key
                                      ? {
                                          ...item,
                                          isFirstTime: event.target.checked,
                                        }
                                      : item,
                                  ),
                                }))
                              }
                              disabled={pending}
                              className="h-5 w-5 accent-zinc-950"
                            />
                            Primeira vez
                          </label>
                          <button
                            type="button"
                            onClick={() =>
                              removeGuestFromGroup(group.key, guest.key)
                            }
                            disabled={pending}
                            className="min-h-11 rounded-xl border border-red-200 bg-white px-4 font-semibold text-red-800 hover:bg-red-50"
                          >
                            Remover convidado
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-3 flex flex-col gap-3 sm:flex-row">
                    <button
                      type="button"
                      onClick={() => addGuestToGroup(group.key)}
                      disabled={pending || guests.length >= 500}
                      className="min-h-11 w-full rounded-xl border border-zinc-300 bg-white px-4 font-semibold text-zinc-900 hover:bg-zinc-100 sm:w-auto"
                    >
                      + Adicionar um convidado
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        bulkGuestGroupKey === group.key
                          ? closeBulkGuestInput()
                          : openBulkGuestInput(group.key)
                      }
                      aria-expanded={bulkGuestGroupKey === group.key}
                      aria-controls={`bulk-guests-${group.key}`}
                      disabled={pending || guests.length >= 500}
                      className="min-h-11 w-full rounded-xl border border-zinc-300 bg-white px-4 font-semibold text-zinc-900 hover:bg-zinc-100 sm:w-auto"
                    >
                      <span aria-hidden="true">⚡</span> Adicionar vários de uma vez
                    </button>
                  </div>

                  {bulkGuestGroupKey === group.key ? (
                    <div
                      id={`bulk-guests-${group.key}`}
                      className="mt-4 rounded-xl border border-blue-200 bg-blue-50 p-4"
                    >
                      <label
                        htmlFor={`bulk-guest-names-${group.key}`}
                        className="font-semibold text-blue-950"
                      >
                        Cole os nomes dos convidados, um por linha.
                      </label>
                      <textarea
                        id={`bulk-guest-names-${group.key}`}
                        rows={7}
                        value={bulkGuestNames}
                        onChange={(event) =>
                          setBulkGuestNames(event.target.value)
                        }
                        placeholder={"Manoel\nRafael\nLucas\nMaria\nJoana"}
                        disabled={pending}
                        className={`${fieldClassName} py-3`}
                      />
                      <p className="mt-2 text-sm leading-6 text-blue-900">
                        Linhas vazias serão ignoradas. Depois você poderá
                        marcar Primeira vez individualmente.
                      </p>
                      {bulkGuestMessage ? (
                        <p
                          role="alert"
                          className="mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
                        >
                          {bulkGuestMessage}
                        </p>
                      ) : null}
                      <div className="mt-3 flex flex-col gap-3 sm:flex-row">
                        <button
                          type="button"
                          onClick={() => addPastedGuests(group.key)}
                          disabled={pending}
                          className="min-h-11 rounded-xl bg-zinc-950 px-4 font-semibold text-white hover:bg-zinc-800"
                        >
                          Adicionar nomes
                        </button>
                        <button
                          type="button"
                          onClick={closeBulkGuestInput}
                          disabled={pending}
                          className="min-h-11 rounded-xl border border-zinc-300 bg-white px-4 font-semibold text-zinc-900 hover:bg-zinc-100"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={addGuestGroup}
              disabled={pending || guests.length >= 500}
              className="mt-3 min-h-11 w-full rounded-xl border border-zinc-300 bg-white px-4 font-semibold text-zinc-900 hover:bg-zinc-100 sm:w-auto"
            >
              + Adicionar responsável
            </button>
          </section>

          <section
            aria-label="Totais calculados"
            className="grid gap-3 rounded-2xl bg-zinc-100 p-5 sm:grid-cols-4"
          >
            {[
              ["MEMBROS", members.length],
              ["CONVIDADOS", guests.length],
              ["1ª VEZ", firstTimeGuests],
              ["GERAL", totalParticipants],
            ].map(([label, value]) => (
              <div key={label} className="rounded-xl bg-white px-4 py-3">
                <p className="text-xs font-semibold text-zinc-600">{label}</p>
                <p className="mt-1 text-2xl font-semibold text-zinc-950">
                  {value}
                </p>
              </div>
            ))}
          </section>

          <button
            type="button"
            onClick={advanceToEvangelism}
            disabled={pending}
            className="min-h-12 w-full rounded-xl bg-zinc-950 px-5 text-base font-semibold text-white hover:bg-zinc-800 disabled:cursor-wait disabled:bg-zinc-500 sm:w-auto sm:min-w-56"
          >
            Avançar para Evangelismo
          </button>
        </>
      ) : (
        <>
          <section aria-labelledby="evangelism-heading">
            <h2
              id="evangelism-heading"
              className="text-2xl font-semibold text-zinc-950"
            >
              Relatório de Evangelismo
            </h2>
            <p className="mt-2 leading-7 text-zinc-700">
              Uma pessoa conta o que o grupo fez e marca os outros Líderes ou
              Vices que evangelizaram junto.
            </p>

            <section
              className="mt-5 overflow-hidden rounded-2xl border border-zinc-300 bg-white"
              aria-labelledby="leadership-status-heading"
            >
              <h3
                id="leadership-status-heading"
                className="bg-zinc-50 px-5 py-4 font-semibold text-zinc-950"
              >
                Situação da liderança
              </h3>
              <div className="divide-y divide-zinc-200">
                {leadership.map((person) => {
                const personRecords = getLeadershipRecords(
                  validEvangelismRecords,
                  person.leadershipId,
                );
                const hasEvangelized = personRecords.length > 0;
                const hasNegativeStatus = Object.prototype.hasOwnProperty.call(
                  notEvangelized,
                  person.leadershipId,
                );
                const negativeComment =
                  notEvangelized[person.leadershipId] ?? "";
                const isNegativeCommentOpen =
                  hasNegativeStatus &&
                  (openNotEvangelizedLeadershipId === person.leadershipId ||
                    !negativeComment.trim());
                const firstSharedRecord = personRecords.find(
                  (record) =>
                    record.primaryLeadershipId !== person.leadershipId,
                );
                const sharedRecordOwner = firstSharedRecord
                  ? leadership.find(
                      (item) =>
                        item.leadershipId ===
                        firstSharedRecord.primaryLeadershipId,
                    )
                  : null;

                return (
                  <article
                    key={person.leadershipId}
                    className="px-5 py-4"
                  >
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <span>
                        <span className="block font-semibold text-zinc-950">
                          {person.name}
                        </span>
                        <span className="mt-1 block text-sm text-zinc-600">
                          {person.role === "leader" ? "Líder" : "Vice-líder"}
                        </span>
                      </span>
                      <span
                        className={`text-sm font-semibold ${
                          hasEvangelized
                            ? "text-emerald-800"
                            : hasNegativeStatus
                              ? "text-zinc-700"
                              : "text-amber-800"
                        }`}
                      >
                        {hasEvangelized
                          ? `✓ Evangelizou — ${personRecords.length} ${
                              personRecords.length === 1
                                ? "registro"
                                : "registros"
                            }`
                          : hasNegativeStatus
                            ? "○ Não evangelizou"
                            : "Pendente"}
                      </span>
                    </div>

                    {hasEvangelized ? (
                      <>
                        {sharedRecordOwner ? (
                          <p className="mt-3 text-sm text-emerald-800">
                            Participou de evangelismo registrado com {" "}
                            {sharedRecordOwner.name}.
                          </p>
                        ) : null}
                        <button
                          type="button"
                          onClick={() => addEvangelismRecord(person.leadershipId)}
                          disabled={pending}
                          className="mt-4 min-h-11 w-full rounded-xl border border-zinc-300 bg-white px-4 font-semibold text-zinc-950 hover:bg-zinc-100 sm:w-auto"
                        >
                          + Registrar outro
                        </button>
                      </>
                    ) : hasNegativeStatus ? (
                      isNegativeCommentOpen ? (
                        <div className="mt-4 rounded-xl bg-zinc-50 p-4">
                          <label
                            htmlFor={`not-evangelized-${person.leadershipId}`}
                            className="font-medium text-zinc-950"
                          >
                            Comentários
                            <RequiredMark />
                          </label>
                          <p className="mt-1 text-sm text-zinc-600">
                            Explique brevemente por que não evangelizou nesta
                            semana.
                          </p>
                          <textarea
                            id={`not-evangelized-${person.leadershipId}`}
                            rows={3}
                            value={negativeComment}
                            onChange={(event) =>
                              setNotEvangelized((current) => ({
                                ...current,
                                [person.leadershipId]: event.target.value,
                              }))
                            }
                            required
                            maxLength={4000}
                            disabled={pending}
                            className={`${fieldClassName} py-3`}
                          />
                          <div className="mt-3 flex flex-col gap-3 sm:flex-row">
                            <button
                              type="button"
                              onClick={() =>
                                finishNotEvangelizedComment(person.leadershipId)
                              }
                              disabled={pending}
                              className="min-h-11 rounded-xl bg-zinc-950 px-4 font-semibold text-white hover:bg-zinc-800"
                            >
                              Concluir comentário
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                addEvangelismRecord(person.leadershipId)
                              }
                              disabled={pending}
                              className="min-h-11 rounded-xl border border-zinc-300 bg-white px-4 font-semibold text-zinc-900 hover:bg-zinc-100"
                            >
                              Registrar evangelismo
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                          <button
                            type="button"
                            onClick={() =>
                              setOpenNotEvangelizedLeadershipId(
                                person.leadershipId,
                              )
                            }
                            disabled={pending}
                            className="min-h-11 rounded-xl border border-zinc-300 bg-white px-4 font-semibold text-zinc-900 hover:bg-zinc-100"
                          >
                            Editar comentário
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              addEvangelismRecord(person.leadershipId)
                            }
                            disabled={pending}
                            className="min-h-11 rounded-xl bg-zinc-950 px-4 font-semibold text-white hover:bg-zinc-800"
                          >
                            Registrar evangelismo
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setNotEvangelized((current) => {
                                const next = { ...current };
                                delete next[person.leadershipId];
                                return next;
                              });
                              setOpenNotEvangelizedLeadershipId(null);
                            }}
                            disabled={pending}
                            className="min-h-11 rounded-xl border border-zinc-300 bg-white px-4 font-semibold text-zinc-900 hover:bg-zinc-100"
                          >
                            Desfazer
                          </button>
                        </div>
                      )
                    ) : (
                      <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                        <button
                          type="button"
                          onClick={() => addEvangelismRecord(person.leadershipId)}
                          disabled={pending}
                          className="min-h-11 rounded-xl bg-zinc-950 px-4 font-semibold text-white hover:bg-zinc-800"
                        >
                          Registrar evangelismo
                        </button>
                        <button
                          type="button"
                          onClick={() => markNotEvangelized(person.leadershipId)}
                          disabled={pending}
                          className="min-h-11 rounded-xl border border-zinc-300 bg-white px-4 font-semibold text-zinc-900 hover:bg-zinc-100"
                        >
                          Não evangelizou
                        </button>
                      </div>
                    )}
                    </article>
                );
                })}
              </div>
            </section>

            {evangelismRecords.length > 0 ? (
              <section
                aria-labelledby="evangelism-records-heading"
                className="mt-8"
              >
                <h3
                  id="evangelism-records-heading"
                  className="text-xl font-semibold text-zinc-950"
                >
                  Evangelismos preenchidos
                </h3>
                <p className="mt-1 text-sm leading-6 text-zinc-600">
                  Se o mesmo grupo saiu em mais de um dia, informe o tempo total
                  e explique nos Comentários.
                </p>

                <div className="mt-4 space-y-3">
                  {evangelismRecords.map((record, recordIndex) => {
                    const isOpen = openEvangelismRecordKey === record.key;
                    const error = getEvangelismRecordError(record);
                    const primaryPerson = leadership.find(
                      (person) =>
                        person.leadershipId === record.primaryLeadershipId,
                    );
                    const companionNames = leadership
                      .filter((person) =>
                        person.leadershipId !== record.primaryLeadershipId &&
                        record.leadershipIds.includes(person.leadershipId),
                      )
                      .map((person) => person.name);

                    return (
                      <article
                        key={record.key}
                        className="overflow-hidden rounded-2xl border border-zinc-300 bg-white"
                      >
                        <button
                          type="button"
                          onClick={() =>
                            setOpenEvangelismRecordKey(isOpen ? null : record.key)
                          }
                          aria-expanded={isOpen}
                          aria-controls={`evangelism-record-${record.key}`}
                          className="flex min-h-16 w-full flex-col gap-2 px-5 py-4 text-left hover:bg-zinc-50 sm:flex-row sm:items-center sm:justify-between"
                        >
                          <span>
                            <span className="block font-semibold text-zinc-950">
                              {primaryPerson?.name ||
                                `Evangelismo ${recordIndex + 1}`}
                            </span>
                            <span className="mt-1 block text-sm text-zinc-600">
                              {companionNames.length > 0
                                ? `Com ${companionNames.join(", ")}`
                                : "Sem outro Líder/Vice"}
                            </span>
                          </span>
                          <span
                            className={`text-sm font-semibold ${
                              error ? "text-amber-800" : "text-emerald-800"
                            }`}
                          >
                            {error ? "Pendente" : "Pronto"}
                          </span>
                        </button>

                        {isOpen ? (
                          <div
                            id={`evangelism-record-${record.key}`}
                            className="space-y-6 border-t border-zinc-200 bg-zinc-50 p-5"
                          >
                            <div>
                              <p className="font-semibold text-zinc-950">
                                Quem está registrando
                              </p>
                              <p className="mt-2 min-h-12 rounded-xl border border-zinc-300 bg-white px-4 py-3 text-zinc-950">
                                {primaryPerson?.name || "Liderança"}
                              </p>
                            </div>

                            <fieldset>
                              <legend className="font-semibold text-zinc-950">
                                Quem evangelizou junto?
                              </legend>
                              <p className="mt-1 text-sm text-zinc-600">
                                Deixe sem marcar quando evangelizou sem outro
                                Líder ou Vice desta célula.
                              </p>
                              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                                {leadership
                                  .filter(
                                    (person) =>
                                      person.leadershipId !==
                                      record.primaryLeadershipId,
                                  )
                                  .map((person) => (
                                    <label
                                      key={person.leadershipId}
                                      className="flex min-h-14 cursor-pointer items-center gap-3 rounded-xl border border-zinc-300 bg-white p-4"
                                    >
                                      <input
                                        type="checkbox"
                                        checked={record.leadershipIds.includes(
                                          person.leadershipId,
                                        )}
                                        onChange={(event) =>
                                          handleRecordLeadershipSelection(
                                            record.key,
                                            person.leadershipId,
                                            event.target.checked,
                                          )
                                        }
                                        disabled={pending}
                                        className="h-5 w-5 shrink-0 accent-zinc-950"
                                      />
                                      <span>
                                        <span className="block font-medium text-zinc-950">
                                          {person.name}
                                        </span>
                                        <span className="mt-1 block text-xs text-zinc-600">
                                          {person.role === "leader"
                                            ? "Líder"
                                            : "Vice-líder"}
                                        </span>
                                      </span>
                                    </label>
                                  ))}
                              </div>
                            </fieldset>

                            <div className="grid gap-5 sm:grid-cols-2">
                              <div>
                                <label
                                  htmlFor={`evangelism-date-${record.key}`}
                                  className="font-semibold text-zinc-950"
                                >
                                  Data
                                  <RequiredMark />
                                </label>
                                <input
                                  id={`evangelism-date-${record.key}`}
                                  type="date"
                                  value={record.evangelismOn}
                                  onChange={(event) =>
                                    updateEvangelismRecord(record.key, (current) => ({
                                      ...current,
                                      evangelismOn: event.target.value,
                                    }))
                                  }
                                  required
                                  disabled={pending}
                                  className={fieldClassName}
                                />
                              </div>
                              <div>
                                <label
                                  htmlFor={`duration-${record.key}`}
                                  className="font-semibold text-zinc-950"
                                >
                                  Tempo de Evangelismo
                                  <RequiredMark />
                                </label>
                                <input
                                  id={`duration-${record.key}`}
                                  type="text"
                                  value={record.durationText}
                                  onChange={(event) =>
                                    updateEvangelismRecord(record.key, (current) => ({
                                      ...current,
                                      durationText: event.target.value,
                                    }))
                                  }
                                  placeholder="Ex.: 30 minutos ou 4h"
                                  required
                                  maxLength={60}
                                  disabled={pending}
                                  className={fieldClassName}
                                />
                              </div>
                            </div>

                            <section aria-labelledby={`participants-${record.key}`}>
                              <div>
                                <h4
                                  id={`participants-${record.key}`}
                                  className="font-semibold text-zinc-950"
                                >
                                  Integrantes
                                </h4>
                                <p className="mt-1 text-sm text-zinc-600">
                                  Informe as demais pessoas que participaram.
                                </p>
                              </div>
                              <div className="mt-3 space-y-3">
                                {record.participants.map((participant, index) => (
                                  <div
                                    key={participant.key}
                                    className="grid gap-3 rounded-xl border border-zinc-200 bg-white p-4 sm:grid-cols-[1fr_auto] sm:items-end"
                                  >
                                    <div>
                                      <label
                                        htmlFor={`participant-${record.key}-${participant.key}`}
                                        className="font-medium text-zinc-900"
                                      >
                                        Nome do integrante {index + 1}
                                        <RequiredMark />
                                      </label>
                                      <input
                                        id={`participant-${record.key}-${participant.key}`}
                                        type="text"
                                        value={participant.name}
                                        onChange={(event) =>
                                          updateEvangelismRecord(
                                            record.key,
                                            (current) => ({
                                              ...current,
                                              participants:
                                                current.participants.map((item) =>
                                                  item.key === participant.key
                                                    ? {
                                                        ...item,
                                                        name: event.target.value,
                                                      }
                                                    : item,
                                                ),
                                            }),
                                          )
                                        }
                                        required
                                        maxLength={200}
                                        disabled={pending}
                                        className={fieldClassName}
                                      />
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        updateEvangelismRecord(
                                          record.key,
                                          (current) => ({
                                            ...current,
                                            participants:
                                              current.participants.filter(
                                                (item) =>
                                                  item.key !== participant.key,
                                              ),
                                          }),
                                        )
                                      }
                                      disabled={pending}
                                      className="min-h-12 rounded-xl border border-red-200 bg-white px-4 font-semibold text-red-800 hover:bg-red-50"
                                    >
                                      Remover
                                    </button>
                                  </div>
                                ))}
                              </div>
                              <button
                                type="button"
                                onClick={() =>
                                  updateEvangelismRecord(record.key, (current) => ({
                                    ...current,
                                    participants: [
                                      ...current.participants,
                                      { key: newKey(), name: "" },
                                    ],
                                  }))
                                }
                                disabled={
                                  pending || record.participants.length >= 100
                                }
                                className="mt-3 min-h-11 w-full rounded-xl border border-zinc-300 bg-white px-4 font-semibold text-zinc-900 hover:bg-zinc-100 sm:w-auto"
                              >
                                + Adicionar outro integrante
                              </button>
                            </section>

                            <div>
                              <label
                                htmlFor={`comments-${record.key}`}
                                className="font-semibold text-zinc-950"
                              >
                                Comentários
                                <RequiredMark />
                                <span className="mt-1 block text-sm font-normal text-zinc-600">
                                  Conte de forma simples como foi o evangelismo.
                                </span>
                              </label>
                              <textarea
                                id={`comments-${record.key}`}
                                rows={4}
                                value={record.comments}
                                onChange={(event) =>
                                  updateEvangelismRecord(record.key, (current) => ({
                                    ...current,
                                    comments: event.target.value,
                                  }))
                                }
                                required
                                maxLength={4000}
                                disabled={pending}
                                className={`${fieldClassName} py-3`}
                              />
                            </div>

                            <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
                              <button
                                type="button"
                                onClick={() => {
                                  if (
                                    window.confirm(
                                      "Remover este registro de evangelismo?",
                                    )
                                  ) {
                                    removeEvangelismRecord(record.key);
                                  }
                                }}
                                disabled={pending}
                                className="min-h-11 rounded-xl border border-red-200 bg-white px-4 font-semibold text-red-800 hover:bg-red-50"
                              >
                                Remover registro
                              </button>
                              <button
                                type="button"
                                onClick={() => finishEvangelismRecord(record.key)}
                                disabled={pending}
                                className="min-h-11 rounded-xl bg-zinc-950 px-5 font-semibold text-white hover:bg-zinc-800"
                              >
                                Salvar evangelismo
                              </button>
                            </div>
                          </div>
                        ) : null}
                      </article>
                    );
                  })}
                </div>
              </section>
            ) : null}
          </section>

          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={() => {
                setStep(1);
                setLocalMessage("");
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              disabled={pending}
              className="min-h-12 rounded-xl border border-zinc-300 bg-white px-5 font-semibold text-zinc-900 hover:bg-zinc-100 sm:min-w-48"
            >
              Voltar à organização
            </button>
            <button
              type="submit"
              disabled={pending}
              className="min-h-12 rounded-xl bg-zinc-950 px-5 font-semibold text-white hover:bg-zinc-800 disabled:cursor-wait disabled:bg-zinc-500 sm:min-w-56"
            >
              {pending ? "Enviando..." : "Enviar Ficha completa"}
            </button>
          </div>
        </>
      )}
    </form>
  );
}
