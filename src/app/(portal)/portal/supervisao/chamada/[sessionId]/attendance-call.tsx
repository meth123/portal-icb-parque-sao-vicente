"use client";

import { Check, Search, X } from "lucide-react";
import { useActionState, useEffect, useRef, useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { controlClassName } from "@/components/ui/control-styles";
import type { SupervisionAttendancePerson } from "@/lib/data/supervision-attendance";
import { classNames } from "@/lib/ui/class-names";
import {
  finalizeSupervisionAttendance,
  saveSupervisionAttendanceDraft,
  type SupervisionAttendanceActionState,
} from "../actions";

type AttendanceFilter = "all" | "present" | "unmarked";

const initialState: SupervisionAttendanceActionState = {
  message: "",
  success: false,
};

function normalizedSearch(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR");
}

export function AttendanceCall({
  sessionId,
  people,
}: {
  sessionId: string;
  people: SupervisionAttendancePerson[];
}) {
  const [selected, setSelected] = useState(
    () => new Set(people.filter((person) => person.present).map((person) => person.profileId)),
  );
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<AttendanceFilter>("all");
  const [confirming, setConfirming] = useState(false);
  const [queuedSaves, setQueuedSaves] = useState(0);
  const [saveError, setSaveError] = useState("");
  const saveQueue = useRef<Promise<void>>(Promise.resolve());
  const [actionState, action, pending] = useActionState(
    finalizeSupervisionAttendance,
    initialState,
  );

  const present = selected.size;
  const total = people.length;
  const unmarked = total - present;
  const percentage = total === 0 ? 0 : Math.round((present * 100) / total);
  const normalizedQuery = normalizedSearch(query.trim());
  const visiblePeople = people.filter((person) => {
    const matchesSearch = normalizedSearch(person.fullName).includes(normalizedQuery);
    const isPresent = selected.has(person.profileId);
    const matchesFilter =
      filter === "all" ||
      (filter === "present" && isPresent) ||
      (filter === "unmarked" && !isPresent);
    return matchesSearch && matchesFilter;
  });

  useEffect(() => {
    if (!confirming) return;
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setConfirming(false);
    }
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [confirming]);

  function queueSave(nextSelected: Set<string>) {
    const ids = [...nextSelected];
    setQueuedSaves((current) => current + 1);
    setSaveError("");
    saveQueue.current = saveQueue.current
      .then(async () => {
        const result = await saveSupervisionAttendanceDraft(sessionId, ids);
        if (!result.success) setSaveError(result.message);
      })
      .catch(() => setSaveError("Não foi possível salvar a última marcação."))
      .finally(() => setQueuedSaves((current) => Math.max(0, current - 1)));
  }

  function togglePerson(profileId: string) {
    const nextSelected = new Set(selected);
    if (nextSelected.has(profileId)) nextSelected.delete(profileId);
    else nextSelected.add(profileId);
    setSelected(nextSelected);
    queueSave(nextSelected);
  }

  return (
    <>
      <section aria-labelledby="attendance-call-heading" className="pb-28">
        <div className="sticky top-[calc(4rem+env(safe-area-inset-top))] z-20 -mx-4 border-y border-app-border bg-app-background/95 px-4 py-4 backdrop-blur sm:static sm:mx-0 sm:rounded-2xl sm:border sm:bg-surface sm:p-5">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p id="attendance-call-heading" className="text-2xl font-semibold text-app-foreground">
                {present} / {total} presentes
              </p>
              <p className="mt-1 text-sm text-app-secondary">
                {percentage}% de presença
                {queuedSaves > 0 ? " · Salvando..." : " · Salvo"}
              </p>
            </div>
            <span className="text-sm font-semibold text-app-secondary">
              {unmarked} não {unmarked === 1 ? "marcado" : "marcados"}
            </span>
          </div>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-surface-muted" aria-hidden="true">
            <div
              className="h-full rounded-full bg-success transition-[width] duration-200 ease-out motion-reduce:transition-none"
              style={{ width: `${percentage}%` }}
            />
          </div>
        </div>

        {saveError ? <Alert tone="danger" className="mt-4">{saveError}</Alert> : null}
        {actionState.message ? <Alert tone="danger" className="mt-4">{actionState.message}</Alert> : null}

        <div className="mt-5 space-y-3">
          <label className="relative block">
            <span className="sr-only">Buscar por nome</span>
            <Search aria-hidden="true" className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-app-secondary" />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar por nome"
              className={`${controlClassName} pl-12`}
            />
          </label>

          <div className="flex gap-2 overflow-x-auto pb-1" role="group" aria-label="Filtrar lista">
            {([
              ["all", "Todos", total],
              ["present", "Presentes", present],
              ["unmarked", "Não marcados", unmarked],
            ] as const).map(([value, label, count]) => (
              <button
                key={value}
                type="button"
                aria-pressed={filter === value}
                onClick={() => setFilter(value)}
                className={classNames(
                  "min-h-11 shrink-0 rounded-full border px-4 text-sm font-semibold transition-[background-color,border-color,color,transform] duration-150 active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus motion-reduce:transform-none",
                  filter === value
                    ? "border-theme-primary bg-theme-primary text-theme-primary-foreground"
                    : "border-app-border bg-surface text-app-secondary hover:border-theme-primary-border",
                )}
              >
                {label} · {count}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4 space-y-2">
          {visiblePeople.map((person) => {
            const isPresent = selected.has(person.profileId);
            return (
              <button
                key={person.profileId}
                type="button"
                aria-pressed={isPresent}
                onClick={() => togglePerson(person.profileId)}
                className={classNames(
                  "flex min-h-[4.25rem] w-full items-center gap-4 rounded-2xl border px-4 py-3 text-left shadow-[var(--shadow-subtle)] transition-[background-color,border-color,box-shadow,transform] duration-150 ease-out active:scale-[0.985] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus motion-reduce:transform-none sm:px-5",
                  isPresent
                    ? "border-success/30 bg-success-soft shadow-none"
                    : "border-app-border bg-surface hover:border-theme-primary-border",
                )}
              >
                <span
                  className={classNames(
                    "flex size-8 shrink-0 items-center justify-center rounded-full border-2 transition-[background-color,border-color,color,transform] duration-150",
                    isPresent
                      ? "scale-105 border-success bg-success text-white"
                      : "border-app-border bg-surface text-transparent",
                  )}
                >
                  <Check aria-hidden="true" className="size-5" strokeWidth={3} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-base font-semibold text-app-foreground sm:text-lg">
                    {person.fullName}
                  </span>
                  {person.cellName ? (
                    <span className="mt-0.5 block text-sm text-app-secondary">{person.cellName}</span>
                  ) : null}
                </span>
              </button>
            );
          })}
        </div>

        {visiblePeople.length === 0 ? (
          <p className="mt-8 text-center text-sm text-app-secondary">
            Nenhuma pessoa encontrada com estes filtros.
          </p>
        ) : null}
      </section>

      <div className="fixed inset-x-0 bottom-[calc(4.6rem+env(safe-area-inset-bottom))] z-30 border-t border-app-border bg-surface/95 p-3 backdrop-blur lg:bottom-0 lg:left-72">
        <div className="mx-auto max-w-6xl">
          <Button
            type="button"
            onClick={() => setConfirming(true)}
            disabled={pending || queuedSaves > 0}
            className="w-full"
          >
            {pending ? "Finalizando..." : "Finalizar chamada"}
          </Button>
        </div>
      </div>

      {confirming ? (
        <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-6">
          <button
            type="button"
            aria-label="Cancelar finalização"
            className="absolute inset-0"
            data-press="none"
            onClick={() => setConfirming(false)}
          />
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="finalize-call-title"
            className="relative w-full max-w-lg rounded-t-[1.75rem] bg-surface p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-[var(--shadow-raised)] sm:rounded-2xl sm:p-6"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 id="finalize-call-title" className="text-xl font-semibold text-app-foreground">
                  Finalizar chamada?
                </h2>
                <p className="mt-3 leading-7 text-app-secondary">
                  {unmarked} {unmarked === 1 ? "pessoa não foi marcada e será registrada" : "pessoas não foram marcadas e serão registradas"} como {unmarked === 1 ? "ausente" : "ausentes"}.
                </p>
              </div>
              <button
                type="button"
                aria-label="Fechar confirmação"
                onClick={() => setConfirming(false)}
                className="flex size-11 shrink-0 items-center justify-center rounded-xl text-app-secondary hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
              >
                <X aria-hidden="true" className="size-5" />
              </button>
            </div>
            <form action={action} className="mt-6 grid gap-3 sm:grid-cols-2">
              <input type="hidden" name="sessionId" value={sessionId} />
              {[...selected].map((profileId) => (
                <input key={profileId} type="hidden" name="presentProfileIds" value={profileId} />
              ))}
              <Button type="button" variant="secondary" onClick={() => setConfirming(false)}>
                Continuar marcando
              </Button>
              <Button type="submit" disabled={pending || queuedSaves > 0} aria-busy={pending}>
                Confirmar finalização
              </Button>
            </form>
          </section>
        </div>
      ) : null}
    </>
  );
}
