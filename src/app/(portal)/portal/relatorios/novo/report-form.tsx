"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import type { CellReportLeadershipOption } from "@/lib/data/cell-reports";
import { submitCellReport, type SubmitCellReportState } from "./actions";

const initialState: SubmitCellReportState = { message: "" };

type ManualName = {
  key: number;
  name: string;
};

type Guest = {
  key: number;
  name: string;
  responsibleName: string;
  isFirstTime: boolean;
};

type EvangelismDraft = {
  didEvangelize: "" | "yes" | "no";
  evangelismOn: string;
  durationText: string;
  comments: string;
  participants: ManualName[];
};

type ReportFormProps = {
  cellId: string;
  cellName: string;
  defaultDate: string;
  draftKey: string;
  leader: CellReportLeadershipOption;
  viceLeaders: CellReportLeadershipOption[];
  leadership: CellReportLeadershipOption[];
};

type StoredReportDraft = {
  version: 1;
  savedAt: string;
  meetingOn: string;
  meetingFormat: "in_person" | "online";
  leaderWasPresent: "yes" | "no";
  selectedViceIds: string[];
  noViceWasPresent: boolean;
  members: ManualName[];
  guests: Guest[];
  evangelism: Record<string, EvangelismDraft>;
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

function createInitialEvangelism(leadership: CellReportLeadershipOption[]) {
  return Object.fromEntries(
    leadership.map((person) => [
      person.leadershipId,
      {
        didEvangelize: "",
        evangelismOn: "",
        durationText: "",
        comments: "",
        participants: [],
      } satisfies EvangelismDraft,
    ]),
  ) as Record<string, EvangelismDraft>;
}

function getEvangelismError(draft: EvangelismDraft) {
  if (draft.didEvangelize === "") {
    return "Informe se a pessoa evangelizou nesta semana.";
  }

  if (draft.didEvangelize === "yes") {
    if (!draft.evangelismOn) {
      return "Informe a Data do Evangelismo.";
    }

    if (!draft.durationText.trim()) {
      return "Informe o Tempo de Evangelismo.";
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
  }

  if (!draft.comments.trim()) {
    return draft.didEvangelize === "no"
      ? "Informe o motivo no campo Comentários."
      : "Preencha os Comentários.";
  }

  return "";
}

export function ReportForm({
  cellId,
  cellName,
  defaultDate,
  draftKey,
  leader,
  viceLeaders,
  leadership,
}: ReportFormProps) {
  const [state, formAction, pending] = useActionState(
    submitCellReport,
    initialState,
  );
  const formRef = useRef<HTMLFormElement>(null);
  const nextLocalKey = useRef(0);
  const [step, setStep] = useState<1 | 2>(1);
  const [localMessage, setLocalMessage] = useState("");
  const [draftReady, setDraftReady] = useState(false);
  const [draftMessage, setDraftMessage] = useState(
    "Preparando o rascunho automático...",
  );
  const [meetingOn, setMeetingOn] = useState(defaultDate);
  const [meetingFormat, setMeetingFormat] = useState<"in_person" | "online">(
    "in_person",
  );
  const [leaderWasPresent, setLeaderWasPresent] = useState<"yes" | "no">(
    "yes",
  );
  const [selectedViceIds, setSelectedViceIds] = useState<string[]>([]);
  const [noViceWasPresent, setNoViceWasPresent] = useState(
    viceLeaders.length === 0,
  );
  const [members, setMembers] = useState<ManualName[]>([]);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [evangelism, setEvangelism] = useState(() =>
    createInitialEvangelism(leadership),
  );
  const [openLeadershipId, setOpenLeadershipId] = useState(
    leadership[0]?.leadershipId ?? "",
  );

  useEffect(() => {
    const restoreTimeoutId = window.setTimeout(() => {
      try {
        const storedValue = window.localStorage.getItem(draftKey);

        if (!storedValue) {
          setDraftMessage("Rascunho salvo automaticamente neste aparelho.");
          setDraftReady(true);
          return;
        }

        const parsed: unknown = JSON.parse(storedValue);

        if (!parsed || typeof parsed !== "object" || !("version" in parsed)) {
          throw new Error("invalid-draft");
        }

        const draft = parsed as Partial<StoredReportDraft>;

        if (draft.version !== 1) {
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
        const restoredGuests = Array.isArray(draft.guests)
          ? draft.guests
              .slice(0, 500)
              .filter(
                (item): item is Guest =>
                  Boolean(item) &&
                  typeof item.key === "number" &&
                  typeof item.name === "string" &&
                  typeof item.responsibleName === "string" &&
                  typeof item.isFirstTime === "boolean",
              )
          : [];
        setMembers(restoredMembers);
        setGuests(restoredGuests);

        const restoredEvangelism = createInitialEvangelism(leadership);

        if (
          draft.evangelism &&
          typeof draft.evangelism === "object" &&
          !Array.isArray(draft.evangelism)
        ) {
          for (const person of leadership) {
            const storedEntry = draft.evangelism[person.leadershipId];

            if (!storedEntry || typeof storedEntry !== "object") {
              continue;
            }

            const didEvangelize =
              storedEntry.didEvangelize === "yes" ||
              storedEntry.didEvangelize === "no"
                ? storedEntry.didEvangelize
                : "";
            const participants = Array.isArray(storedEntry.participants)
              ? storedEntry.participants
                  .slice(0, 100)
                  .filter(
                    (item): item is ManualName =>
                      Boolean(item) &&
                      typeof item.key === "number" &&
                      typeof item.name === "string",
                  )
              : [];

            restoredEvangelism[person.leadershipId] = {
              didEvangelize,
              evangelismOn:
                didEvangelize === "yes" &&
                typeof storedEntry.evangelismOn === "string"
                  ? storedEntry.evangelismOn
                  : "",
              durationText:
                didEvangelize === "yes" &&
                typeof storedEntry.durationText === "string"
                  ? storedEntry.durationText
                  : "",
              comments:
                typeof storedEntry.comments === "string"
                  ? storedEntry.comments
                  : "",
              participants: didEvangelize === "yes" ? participants : [],
            };
          }
        }

        setEvangelism(restoredEvangelism);
        setStep(draft.step === 2 ? 2 : 1);

        const restoredKeys = [
          ...restoredMembers.map((item) => item.key),
          ...restoredGuests.map((item) => item.key),
          ...Object.values(restoredEvangelism).flatMap((entry) =>
            entry.participants.map((item) => item.key),
          ),
        ];
        nextLocalKey.current = Math.max(0, ...restoredKeys);
        setDraftMessage("Rascunho recuperado deste aparelho.");
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
  }, [draftKey, leadership, viceLeaders]);

  useEffect(() => {
    if (!draftReady) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      const draft: StoredReportDraft = {
        version: 1,
        savedAt: new Date().toISOString(),
        meetingOn,
        meetingFormat,
        leaderWasPresent,
        selectedViceIds,
        noViceWasPresent,
        members,
        guests,
        evangelism,
        step,
      };

      try {
        window.localStorage.setItem(draftKey, JSON.stringify(draft));
        setDraftMessage("Rascunho salvo automaticamente neste aparelho.");
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
    evangelism,
    guests,
    leaderWasPresent,
    meetingFormat,
    meetingOn,
    members,
    noViceWasPresent,
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

    nextLocalKey.current = 0;
    setMeetingOn(defaultDate);
    setMeetingFormat("in_person");
    setLeaderWasPresent("yes");
    setSelectedViceIds([]);
    setNoViceWasPresent(viceLeaders.length === 0);
    setMembers([]);
    setGuests([]);
    setEvangelism(createInitialEvangelism(leadership));
    setStep(1);
    setOpenLeadershipId(leadership[0]?.leadershipId ?? "");
    setLocalMessage("");
    setDraftMessage("Rascunho descartado. Um novo rascunho vazio será salvo.");
  }

  function updateEvangelism(
    leadershipId: string,
    updater: (current: EvangelismDraft) => EvangelismDraft,
  ) {
    setEvangelism((current) => ({
      ...current,
      [leadershipId]: updater(current[leadershipId]),
    }));
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
    setOpenLeadershipId(
      leadership.find((person) =>
        Boolean(getEvangelismError(evangelism[person.leadershipId])),
      )?.leadershipId ?? leadership[0]?.leadershipId ?? "",
    );
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function finishPerson(leadershipId: string) {
    const error = getEvangelismError(evangelism[leadershipId]);

    if (error) {
      setLocalMessage(error);
      return;
    }

    setLocalMessage("");
    const currentIndex = leadership.findIndex(
      (person) => person.leadershipId === leadershipId,
    );
    const nextPending = leadership
      .slice(currentIndex + 1)
      .find((person) =>
        Boolean(getEvangelismError(evangelism[person.leadershipId])),
      );
    setOpenLeadershipId(nextPending?.leadershipId ?? "");
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    setLocalMessage("");

    if (step !== 2) {
      event.preventDefault();
      advanceToEvangelism();
      return;
    }

    const firstIncomplete = leadership.find((person) =>
      Boolean(getEvangelismError(evangelism[person.leadershipId])),
    );

    if (firstIncomplete) {
      event.preventDefault();
      setOpenLeadershipId(firstIncomplete.leadershipId);
      setLocalMessage(getEvangelismError(evangelism[firstIncomplete.leadershipId]));
    }
  }

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
  const serializedEvangelism = leadership.map((person) => {
    const draft = evangelism[person.leadershipId];
    return {
      leadershipId: person.leadershipId,
      didEvangelize: draft.didEvangelize === "yes",
      evangelismOn: draft.didEvangelize === "yes" ? draft.evangelismOn : "",
      durationText:
        draft.didEvangelize === "yes" ? draft.durationText.trim() : "",
      comments: draft.comments.trim(),
      participants:
        draft.didEvangelize === "yes"
          ? draft.participants.map(({ name }) => ({ name }))
          : [],
    };
  });

  return (
    <form
      ref={formRef}
      action={formAction}
      onSubmit={handleSubmit}
      className="mt-8 space-y-7"
    >
      <input type="hidden" name="cellId" value={cellId} />
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

      <div className="flex flex-col gap-3 rounded-2xl border border-blue-200 bg-blue-50 px-5 py-4 text-left sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-semibold text-blue-950">Rascunho automático</p>
          <p aria-live="polite" className="mt-1 text-sm text-blue-900">
            {draftMessage}
          </p>
          <p className="mt-1 text-xs text-blue-800">
            A recuperação funciona neste navegador e neste aparelho.
          </p>
        </div>
        <button
          type="button"
          onClick={discardDraft}
          disabled={pending || !draftReady}
          className="min-h-11 shrink-0 rounded-xl border border-blue-300 bg-white px-4 font-semibold text-blue-950 hover:bg-blue-100 disabled:opacity-60"
        >
          Descartar rascunho
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
                disabled={pending}
                className={fieldClassName}
              />
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
            <div>
              <h2 id="members-heading" className="font-semibold text-zinc-950">
                Membros presentes
              </h2>
              <p className="mt-1 text-sm text-zinc-600">
                Deixe vazio se nenhum membro esteve presente.
              </p>
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
            <button
              type="button"
              onClick={() =>
                setMembers((current) => [
                  ...current,
                  { key: newKey(), name: "" },
                ])
              }
              disabled={pending || members.length >= 500}
              className="mt-3 min-h-11 w-full rounded-xl border border-zinc-300 bg-white px-4 font-semibold text-zinc-900 hover:bg-zinc-100 sm:w-auto"
            >
              + Adicionar membro
            </button>
          </section>

          <section aria-labelledby="guests-heading">
            <div>
              <h2 id="guests-heading" className="font-semibold text-zinc-950">
                Convidados
              </h2>
              <p className="mt-1 text-sm text-zinc-600">
                Deixe vazio se não houve convidados.
              </p>
            </div>
            <div className="mt-4 space-y-3">
              {guests.map((guest, index) => (
                <div
                  key={guest.key}
                  className="rounded-2xl border border-zinc-200 p-4"
                >
                  <p className="font-semibold text-zinc-950">
                    Convidado {index + 1}
                  </p>
                  <div className="mt-3 grid gap-4 sm:grid-cols-2">
                    <div>
                      <label
                        htmlFor={`guest-${guest.key}`}
                        className="font-medium text-zinc-900"
                      >
                        Nome do convidado
                        <RequiredMark />
                      </label>
                      <input
                        id={`guest-${guest.key}`}
                        type="text"
                        value={guest.name}
                        onChange={(event) =>
                          setGuests((current) =>
                            current.map((item) =>
                              item.key === guest.key
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
                    <div>
                      <label
                        htmlFor={`responsible-${guest.key}`}
                        className="font-medium text-zinc-900"
                      >
                        Responsável
                        <RequiredMark />
                      </label>
                      <input
                        id={`responsible-${guest.key}`}
                        type="text"
                        value={guest.responsibleName}
                        onChange={(event) =>
                          setGuests((current) =>
                            current.map((item) =>
                              item.key === guest.key
                                ? {
                                    ...item,
                                    responsibleName: event.target.value,
                                  }
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
                  </div>
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                    <label className="flex min-h-11 cursor-pointer items-center gap-3">
                      <input
                        type="checkbox"
                        checked={guest.isFirstTime}
                        onChange={(event) =>
                          setGuests((current) =>
                            current.map((item) =>
                              item.key === guest.key
                                ? { ...item, isFirstTime: event.target.checked }
                                : item,
                            ),
                          )
                        }
                        disabled={pending}
                        className="h-5 w-5 accent-zinc-950"
                      />
                      Primeira vez
                    </label>
                    <button
                      type="button"
                      onClick={() =>
                        setGuests((current) =>
                          current.filter((item) => item.key !== guest.key),
                        )
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
            <button
              type="button"
              onClick={() =>
                setGuests((current) => [
                  ...current,
                  {
                    key: newKey(),
                    name: "",
                    responsibleName: "",
                    isFirstTime: false,
                  },
                ])
              }
              disabled={pending || guests.length >= 500}
              className="mt-3 min-h-11 w-full rounded-xl border border-zinc-300 bg-white px-4 font-semibold text-zinc-900 hover:bg-zinc-100 sm:w-auto"
            >
              + Adicionar convidado
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
              Preencha um registro para o Líder e para cada Vice-líder. Somente
              um card fica aberto por vez.
            </p>

            <div className="mt-5 space-y-3">
              {leadership.map((person) => {
                const draft = evangelism[person.leadershipId];
                const isOpen = openLeadershipId === person.leadershipId;
                const error = getEvangelismError(draft);
                const status = error
                  ? "Pendente"
                  : draft.didEvangelize === "yes"
                    ? "✓ Evangelizou"
                    : "○ Não evangelizou";

                return (
                  <article
                    key={person.leadershipId}
                    className="overflow-hidden rounded-2xl border border-zinc-300 bg-white"
                  >
                    <button
                      type="button"
                      onClick={() => setOpenLeadershipId(isOpen ? "" : person.leadershipId)}
                      aria-expanded={isOpen}
                      aria-controls={`evangelism-${person.leadershipId}`}
                      className="flex min-h-16 w-full items-center justify-between gap-4 px-5 py-4 text-left hover:bg-zinc-50"
                    >
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
                          error ? "text-amber-800" : "text-emerald-800"
                        }`}
                      >
                        {status}
                      </span>
                    </button>

                    {isOpen ? (
                      <div
                        id={`evangelism-${person.leadershipId}`}
                        className="space-y-5 border-t border-zinc-200 bg-zinc-50 p-5"
                      >
                        <fieldset>
                          <legend className="font-semibold text-zinc-950">
                            Evangelizou esta semana?
                            <RequiredMark />
                          </legend>
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
                                  name={`didEvangelize-${person.leadershipId}`}
                                  value={value}
                                  checked={draft.didEvangelize === value}
                                  onChange={() =>
                                    updateEvangelism(person.leadershipId, (current) => ({
                                      ...current,
                                      didEvangelize: value as "yes" | "no",
                                      evangelismOn:
                                        value === "yes" ? current.evangelismOn : "",
                                      durationText:
                                        value === "yes" ? current.durationText : "",
                                      participants:
                                        value === "yes" ? current.participants : [],
                                    }))
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

                        {draft.didEvangelize === "yes" ? (
                          <>
                            <div className="grid gap-5 sm:grid-cols-2">
                              <div>
                                <label
                                  htmlFor={`evangelism-date-${person.leadershipId}`}
                                  className="font-semibold text-zinc-950"
                                >
                                  Data do Evangelismo
                                  <RequiredMark />
                                </label>
                                <input
                                  id={`evangelism-date-${person.leadershipId}`}
                                  type="date"
                                  value={draft.evangelismOn}
                                  onChange={(event) =>
                                    updateEvangelism(person.leadershipId, (current) => ({
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
                                  htmlFor={`duration-${person.leadershipId}`}
                                  className="font-semibold text-zinc-950"
                                >
                                  Tempo de Evangelismo
                                  <RequiredMark />
                                </label>
                                <input
                                  id={`duration-${person.leadershipId}`}
                                  type="text"
                                  value={draft.durationText}
                                  onChange={(event) =>
                                    updateEvangelism(person.leadershipId, (current) => ({
                                      ...current,
                                      durationText: event.target.value,
                                    }))
                                  }
                                  placeholder="Ex.: 30 minutos ou 1h"
                                  required
                                  maxLength={60}
                                  disabled={pending}
                                  className={fieldClassName}
                                />
                              </div>
                            </div>

                            <section
                              aria-labelledby={`participants-${person.leadershipId}`}
                            >
                              <div className="flex flex-wrap items-center justify-between gap-3">
                                <div>
                                  <h3
                                    id={`participants-${person.leadershipId}`}
                                    className="font-semibold text-zinc-950"
                                  >
                                    Integrantes
                                  </h3>
                                  <p className="mt-1 text-sm text-zinc-600">
                                    Deixe vazio se a pessoa evangelizou sozinha.
                                  </p>
                                </div>
                                <button
                                  type="button"
                                  onClick={() =>
                                    updateEvangelism(
                                      person.leadershipId,
                                      (current) => ({
                                        ...current,
                                        participants: [
                                          ...current.participants,
                                          { key: newKey(), name: "" },
                                        ],
                                      }),
                                    )
                                  }
                                  disabled={pending || draft.participants.length >= 100}
                                  className="min-h-11 rounded-xl border border-zinc-300 bg-white px-4 font-semibold text-zinc-900 hover:bg-zinc-100"
                                >
                                  + Adicionar integrante
                                </button>
                              </div>
                              <div className="mt-3 space-y-3">
                                {draft.participants.map((participant, index) => (
                                  <div
                                    key={participant.key}
                                    className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end"
                                  >
                                    <div>
                                      <label
                                        htmlFor={`participant-${person.leadershipId}-${participant.key}`}
                                        className="font-medium text-zinc-900"
                                      >
                                        Nome do integrante {index + 1}
                                        <RequiredMark />
                                      </label>
                                      <input
                                        id={`participant-${person.leadershipId}-${participant.key}`}
                                        type="text"
                                        value={participant.name}
                                        onChange={(event) =>
                                          updateEvangelism(
                                            person.leadershipId,
                                            (current) => ({
                                              ...current,
                                              participants: current.participants.map(
                                                (item) =>
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
                                        updateEvangelism(
                                          person.leadershipId,
                                          (current) => ({
                                            ...current,
                                            participants: current.participants.filter(
                                              (item) => item.key !== participant.key,
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
                            </section>
                          </>
                        ) : null}

                        {draft.didEvangelize ? (
                          <div>
                            <label
                              htmlFor={`comments-${person.leadershipId}`}
                              className="font-semibold text-zinc-950"
                            >
                              Comentários
                              <RequiredMark />
                              <span className="mt-1 block text-sm font-normal text-zinc-600">
                                {draft.didEvangelize === "no"
                                  ? "Informe o motivo pelo qual não evangelizou."
                                  : "Inclua observações e outras evangelizações da semana, se houver."}
                              </span>
                            </label>
                            <textarea
                              id={`comments-${person.leadershipId}`}
                              rows={4}
                              value={draft.comments}
                              onChange={(event) =>
                                updateEvangelism(person.leadershipId, (current) => ({
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
                        ) : null}

                        <button
                          type="button"
                          onClick={() => finishPerson(person.leadershipId)}
                          disabled={pending}
                          className="min-h-11 rounded-xl bg-zinc-950 px-5 font-semibold text-white hover:bg-zinc-800"
                        >
                          Concluir este registro
                        </button>
                      </div>
                    ) : null}
                  </article>
                );
              })}
            </div>
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
