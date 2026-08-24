"use client";

import { Check, Search, X } from "lucide-react";
import { useState, useTransition } from "react";
import { controlClassName } from "@/components/ui/control-styles";
import type { SupervisionAttendancePerson } from "@/lib/data/supervision-attendance";
import { classNames } from "@/lib/ui/class-names";
import { updateSupervisionAttendanceEntry } from "../actions";

type FinalizedFilter = "all" | "present" | "absent";

function normalizedSearch(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR");
}

export function FinalizedAttendance({
  sessionId,
  initialPeople,
}: {
  sessionId: string;
  initialPeople: SupervisionAttendancePerson[];
}) {
  const [people, setPeople] = useState(initialPeople);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<FinalizedFilter>("all");
  const [pending, startTransition] = useTransition();
  const present = people.filter((person) => person.present).length;
  const absent = people.length - present;
  const percentage = people.length === 0 ? 0 : Math.round((present * 100) / people.length);
  const normalizedQuery = normalizedSearch(query.trim());
  const visiblePeople = people.filter((person) => {
    const matchesSearch = normalizedSearch(person.fullName).includes(normalizedQuery);
    const matchesFilter =
      filter === "all" ||
      (filter === "present" && person.present) ||
      (filter === "absent" && !person.present);
    return matchesSearch && matchesFilter;
  });

  function togglePerson(profileId: string, nextPresent: boolean) {
    setPeople((current) =>
      current.map((person) =>
        person.profileId === profileId ? { ...person, present: nextPresent } : person,
      ),
    );
    const formData = new FormData();
    formData.set("sessionId", sessionId);
    formData.set("profileId", profileId);
    formData.set("present", String(nextPresent));
    startTransition(async () => {
      const success = await updateSupervisionAttendanceEntry(formData);
      if (!success) {
        setPeople((current) =>
          current.map((person) =>
            person.profileId === profileId
              ? { ...person, present: !nextPresent }
              : person,
          ),
        );
      }
    });
  }

  return (
    <section aria-labelledby="finalized-list-heading">
      <div className="rounded-2xl border border-app-border bg-surface p-5">
        <p id="finalized-list-heading" className="text-2xl font-semibold text-app-foreground">
          {present} / {people.length} presentes · {percentage}%
        </p>
        <p className="mt-1 text-sm text-app-secondary">
          {absent} {absent === 1 ? "ausente" : "ausentes"}{pending ? " · Salvando alteração..." : ""}
        </p>
      </div>

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
            ["all", "Todos", people.length],
            ["present", "Presentes", present],
            ["absent", "Ausentes", absent],
          ] as const).map(([value, label, count]) => (
            <button
              key={value}
              type="button"
              aria-pressed={filter === value}
              onClick={() => setFilter(value)}
              className={classNames(
                "min-h-11 shrink-0 rounded-full border px-4 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus",
                filter === value
                  ? "border-theme-primary bg-theme-primary text-theme-primary-foreground"
                  : "border-app-border bg-surface text-app-secondary",
              )}
            >
              {label} · {count}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 space-y-2">
        {visiblePeople.map((person) => {
          const isPresent = person.present === true;
          return (
            <button
              key={person.profileId}
              type="button"
              aria-pressed={isPresent}
              disabled={pending}
              onClick={() => togglePerson(person.profileId, !isPresent)}
              className={classNames(
                "flex min-h-[4.25rem] w-full items-center gap-4 rounded-2xl border px-4 py-3 text-left transition-[background-color,border-color,transform] duration-150 active:scale-[0.985] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:opacity-70 motion-reduce:transform-none sm:px-5",
                isPresent ? "border-success/30 bg-success-soft" : "border-app-border bg-surface",
              )}
            >
              <span className={classNames(
                "flex size-8 shrink-0 items-center justify-center rounded-full border-2",
                isPresent ? "border-success bg-success text-white" : "border-danger/30 bg-danger-soft text-danger",
              )}>
                {isPresent ? <Check aria-hidden="true" className="size-5" strokeWidth={3} /> : <X aria-hidden="true" className="size-5" strokeWidth={2.5} />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-semibold text-app-foreground sm:text-lg">{person.fullName}</span>
                <span className="mt-0.5 block text-sm text-app-secondary">
                  {person.cellName ?? "Célula não informada"} · {isPresent ? "Presente" : "Ausente"}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
