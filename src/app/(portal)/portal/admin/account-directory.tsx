"use client";

import { useMemo, useState } from "react";
import type { AdministrationProfile } from "@/lib/data/cell-administration";
import { AccountAccessForm } from "./account-access-form";

type AccountDirectoryProps = {
  profiles: AdministrationProfile[];
  currentUserId: string;
};

export function AccountDirectory({
  profiles,
  currentUserId,
}: AccountDirectoryProps) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [networkId, setNetworkId] = useState("all");
  const [cellTypeId, setCellTypeId] = useState("all");
  const fieldClassName =
    "min-h-11 w-full rounded-xl border border-zinc-300 bg-white px-3 text-sm text-zinc-950 outline-none focus:border-zinc-700 focus:ring-2 focus:ring-zinc-200";

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

    return (
      matchesSearch && matchesStatus && matchesNetwork && matchesCellType
    );
  });

  function clearFilters() {
    setSearch("");
    setStatus("all");
    setNetworkId("all");
    setCellTypeId("all");
  }

  return (
    <>
      <div className="mt-5 grid gap-3 rounded-2xl bg-zinc-100 p-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="sm:col-span-2 lg:col-span-4">
          <label htmlFor="account-search" className="sr-only">
            Buscar conta
          </label>
          <input
            id="account-search"
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar por nome, e-mail ou célula"
            className={fieldClassName}
          />
        </div>

        <select
          aria-label="Filtrar por status"
          value={status}
          onChange={(event) => setStatus(event.target.value)}
          className={fieldClassName}
        >
          <option value="all">Todas as contas</option>
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
          aria-label="Filtrar por tipo de célula"
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

        <button
          type="button"
          onClick={clearFilters}
          className="min-h-11 rounded-xl border border-zinc-300 bg-white px-4 text-sm font-semibold text-zinc-900 hover:bg-zinc-50"
        >
          Limpar filtros
        </button>
      </div>

      <p className="mt-4 text-sm text-zinc-600">
        {filteredProfiles.length}{" "}
        {filteredProfiles.length === 1 ? "conta encontrada" : "contas encontradas"}
      </p>

      <div className="mt-3 space-y-3">
        {filteredProfiles.map((profile) => (
          <AccountAccessForm
            key={profile.profile_id}
            profile={profile}
            isOwnAccount={profile.profile_id === currentUserId}
          />
        ))}
        {filteredProfiles.length === 0 ? (
          <p className="rounded-xl border border-zinc-200 px-4 py-6 text-center text-zinc-600">
            Nenhuma conta encontrada com esses filtros.
          </p>
        ) : null}
      </div>
    </>
  );
}
