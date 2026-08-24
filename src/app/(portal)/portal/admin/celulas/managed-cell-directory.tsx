"use client";

import Link from "next/link";
import { House, Search, UserRound, UsersRound, X } from "lucide-react";
import { useMemo, useState } from "react";
import { Button, buttonClassName } from "@/components/ui/button";
import { controlClassName as fieldClassName } from "@/components/ui/control-styles";
import { EmptyState } from "@/components/ui/empty-state";
import { FilterPanel } from "@/components/ui/filter-panel";
import { SectionHeader } from "@/components/ui/section-header";
import { StatusBadge } from "@/components/ui/status-badge";
import type { ManagedCellSummary } from "@/lib/data/cell-administration";

export function ManagedCellDirectory({ cells }: { cells: ManagedCellSummary[] }) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [networkId, setNetworkId] = useState("all");
  const [cellTypeId, setCellTypeId] = useState("all");

  const networks = useMemo(
    () =>
      Array.from(
        new Map(cells.map((cell) => [cell.networkId, cell.networkName])),
      ).sort((first, second) => first[1].localeCompare(second[1], "pt-BR")),
    [cells],
  );
  const cellTypes = useMemo(
    () =>
      Array.from(
        new Map(
          cells
            .filter(
              (cell) => networkId === "all" || cell.networkId === networkId,
            )
            .map((cell) => [cell.cellTypeId, cell.cellTypeName]),
        ),
      ).sort((first, second) => first[1].localeCompare(second[1], "pt-BR")),
    [cells, networkId],
  );

  const normalizedSearch = search.trim().toLocaleLowerCase("pt-BR");
  const filteredCells = cells.filter(
    (cell) =>
      (normalizedSearch.length === 0 ||
        cell.name.toLocaleLowerCase("pt-BR").includes(normalizedSearch) ||
        cell.leaderName.toLocaleLowerCase("pt-BR").includes(normalizedSearch)) &&
      (status === "all" ||
        (status === "active" ? cell.isActive : !cell.isActive)) &&
      (networkId === "all" || cell.networkId === networkId) &&
      (cellTypeId === "all" || cell.cellTypeId === cellTypeId),
  );
  const activeFilters = [
    search.trim(),
    status === "all" ? "" : status,
    networkId === "all" ? "" : networkId,
    cellTypeId === "all" ? "" : cellTypeId,
  ].filter(Boolean).length;

  function clearFilters() {
    setSearch("");
    setStatus("all");
    setNetworkId("all");
    setCellTypeId("all");
  }

  return (
    <section aria-labelledby="managed-cells-heading">
      <SectionHeader
        id="managed-cells-heading"
        title="Células cadastradas"
        action={
          <StatusBadge tone="theme">
            {cells.length} {cells.length === 1 ? "célula" : "células"}
          </StatusBadge>
        }
      />

      <FilterPanel
        activeFilters={activeFilters}
        title="Filtrar células"
        className="mt-4"
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <label className="min-w-0 sm:col-span-2 lg:col-span-1">
            <span className="sr-only">Buscar célula ou Líder</span>
            <span className="relative block">
              <Search
                aria-hidden="true"
                className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-app-secondary"
              />
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Célula ou Líder"
                className={`${fieldClassName} pl-12`}
              />
            </span>
          </label>

          <select
            aria-label="Filtrar por status"
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            className={fieldClassName}
          >
            <option value="all">Todas as células</option>
            <option value="active">Ativas</option>
            <option value="inactive">Desativadas</option>
          </select>

          <select
            aria-label="Filtrar por Rede"
            value={networkId}
            onChange={(event) => {
              setNetworkId(event.target.value);
              setCellTypeId("all");
            }}
            className={fieldClassName}
          >
            <option value="all">Todas as Redes</option>
            {networks.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>

          <select
            aria-label="Filtrar por tipo"
            value={cellTypeId}
            onChange={(event) => setCellTypeId(event.target.value)}
            className={fieldClassName}
          >
            <option value="all">Todos os tipos</option>
            {cellTypes.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>

          <Button
            type="button"
            variant="secondary"
            onClick={clearFilters}
            disabled={activeFilters === 0}
          >
            <X aria-hidden="true" className="size-4" />
            Limpar
          </Button>
        </div>
      </FilterPanel>

      <div className="mt-4 flex items-center justify-between gap-4">
        <p className="text-sm text-app-secondary">Resultado da consulta</p>
        <StatusBadge tone="neutral">
          {filteredCells.length}{" "}
          {filteredCells.length === 1 ? "resultado" : "resultados"}
        </StatusBadge>
      </div>

      {filteredCells.length > 0 ? (
        <div className="mt-3 grid gap-4 xl:grid-cols-2">
          {filteredCells.map((cell) => (
            <article
              key={cell.id}
              className="flex h-full flex-col rounded-2xl border border-app-border bg-surface p-5 sm:p-6"
            >
              <div className="flex items-start gap-3">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-theme-primary-soft text-theme-primary-active">
                  <House aria-hidden="true" className="size-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-col items-start gap-2 sm:flex-row sm:justify-between">
                    <div className="min-w-0">
                      <h2 className="text-lg font-semibold leading-6 text-app-foreground">
                        {cell.name}
                      </h2>
                      <p className="mt-1 text-sm leading-5 text-app-secondary">
                        {cell.networkName} · {cell.cellTypeName}
                      </p>
                    </div>
                    <StatusBadge tone={cell.isActive ? "success" : "neutral"}>
                      {cell.isActive ? "Ativa" : "Desativada"}
                    </StatusBadge>
                  </div>
                </div>
              </div>

              <dl className="mt-5 grid gap-4 border-t border-app-border pt-5 sm:grid-cols-2">
                <div className="flex min-w-0 gap-3">
                  <UserRound
                    aria-hidden="true"
                    className="mt-0.5 size-5 shrink-0 text-theme-primary"
                  />
                  <div className="min-w-0">
                    <dt className="text-sm text-app-secondary">Líder</dt>
                    <dd className="mt-1 font-semibold text-app-foreground">
                      {cell.leaderName}
                    </dd>
                  </div>
                </div>
                <div className="flex min-w-0 gap-3">
                  <UsersRound
                    aria-hidden="true"
                    className="mt-0.5 size-5 shrink-0 text-theme-primary"
                  />
                  <div className="min-w-0">
                    <dt className="text-sm text-app-secondary">Vice-liderança</dt>
                    <dd className="mt-1 leading-6 text-app-foreground">
                      {cell.viceLeaderNames.length > 0
                        ? cell.viceLeaderNames.join(", ")
                        : "Nenhuma"}
                    </dd>
                  </div>
                </div>
              </dl>

              <Link
                href={`/portal/admin/celulas/${cell.id}`}
                className={buttonClassName({
                  variant: "secondary",
                  size: "compact",
                  className: "mt-5 w-full sm:ml-auto sm:w-auto",
                })}
              >
                {cell.isActive ? "Editar célula" : "Reativar célula"}
              </Link>
            </article>
          ))}
        </div>
      ) : (
        <EmptyState
          className="mt-3"
          icon={<Search className="size-8" />}
          title="Nenhuma célula encontrada"
          description="Ajuste ou limpe os filtros para ampliar a consulta."
        />
      )}
    </section>
  );
}
