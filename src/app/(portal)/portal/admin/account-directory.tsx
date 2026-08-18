"use client";

import { Search, X } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { FilterPanel } from "@/components/ui/filter-panel";
import { StatusBadge } from "@/components/ui/status-badge";
import type { AdministrationProfile } from "@/lib/data/cell-administration";
import { AccountAccessForm } from "./account-access-form";

type AccountDirectoryProps = {
  profiles: AdministrationProfile[];
  currentUserId: string;
};

const fieldClassName =
  "min-h-12 w-full rounded-xl border border-app-border bg-surface px-4 text-base text-app-foreground outline-none focus:border-theme-primary focus:ring-2 focus:ring-theme-primary-subtle";

export function AccountDirectory({
  profiles,
  currentUserId,
}: AccountDirectoryProps) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [networkId, setNetworkId] = useState("all");
  const [cellTypeId, setCellTypeId] = useState("all");

  const networks = useMemo(
    () =>
      Array.from(
        new Map(
          profiles
            .filter(
              (profile) =>
                profile.current_network_id && profile.current_network_name,
            )
            .map((profile) => [
              profile.current_network_id as string,
              profile.current_network_name as string,
            ]),
        ),
      ).sort((first, second) => first[1].localeCompare(second[1], "pt-BR")),
    [profiles],
  );

  const cellTypes = useMemo(
    () =>
      Array.from(
        new Map(
          profiles
            .filter(
              (profile) =>
                profile.current_cell_type_id &&
                profile.current_cell_type_name &&
                (networkId === "all" ||
                  profile.current_network_id === networkId),
            )
            .map((profile) => [
              profile.current_cell_type_id as string,
              profile.current_cell_type_name as string,
            ]),
        ),
      ).sort((first, second) => first[1].localeCompare(second[1], "pt-BR")),
    [networkId, profiles],
  );

  const normalizedSearch = search.trim().toLocaleLowerCase("pt-BR");
  const filteredProfiles = profiles.filter((profile) => {
    const matchesSearch =
      normalizedSearch.length === 0 ||
      (profile.full_name ?? "")
        .toLocaleLowerCase("pt-BR")
        .includes(normalizedSearch) ||
      profile.email.toLocaleLowerCase("pt-BR").includes(normalizedSearch) ||
      (profile.current_cell_name ?? "")
        .toLocaleLowerCase("pt-BR")
        .includes(normalizedSearch);
    const matchesStatus =
      status === "all" ||
      (status === "active" ? profile.is_active : !profile.is_active);
    const matchesNetwork =
      networkId === "all" || profile.current_network_id === networkId;
    const matchesCellType =
      cellTypeId === "all" || profile.current_cell_type_id === cellTypeId;

    return matchesSearch && matchesStatus && matchesNetwork && matchesCellType;
  });
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
    <div className="mt-4">
      <FilterPanel activeFilters={activeFilters} title="Filtrar contas">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <label className="min-w-0 sm:col-span-2 lg:col-span-4">
            <span className="sr-only">Buscar conta</span>
            <span className="relative block">
              <Search
                aria-hidden="true"
                className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-app-secondary"
              />
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar por nome, e-mail ou célula"
                className={`${fieldClassName} pl-12`}
              />
            </span>
          </label>

          <label className="min-w-0">
            <span className="text-sm font-semibold text-app-foreground">Status</span>
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              className={`${fieldClassName} mt-2`}
            >
              <option value="all">Todas as contas</option>
              <option value="active">Ativas</option>
              <option value="inactive">Inativas</option>
            </select>
          </label>

          <label className="min-w-0">
            <span className="text-sm font-semibold text-app-foreground">Rede</span>
            <select
              value={networkId}
              onChange={(event) => {
                setNetworkId(event.target.value);
                setCellTypeId("all");
              }}
              className={`${fieldClassName} mt-2`}
            >
              <option value="all">Todas as Redes</option>
              {networks.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>

          <label className="min-w-0">
            <span className="text-sm font-semibold text-app-foreground">Tipo</span>
            <select
              value={cellTypeId}
              onChange={(event) => setCellTypeId(event.target.value)}
              className={`${fieldClassName} mt-2`}
            >
              <option value="all">Todos os tipos</option>
              {cellTypes.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>

          <div className="flex items-end">
            <Button
              type="button"
              variant="secondary"
              onClick={clearFilters}
              disabled={activeFilters === 0}
              className="w-full"
            >
              <X aria-hidden="true" className="size-4" />
              Limpar
            </Button>
          </div>
        </div>
      </FilterPanel>

      <div className="mt-4 flex items-center justify-between gap-4">
        <p className="text-sm text-app-secondary">Resultado da consulta</p>
        <StatusBadge tone="neutral">
          {filteredProfiles.length}{" "}
          {filteredProfiles.length === 1 ? "conta" : "contas"}
        </StatusBadge>
      </div>

      {filteredProfiles.length > 0 ? (
        <div className="mt-3 space-y-3">
          {filteredProfiles.map((profile) => (
            <AccountAccessForm
              key={profile.profile_id}
              profile={profile}
              isOwnAccount={profile.profile_id === currentUserId}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          className="mt-3"
          icon={<Search className="size-8" />}
          title="Nenhuma conta encontrada"
          description="Ajuste ou limpe os filtros para ampliar a consulta."
        />
      )}
    </div>
  );
}
