"use client";

import Link from "next/link";
import { CalendarDays, House, MapPin, Search, UserRound } from "lucide-react";
import { useMemo, useState } from "react";
import { buttonClassName } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { FilterPanel } from "@/components/ui/filter-panel";
import { StatusBadge } from "@/components/ui/status-badge";
import type { CellOverview } from "@/lib/data/organization";

type StatusFilter = "all" | "active" | "inactive";

export function OrganizationDirectory({ cells }: { cells: CellOverview[] }) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const normalizedQuery = query.trim().toLocaleLowerCase("pt-BR");

  const visibleCells = useMemo(() => cells.filter((cell) => {
    const matchesStatus = status === "all" || (status === "active" ? cell.isActive : !cell.isActive);
    const searchableText = [cell.name, cell.classification, cell.schedule, cell.location, cell.leader].join(" ").toLocaleLowerCase("pt-BR");
    return matchesStatus && (!normalizedQuery || searchableText.includes(normalizedQuery));
  }), [cells, normalizedQuery, status]);

  const activeFilters = (normalizedQuery ? 1 : 0) + (status !== "all" ? 1 : 0);

  return (
    <div className="mt-4">
      <FilterPanel title="Buscar células" activeFilters={activeFilters}>
        <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_14rem]">
          <label>
            <span className="mb-2 block text-sm font-semibold text-app-foreground">Busca</span>
            <span className="relative block">
              <Search aria-hidden="true" className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-app-secondary" />
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Nome, líder, rede ou bairro"
                className="min-h-12 w-full rounded-xl border border-app-border bg-surface py-3 pl-12 pr-4 text-app-foreground outline-none placeholder:text-app-secondary focus:border-theme-primary focus:ring-2 focus:ring-theme-primary-soft"
              />
            </span>
          </label>
          <label>
            <span className="mb-2 block text-sm font-semibold text-app-foreground">Situação</span>
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value as StatusFilter)}
              className="min-h-12 w-full rounded-xl border border-app-border bg-surface px-4 text-app-foreground outline-none focus:border-theme-primary focus:ring-2 focus:ring-theme-primary-soft"
            >
              <option value="all">Todas</option>
              <option value="active">Ativas</option>
              <option value="inactive">Inativas</option>
            </select>
          </label>
        </div>
      </FilterPanel>

      <div className="mt-4 flex items-center justify-between gap-4">
        <p className="text-sm text-app-secondary" aria-live="polite">
          <strong className="font-semibold text-app-foreground">{visibleCells.length}</strong> {visibleCells.length === 1 ? "célula encontrada" : "células encontradas"}
        </p>
        {activeFilters > 0 ? (
          <button type="button" onClick={() => { setQuery(""); setStatus("all"); }} className={buttonClassName({ variant: "ghost", size: "compact" })}>
            Limpar filtros
          </button>
        ) : null}
      </div>

      {visibleCells.length > 0 ? (
        <ul className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {visibleCells.map((cell) => (
            <li key={cell.id} className="flex min-w-0 flex-col rounded-2xl border border-app-border bg-surface p-5">
              <div className="flex items-start gap-3">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-theme-primary-subtle text-theme-primary-active">
                  <House aria-hidden="true" className="size-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="break-words font-semibold text-app-foreground">{cell.name}</h3>
                    <StatusBadge tone={cell.isActive ? "success" : "neutral"}>{cell.isActive ? "Ativa" : "Inativa"}</StatusBadge>
                  </div>
                  <p className="mt-1 break-words text-sm font-medium text-theme-primary-active">{cell.classification}</p>
                </div>
              </div>

              <dl className="mt-5 space-y-3 border-t border-app-border pt-4 text-sm">
                <div className="flex gap-3"><CalendarDays aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-app-secondary" /><div><dt className="sr-only">Encontro</dt><dd className="capitalize text-app-foreground">{cell.schedule}</dd></div></div>
                <div className="flex gap-3"><MapPin aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-app-secondary" /><div><dt className="sr-only">Localidade</dt><dd className="break-words text-app-foreground">{cell.location}</dd></div></div>
                <div className="flex gap-3"><UserRound aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-app-secondary" /><div><dt className="sr-only">Líder</dt><dd className="break-words text-app-foreground">{cell.leader}</dd></div></div>
              </dl>

              <Link href={`/portal/celulas/${cell.id}`} className={buttonClassName({ variant: "secondary", size: "compact", className: "mt-auto w-full pt-3" })}>
                Abrir célula
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState className="mt-4" icon={<Search className="size-7" />} title="Nenhuma célula encontrada" description="Revise a busca ou limpe os filtros para ver toda a estrutura." />
      )}
    </div>
  );
}
