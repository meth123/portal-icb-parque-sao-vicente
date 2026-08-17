"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  CloudCheck,
  Info,
  LoaderCircle,
  Plus,
  Send,
  Trash2,
  Zap,
} from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
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
import { MemberRow } from "./components/member-row";
import { ReportStepper } from "./components/report-stepper";
import { ReportTotals } from "./components/report-totals";
import type {
  EvangelismRecordDraft,
  GuestGroup,
  GuestItem,
  LegacyStoredReportDraft,
  ManualName,
  NotEvangelizedDraft,
  PreviousStoredReportDraft,
  ReportStep,
  StoredReportDraft,
} from "./types";
import { createInitialSeed, getEvangelismRecordError } from "./utils";

const initialState: SubmitCellReportState = { message: "" };

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

const fieldClassName =
  "min-h-12 w-full rounded-xl border border-app-border bg-surface px-4 text-base text-app-foreground outline-none transition placeholder:text-app-secondary focus:border-theme-primary focus:ring-2 focus:ring-theme-primary-subtle disabled:cursor-wait disabled:opacity-60";

function formatBrazilianDate(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : "";
}

function parseBrazilianDate(value: string) {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value);

  if (!match) {
    return null;
  }

  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  const parsed = new Date(Date.UTC(year, month - 1, day));

  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month - 1 ||
    parsed.getUTCDate() !== day
  ) {
    return null;
  }

  return `${match[3]}-${match[2]}-${match[1]}`;
}

type BrazilianDateInputProps = {
  id: string;
  value: string;
  onChange: (value: string) => void;
  disabled: boolean;
};

function BrazilianDateInput({
  id,
  value,
  onChange,
  disabled,
}: BrazilianDateInputProps) {
  const [displayValue, setDisplayValue] = useState(() =>
    formatBrazilianDate(value),
  );
  const internalValue = useRef(value);
  const inputRef = useRef<HTMLInputElement>(null);
  const calendarInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (value !== internalValue.current) {
      internalValue.current = value;
      setDisplayValue(formatBrazilianDate(value));
      inputRef.current?.setCustomValidity("");
    }
  }, [value]);

  return (
    <div className="relative">
      <input
        ref={inputRef}
        id={id}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        placeholder="dd/mm/aaaa"
        value={displayValue}
        onChange={(event) => {
          const digits = event.target.value.replace(/\D/g, "").slice(0, 8);
          const formatted = [
            digits.slice(0, 2),
            digits.slice(2, 4),
            digits.slice(4, 8),
          ]
            .filter(Boolean)
            .join("/");
          const parsed = parseBrazilianDate(formatted);

          setDisplayValue(formatted);
          internalValue.current = parsed ?? "";
          onChange(parsed ?? "");
          event.currentTarget.setCustomValidity(
            parsed ? "" : "Informe uma data válida no formato dia/mês/ano.",
          );
        }}
        required
        maxLength={10}
        pattern="\d{2}/\d{2}/\d{4}"
        title="Informe a data no formato dia/mês/ano."
        disabled={disabled}
        className={`${fieldClassName} pr-14`}
      />
      <button
        type="button"
        aria-label="Abrir calendário"
        disabled={disabled}
        onClick={() => {
          const calendarInput = calendarInputRef.current;

          if (!calendarInput) {
            return;
          }

          if (typeof calendarInput.showPicker === "function") {
            calendarInput.showPicker();
          } else {
            calendarInput.focus();
            calendarInput.click();
          }
        }}
        className="absolute right-1 top-1 flex h-10 w-10 items-center justify-center rounded-lg text-app-secondary hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-focus disabled:cursor-wait disabled:opacity-60"
      >
        <CalendarDays aria-hidden="true" className="h-5 w-5" />
      </button>
      <input
        ref={calendarInputRef}
        type="date"
        value={value}
        onChange={(event) => {
          const nextValue = event.target.value;
          internalValue.current = nextValue;
          setDisplayValue(formatBrazilianDate(nextValue));
          inputRef.current?.setCustomValidity("");
          onChange(nextValue);
        }}
        aria-label="Selecionar data no calendário"
        lang="pt-BR"
        disabled={disabled}
        tabIndex={-1}
        className="pointer-events-none absolute h-px w-px opacity-0"
      />
    </div>
  );
}

function RequiredMark() {
  return (
    <span aria-hidden="true" className="ml-1 text-danger">
      *
    </span>
  );
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
  const [step, setStep] = useState<ReportStep>(1);
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
  const [submissionConfirmed, setSubmissionConfirmed] = useState(false);

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
          | Partial<PreviousStoredReportDraft>
          | Partial<LegacyStoredReportDraft>;

        if (draft.version !== 1 && draft.version !== 2 && draft.version !== 3) {
          throw new Error("invalid-draft-version");
        }

        if (
          typeof draft.meetingOn === "string" &&
          /^\d{4}-\d{2}-\d{2}$/.test(draft.meetingOn)
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

        if (draft.version === 2 || draft.version === 3) {
          const currentDraft = draft as
            | Partial<StoredReportDraft>
            | Partial<PreviousStoredReportDraft>;
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
        if (draft.version === 3) {
          setStep(
            draft.step === 2 || draft.step === 3 || draft.step === 4
              ? draft.step
              : 1,
          );
        } else {
          setStep(draft.step === 2 ? 4 : 1);
        }

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
        version: 3,
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
    setSubmissionConfirmed(false);
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
    if (
      checked &&
      Object.prototype.hasOwnProperty.call(notEvangelized, leadershipId)
    ) {
      setLocalMessage(
        "Desfaça o status de Não evangelizou antes de incluir esta pessoa.",
      );
      return;
    }

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

  function moveToStep(nextStep: ReportStep) {
    setStep(nextStep);
    setSubmissionConfirmed(false);
    setLocalMessage("");
    setOpenEvangelismRecordKey(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function advanceToStep(nextStep: ReportStep) {
    setLocalMessage("");

    if (!formRef.current?.reportValidity()) {
      return;
    }

    if (
      step === 1 &&
      !noViceWasPresent &&
      selectedViceIds.length === 0
    ) {
      setLocalMessage(
        "Selecione os Vices presentes ou confirme que nenhum esteve presente.",
      );
      return;
    }

    moveToStep(nextStep);
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

    if (step !== 4) {
      event.preventDefault();
      advanceToStep((Math.min(step + 1, 4) as ReportStep));
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
      return;
    }

    if (!submissionConfirmed) {
      event.preventDefault();
      setLocalMessage(
        "Confirme que você revisou as informações antes de enviar a Ficha.",
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
      className="mt-7 space-y-6"
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

      <ReportStepper
        currentStep={step}
        disabled={pending}
        onStepChange={moveToStep}
      />

      {state.message || localMessage ? (
        <Alert tone="danger" aria-live="polite">
          {localMessage || state.message}
        </Alert>
      ) : null}

      <div className="flex flex-col gap-3 border-y border-app-border py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase text-app-secondary">
            Célula
          </p>
          <p className="mt-1 truncate font-semibold text-app-foreground">
            {cellName}
          </p>
        </div>
        <div className="flex items-center justify-between gap-3 sm:justify-end">
          <p
            aria-live="polite"
            className="flex min-w-0 items-center gap-2 text-xs text-app-secondary sm:text-sm"
          >
            <CloudCheck aria-hidden="true" className="h-4 w-4 shrink-0 text-success" />
            <span className="line-clamp-2">{draftMessage}</span>
          </p>
          <IconButton
            type="button"
            onClick={discardDraft}
            disabled={pending || !draftReady}
            aria-label="Descartar rascunho"
            title="Descartar rascunho"
            size="compact"
          >
            <Trash2 aria-hidden="true" className="h-4 w-4" />
          </IconButton>
        </div>
      </div>

      {step === 1 ? (
        <>
          <header>
            <p className="text-sm font-semibold text-theme-primary">Etapa 1 de 4</p>
            <h2 className="mt-1 text-2xl font-semibold text-app-foreground">
              Reunião
            </h2>
            <p className="mt-2 text-sm text-app-secondary">
              Data, formato e presença da liderança.
            </p>
          </header>

          <div className="grid gap-6 sm:grid-cols-2">
            <div>
              <label htmlFor="meetingOnUi" className="font-semibold text-app-foreground">
                Data da Célula
                <RequiredMark />
              </label>
              <BrazilianDateInput
                id="meetingOnUi"
                value={meetingOn}
                onChange={setMeetingOn}
                disabled={pending}
              />
            </div>

            <fieldset>
              <legend className="font-semibold text-app-foreground">
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
                    className={`flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border px-4 transition-colors ${
                      meetingFormat === value
                        ? "border-theme-primary bg-theme-primary-subtle text-theme-primary-active"
                        : "border-app-border bg-surface text-app-foreground hover:bg-surface-muted"
                    }`}
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
                      className="h-5 w-5 accent-theme-primary"
                    />
                    {label}
                  </label>
                ))}
              </div>
            </fieldset>
          </div>

          <fieldset className="border-t border-app-border pt-6">
            <legend className="font-semibold text-app-foreground">
              {leader.name} esteve presente?
              <RequiredMark />
            </legend>
            <div className="mt-2 grid grid-cols-2 gap-3 sm:max-w-sm">
              {[
                ["yes", "Sim"],
                ["no", "Não"],
              ].map(([value, label]) => (
                  <label
                    key={value}
                    className={`flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border px-4 transition-colors ${
                      leaderWasPresent === value
                        ? "border-theme-primary bg-theme-primary-subtle text-theme-primary-active"
                        : "border-app-border bg-surface text-app-foreground hover:bg-surface-muted"
                    }`}
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
                    className="h-5 w-5 accent-theme-primary"
                  />
                  {label}
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset className="border-t border-app-border pt-6">
            <legend className="font-semibold text-app-foreground">
              Vice-líderes presentes
              <RequiredMark />
            </legend>
            {viceLeaders.length > 0 ? (
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {viceLeaders.map((viceLeader) => (
                  <label
                    key={viceLeader.leadershipId}
                    className={`flex min-h-14 cursor-pointer items-center gap-3 rounded-xl border p-4 transition-colors ${
                      selectedViceIds.includes(viceLeader.leadershipId)
                        ? "border-theme-primary bg-theme-primary-subtle"
                        : "border-app-border bg-surface hover:bg-surface-muted"
                    }`}
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
                      className="h-5 w-5 shrink-0 accent-theme-primary"
                    />
                    <span className="font-medium text-app-foreground">
                      {viceLeader.name}
                    </span>
                  </label>
                ))}
              </div>
            ) : (
              <p className="mt-2 text-sm text-app-secondary">
                Esta célula não possui Vice-líderes vinculados atualmente.
              </p>
            )}
            <label className={`mt-3 flex min-h-14 cursor-pointer items-center gap-3 rounded-xl border p-4 transition-colors ${
              noViceWasPresent
                ? "border-theme-primary bg-theme-primary-subtle"
                : "border-app-border bg-surface-muted"
            }`}>
              <input
                type="checkbox"
                checked={noViceWasPresent}
                onChange={(event) => handleNoVicePresence(event.target.checked)}
                disabled={pending || viceLeaders.length === 0}
                className="h-5 w-5 shrink-0 accent-theme-primary"
              />
              <span className="font-medium text-app-foreground">
                Nenhum Vice-líder esteve presente
              </span>
            </label>
          </fieldset>

          <div className="flex justify-end border-t border-app-border pt-5">
            <Button
              type="button"
              onClick={() => advanceToStep(2)}
              disabled={pending}
              className="w-full sm:w-auto sm:min-w-52"
            >
              Continuar
              <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </Button>
          </div>
        </>
      ) : step === 2 ? (
        <>
          <header>
            <p className="text-sm font-semibold text-theme-primary">Etapa 2 de 4</p>
            <h2 className="mt-1 text-2xl font-semibold text-app-foreground">
              Participantes
            </h2>
            <p className="mt-2 text-sm text-app-secondary">
              Adicione quem participou da reunião.
            </p>
          </header>

          <section aria-labelledby="members-heading">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 id="members-heading" className="font-semibold text-app-foreground">
                  Lista de participantes
                </h3>
                <p className="mt-1 text-sm text-app-secondary">
                  {members.length === 0
                    ? "Nenhum nome adicionado."
                    : `${members.length} ${members.length === 1 ? "nome adicionado" : "nomes adicionados"}.`}
                </p>
              </div>
              {members.length > 0 ? (
                <Button
                  variant="ghost"
                  size="compact"
                  onClick={() => {
                    if (window.confirm("Remover todos os membros adicionados?")) {
                      setMembers([]);
                      closeBulkMemberInput();
                    }
                  }}
                  disabled={pending}
                  className="text-danger"
                >
                  <Trash2 aria-hidden="true" className="h-4 w-4" />
                  Excluir todos
                </Button>
              ) : null}
            </div>
            <div className="mt-5 space-y-4">
              {members.map((member, index) => (
                <MemberRow
                  key={member.key}
                  member={member}
                  index={index}
                  disabled={pending}
                  inputClassName={fieldClassName}
                  onNameChange={(name) =>
                    setMembers((current) =>
                      current.map((item) =>
                        item.key === member.key ? { ...item, name } : item,
                      ),
                    )
                  }
                  onRemove={() =>
                    setMembers((current) =>
                      current.filter((item) => item.key !== member.key),
                    )
                  }
                />
              ))}
            </div>
            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
              <Button
                variant="secondary"
                size="compact"
                onClick={() =>
                  setMembers((current) => [
                    ...current,
                    { key: newKey(), name: "" },
                  ])
                }
                disabled={pending || members.length >= 500}
                className="w-full sm:w-auto"
              >
                <Plus aria-hidden="true" className="h-4 w-4" />
                Adicionar participante
              </Button>
              <Button
                variant="ghost"
                size="compact"
                onClick={
                  bulkMembersOpen
                    ? closeBulkMemberInput
                    : openBulkMemberInput
                }
                aria-expanded={bulkMembersOpen}
                aria-controls="bulk-member-names"
                aria-label="Modo rápido: adicionar vários membros"
                disabled={pending || members.length >= 500}
                className="w-full sm:w-auto"
              >
                <Zap aria-hidden="true" className="h-4 w-4" />
                Modo rápido
              </Button>
            </div>

            {bulkMembersOpen ? (
              <div
                id="bulk-member-names"
                className="mt-5 rounded-xl border border-theme-primary-border bg-theme-primary-subtle p-4"
              >
                <label
                  htmlFor="bulk-members"
                  className="font-semibold text-theme-primary-active"
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
                    className="mt-3 rounded-xl border border-danger/20 bg-danger-soft px-4 py-3 text-sm text-danger"
                  >
                    {bulkMemberMessage}
                  </p>
                ) : null}
                <div className="mt-3 flex flex-col gap-3 sm:flex-row">
                  <Button
                    size="compact"
                    onClick={addPastedMembers}
                    disabled={pending}
                  >
                    Adicionar nomes
                  </Button>
                  <Button
                    variant="secondary"
                    size="compact"
                    onClick={closeBulkMemberInput}
                    disabled={pending}
                  >
                    Cancelar
                  </Button>
                </div>
              </div>
            ) : null}
          </section>

          <div className="flex flex-col-reverse gap-3 border-t border-app-border pt-5 sm:flex-row sm:justify-between">
            <Button
              type="button"
              variant="secondary"
              onClick={() => moveToStep(1)}
              disabled={pending}
              className="w-full sm:w-auto"
            >
              <ArrowLeft aria-hidden="true" className="h-4 w-4" />
              Voltar
            </Button>
            <Button
              type="button"
              onClick={() => advanceToStep(3)}
              disabled={pending}
              className="w-full sm:w-auto sm:min-w-52"
            >
              Continuar
              <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </Button>
          </div>
        </>
      ) : step === 3 ? (
        <>
          <header>
            <p className="text-sm font-semibold text-theme-primary">Etapa 3 de 4</p>
            <h2 className="mt-1 text-2xl font-semibold text-app-foreground">
              Convidados
            </h2>
            <p className="mt-2 text-sm text-app-secondary">
              Organize os convidados por quem os recebeu.
            </p>
          </header>

          <section aria-labelledby="guests-heading">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 id="guests-heading" className="font-semibold text-app-foreground">
                  Lista de convidados
                </h3>
                <p className="mt-1 text-sm text-app-secondary">
                  {guests.length === 0
                    ? "Nenhum convidado adicionado."
                    : `${guests.length} ${guests.length === 1 ? "convidado" : "convidados"}.`}
                </p>
              </div>
              {guests.length > 0 ? (
                <Button
                  variant="ghost"
                  size="compact"
                  onClick={() => {
                    if (
                      window.confirm("Remover todos os convidados adicionados?")
                    ) {
                      setGuestGroups([]);
                      closeBulkGuestInput();
                    }
                  }}
                  disabled={pending}
                  className="text-danger"
                >
                  <Trash2 aria-hidden="true" className="h-4 w-4" />
                  Excluir todos
                </Button>
              ) : null}
            </div>
            <div className="mt-4 space-y-4">
              {guestGroups.map((group, groupIndex) => (
                <div
                  key={group.key}
                  className="rounded-xl border border-app-border bg-surface-muted p-4 sm:p-5"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                    <div className="min-w-0 flex-1">
                      <label
                        htmlFor={`responsible-${group.key}`}
                        className="font-semibold text-app-foreground"
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
                    <IconButton
                      onClick={() => removeGuestGroup(group.key)}
                      disabled={pending}
                      aria-label={`Remover responsável ${groupIndex + 1}`}
                      title="Remover responsável"
                      className="text-danger"
                    >
                      <Trash2 aria-hidden="true" className="h-4 w-4" />
                    </IconButton>
                  </div>

                  <div className="mt-4 space-y-3">
                    {group.guests.map((guest, guestIndex) => (
                      <div
                        key={guest.key}
                        className="rounded-xl border border-app-border bg-surface p-4"
                      >
                        <label
                          htmlFor={`guest-${guest.key}`}
                          className="font-medium text-app-foreground"
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
                              className="h-5 w-5 accent-theme-primary"
                            />
                            Primeira vez
                          </label>
                          <IconButton
                            onClick={() =>
                              removeGuestFromGroup(group.key, guest.key)
                            }
                            disabled={pending}
                            aria-label={`Remover convidado ${guestIndex + 1}`}
                            title="Remover convidado"
                            size="compact"
                            className="text-danger"
                          >
                            <Trash2 aria-hidden="true" className="h-4 w-4" />
                          </IconButton>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-3 flex flex-col gap-3 sm:flex-row">
                    <Button
                      variant="secondary"
                      size="compact"
                      onClick={() => addGuestToGroup(group.key)}
                      disabled={pending || guests.length >= 500}
                      className="w-full sm:w-auto"
                    >
                      <Plus aria-hidden="true" className="h-4 w-4" />
                      Adicionar convidado
                    </Button>
                    <Button
                      variant="ghost"
                      size="compact"
                      onClick={() =>
                        bulkGuestGroupKey === group.key
                          ? closeBulkGuestInput()
                          : openBulkGuestInput(group.key)
                      }
                      aria-expanded={bulkGuestGroupKey === group.key}
                      aria-controls={`bulk-guests-${group.key}`}
                      aria-label="Modo rápido: adicionar vários convidados deste responsável"
                      disabled={pending || guests.length >= 500}
                      className="w-full sm:w-auto"
                    >
                      <Zap aria-hidden="true" className="h-4 w-4" />
                      Modo rápido
                    </Button>
                  </div>

                  {bulkGuestGroupKey === group.key ? (
                    <div
                      id={`bulk-guests-${group.key}`}
                      className="mt-4 rounded-xl border border-theme-primary-border bg-theme-primary-subtle p-4"
                    >
                      <label
                        htmlFor={`bulk-guest-names-${group.key}`}
                        className="font-semibold text-theme-primary-active"
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
                      <p className="mt-2 text-sm leading-6 text-theme-primary-active">
                        Linhas vazias serão ignoradas. Depois você poderá
                        marcar Primeira vez individualmente.
                      </p>
                      {bulkGuestMessage ? (
                        <p
                          role="alert"
                          className="mt-3 rounded-xl border border-danger/20 bg-danger-soft px-4 py-3 text-sm text-danger"
                        >
                          {bulkGuestMessage}
                        </p>
                      ) : null}
                      <div className="mt-3 flex flex-col gap-3 sm:flex-row">
                        <Button
                          size="compact"
                          onClick={() => addPastedGuests(group.key)}
                          disabled={pending}
                        >
                          Adicionar nomes
                        </Button>
                        <Button
                          variant="secondary"
                          size="compact"
                          onClick={closeBulkGuestInput}
                          disabled={pending}
                        >
                          Cancelar
                        </Button>
                      </div>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
            <Button
              variant="secondary"
              size="compact"
              onClick={addGuestGroup}
              disabled={pending || guests.length >= 500}
              className="mt-4 w-full sm:w-auto"
            >
              <Plus aria-hidden="true" className="h-4 w-4" />
              Adicionar responsável
            </Button>
          </section>

          <ReportTotals
            members={members.length}
            guests={guests.length}
            firstTimeGuests={firstTimeGuests}
            totalParticipants={totalParticipants}
          />

          <div className="flex flex-col-reverse gap-3 border-t border-app-border pt-5 sm:flex-row sm:justify-between">
            <Button
              type="button"
              variant="secondary"
              onClick={() => moveToStep(2)}
              disabled={pending}
              className="w-full sm:w-auto"
            >
              <ArrowLeft aria-hidden="true" className="h-4 w-4" />
              Voltar
            </Button>
            <Button
              type="button"
              onClick={() => advanceToStep(4)}
              disabled={pending}
              className="w-full sm:w-auto sm:min-w-52"
            >
              Continuar
              <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </Button>
          </div>
        </>
      ) : (
        <>
          <section aria-labelledby="evangelism-heading">
            <p className="text-sm font-semibold text-theme-primary">Etapa 4 de 4</p>
            <h2
              id="evangelism-heading"
              className="mt-1 text-2xl font-semibold text-app-foreground"
            >
              Evangelismo
            </h2>
            <p className="mt-2 text-sm text-app-secondary">
              Registre o resultado de cada pessoa da liderança.
            </p>

            <section
              className="mt-5 overflow-hidden rounded-2xl border border-app-border bg-surface"
              aria-label="Preenchimento do evangelismo por pessoa"
            >
              <div className="divide-y divide-app-border">
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
                      <span className="block font-semibold text-app-foreground">
                        {person.name}
                      </span>
                      <span
                        className={`inline-flex items-center gap-1.5 text-sm font-semibold ${
                          hasEvangelized
                            ? "text-success"
                            : hasNegativeStatus
                              ? "text-app-secondary"
                              : "text-warning"
                        }`}
                      >
                        {hasEvangelized ? (
                          <CheckCircle2 aria-hidden="true" className="h-4 w-4" />
                        ) : hasNegativeStatus ? (
                          <Info aria-hidden="true" className="h-4 w-4" />
                        ) : null}
                        {hasEvangelized
                          ? `Evangelizou · ${personRecords.length} ${
                              personRecords.length === 1
                                ? "registro"
                                : "registros"
                            }`
                          : hasNegativeStatus
                            ? "Não evangelizou"
                            : "Pendente"}
                      </span>
                    </div>

                    {hasEvangelized ? (
                      <>
                        {sharedRecordOwner ? (
                          <p className="mt-3 text-sm text-success">
                            Participou de evangelismo registrado com {" "}
                            {sharedRecordOwner.name}.
                          </p>
                        ) : null}
                        <button
                          type="button"
                          onClick={() => addEvangelismRecord(person.leadershipId)}
                          disabled={pending}
                          className="mt-4 min-h-11 w-full rounded-xl border border-app-border bg-surface px-4 font-semibold text-app-foreground hover:bg-surface-muted sm:w-auto"
                        >
                          + Registrar outro
                        </button>
                      </>
                    ) : hasNegativeStatus ? (
                      isNegativeCommentOpen ? (
                        <div className="mt-4 rounded-xl bg-surface-muted p-4">
                          <label
                            htmlFor={`not-evangelized-${person.leadershipId}`}
                            className="font-medium text-app-foreground"
                          >
                            Comentários
                            <RequiredMark />
                          </label>
                          <p className="mt-1 text-sm text-app-secondary">
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
                              className="min-h-11 rounded-xl bg-theme-primary px-4 font-semibold text-white hover:bg-theme-primary-hover"
                            >
                              Concluir comentário
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                addEvangelismRecord(person.leadershipId)
                              }
                              disabled={pending}
                              className="min-h-11 rounded-xl border border-app-border bg-surface px-4 font-semibold text-app-foreground hover:bg-surface-muted"
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
                            className="min-h-11 rounded-xl border border-app-border bg-surface px-4 font-semibold text-app-foreground hover:bg-surface-muted"
                          >
                            Editar comentário
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              addEvangelismRecord(person.leadershipId)
                            }
                            disabled={pending}
                            className="min-h-11 rounded-xl bg-theme-primary px-4 font-semibold text-white hover:bg-theme-primary-hover"
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
                            className="min-h-11 rounded-xl border border-app-border bg-surface px-4 font-semibold text-app-foreground hover:bg-surface-muted"
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
                          className="min-h-11 rounded-xl bg-theme-primary px-4 font-semibold text-white hover:bg-theme-primary-hover"
                        >
                          Registrar evangelismo
                        </button>
                        <button
                          type="button"
                          onClick={() => markNotEvangelized(person.leadershipId)}
                          disabled={pending}
                          className="min-h-11 rounded-xl border border-app-border bg-surface px-4 font-semibold text-app-foreground hover:bg-surface-muted"
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
                  className="text-xl font-semibold text-app-foreground"
                >
                  Evangelismos preenchidos
                </h3>

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
                        className="overflow-hidden rounded-2xl border border-app-border bg-surface"
                      >
                        <button
                          type="button"
                          onClick={() =>
                            setOpenEvangelismRecordKey(isOpen ? null : record.key)
                          }
                          aria-expanded={isOpen}
                          aria-controls={`evangelism-record-${record.key}`}
                          className="flex min-h-16 w-full flex-col gap-2 px-5 py-4 text-left hover:bg-surface-muted sm:flex-row sm:items-center sm:justify-between"
                        >
                          <span>
                            <span className="block font-semibold text-app-foreground">
                              {primaryPerson?.name ||
                                `Evangelismo ${recordIndex + 1}`}
                            </span>
                            <span className="mt-1 block text-sm text-app-secondary">
                              {companionNames.length > 0
                                ? `Com ${companionNames.join(", ")}`
                                : "Sem outro Líder/Vice"}
                            </span>
                          </span>
                          <span
                            className={`text-sm font-semibold ${
                              error ? "text-warning" : "text-success"
                            }`}
                          >
                            {error ? "Pendente" : "Pronto"}
                          </span>
                        </button>

                        {isOpen ? (
                          <div
                            id={`evangelism-record-${record.key}`}
                            className="space-y-6 border-t border-app-border bg-surface-muted p-5"
                          >
                            <div>
                              <p className="font-semibold text-app-foreground">
                                Quem está registrando
                              </p>
                              <div className="mt-2 flex min-h-12 cursor-default items-center justify-between gap-3 rounded-xl border border-app-border bg-surface-muted px-4 py-3 text-app-secondary">
                                <span className="font-medium">
                                  {primaryPerson?.name || "Liderança"}
                                </span>
                                <span className="rounded-full bg-surface px-2.5 py-1 text-xs font-semibold text-app-secondary">
                                  Automático
                                </span>
                              </div>
                            </div>

                            <fieldset>
                              <legend className="font-semibold text-app-foreground">
                                Quem evangelizou junto?
                              </legend>
                              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                                {leadership
                                  .filter(
                                    (person) =>
                                      person.leadershipId !==
                                      record.primaryLeadershipId,
                                  )
                                  .map((person) => {
                                    const isMarkedNotEvangelized =
                                      Object.prototype.hasOwnProperty.call(
                                        notEvangelized,
                                        person.leadershipId,
                                      );

                                    return (
                                      <label
                                        key={person.leadershipId}
                                        className={`flex min-h-14 items-center gap-3 rounded-xl border border-app-border p-4 ${
                                          isMarkedNotEvangelized
                                            ? "cursor-not-allowed bg-surface-muted"
                                            : "cursor-pointer bg-surface"
                                        }`}
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
                                          disabled={
                                            pending || isMarkedNotEvangelized
                                          }
                                          className="h-5 w-5 shrink-0 accent-theme-primary disabled:cursor-not-allowed"
                                        />
                                        <span>
                                          <span
                                            className={`block font-medium ${
                                              isMarkedNotEvangelized
                                                ? "text-app-secondary"
                                                : "text-app-foreground"
                                            }`}
                                          >
                                            {person.name}
                                          </span>
                                          <span className="mt-1 block text-xs text-app-secondary">
                                            {isMarkedNotEvangelized
                                              ? "Marcado como Não evangelizou"
                                              : person.role === "leader"
                                                ? "Líder"
                                                : "Vice-líder"}
                                          </span>
                                        </span>
                                      </label>
                                    );
                                  })}
                              </div>
                            </fieldset>

                            <div className="grid gap-5 sm:grid-cols-2">
                              <div>
                                <label
                                  htmlFor={`evangelism-date-${record.key}`}
                                  className="font-semibold text-app-foreground"
                                >
                                  Data
                                  <RequiredMark />
                                </label>
                                <BrazilianDateInput
                                  id={`evangelism-date-${record.key}`}
                                  value={record.evangelismOn}
                                  onChange={(value) =>
                                    updateEvangelismRecord(record.key, (current) => ({
                                      ...current,
                                      evangelismOn: value,
                                    }))
                                  }
                                  disabled={pending}
                                />
                              </div>
                              <div>
                                <label
                                  htmlFor={`duration-${record.key}`}
                                  className="font-semibold text-app-foreground"
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
                                  placeholder="Ex.: 30 minutos ou 2h"
                                  required
                                  maxLength={60}
                                  disabled={pending}
                                  className={fieldClassName}
                                />
                                <p className="mt-2 text-sm leading-5 text-app-secondary">
                                  Informe quanto tempo foi dedicado exclusivamente a
                                  essa missão.
                                </p>
                              </div>
                            </div>

                            <section aria-labelledby={`participants-${record.key}`}>
                              <div>
                                <h4
                                  id={`participants-${record.key}`}
                                  className="font-semibold text-app-foreground"
                                >
                                  Integrantes
                                </h4>
                              </div>
                              <div className="mt-3 space-y-3">
                                {record.participants.map((participant, index) => (
                                  <div
                                    key={participant.key}
                                    className="grid gap-3 rounded-xl border border-app-border bg-surface p-4 sm:grid-cols-[1fr_auto] sm:items-end"
                                  >
                                    <div>
                                      <label
                                        htmlFor={`participant-${record.key}-${participant.key}`}
                                        className="font-medium text-app-foreground"
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
                                    <IconButton
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
                                      aria-label={`Remover integrante ${index + 1}`}
                                      title="Remover integrante"
                                      className="text-danger"
                                    >
                                      <Trash2 aria-hidden="true" className="h-4 w-4" />
                                    </IconButton>
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
                                className="mt-3 min-h-11 w-full rounded-xl border border-app-border bg-surface px-4 font-semibold text-app-foreground hover:bg-surface-muted sm:w-auto"
                              >
                                + Adicionar outro integrante
                              </button>
                            </section>

                            <div>
                              <label
                                htmlFor={`comments-${record.key}`}
                                className="font-semibold text-app-foreground"
                              >
                                Comentários
                                <RequiredMark />
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
                              <Button
                                variant="ghost"
                                size="compact"
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
                                className="text-danger"
                              >
                                <Trash2 aria-hidden="true" className="h-4 w-4" />
                                Remover registro
                              </Button>
                              <Button
                                size="compact"
                                onClick={() => finishEvangelismRecord(record.key)}
                                disabled={pending}
                              >
                                Salvar evangelismo
                              </Button>
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

          <section className="rounded-xl border border-warning/20 bg-warning-soft p-4">
            <h3 className="flex items-center gap-2 font-semibold text-warning">
              <Info aria-hidden="true" className="h-5 w-5 shrink-0" />
              Revise antes de enviar
            </h3>
            <p className="mt-2 text-sm leading-6 text-app-secondary">
              Confira a data, as presenças e o Relatório de Evangelismo.
            </p>
            <label className="mt-3 flex cursor-pointer items-start gap-3 rounded-xl border border-warning/20 bg-surface p-4">
              <input
                type="checkbox"
                checked={submissionConfirmed}
                onChange={(event) =>
                  setSubmissionConfirmed(event.target.checked)
                }
                required
                disabled={pending}
                className="mt-0.5 h-5 w-5 shrink-0 accent-theme-primary"
              />
              <span className="font-medium text-app-foreground">
                Revisei as informações e confirmo o envio.
                <RequiredMark />
              </span>
            </label>
          </section>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button
              type="button"
              variant="secondary"
              onClick={() => moveToStep(3)}
              disabled={pending}
              className="w-full sm:w-auto sm:min-w-40"
            >
              <ArrowLeft aria-hidden="true" className="h-4 w-4" />
              Voltar
            </Button>
            <Button
              type="submit"
              disabled={pending}
              className="w-full sm:w-auto sm:min-w-56"
            >
              {pending ? (
                <LoaderCircle aria-hidden="true" className="h-4 w-4 animate-spin" />
              ) : (
                <Send aria-hidden="true" className="h-4 w-4" />
              )}
              {pending ? "Enviando..." : "Enviar ficha"}
            </Button>
          </div>
        </>
      )}
    </form>
  );
}
