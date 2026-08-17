"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { ManagedCellSummary } from "@/lib/data/cell-administration";

export function ManagedCellDirectory({ cells }: { cells: ManagedCellSummary[] }) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [networkId, setNetworkId] = useState("all");
  const [cellTypeId, setCellTypeId] = useState("all");
  const fieldClassName =
    "min-h-11 w-full rounded-xl border border-zinc-300 bg-white px-3 text-sm text-zinc-950 outline-none focus:border-zinc-700 focus:ring-2 focus:ring-zinc-200";

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
              (cell) =>
                networkId === "all" || cell.networkId === networkId,
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
        cell.leaderName
          .toLocaleLowerCase("pt-BR")
          .includes(normalizedSearch)) &&
      (status === "all" ||
        (status === "active" ? cell.isActive : !cell.isActive)) &&
      (networkId === "all" || cell.networkId === networkId) &&
      (cellTypeId === "all" || cell.cellTypeId === cellTypeId),
  );

  return (
    <>
      <div className="mt-8 grid gap-3 rounded-2xl bg-zinc-100 p-3 sm:grid-cols-2 lg:grid-cols-5">
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Buscar célula ou Líder"
          aria-label="Buscar célula ou Líder"
          className={fieldClassName}
        />
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
        <button
          type="button"
          onClick={() => {
            setSearch("");
            setStatus("all");
            setNetworkId("all");
            setCellTypeId("all");
          }}
          className="min-h-11 rounded-xl border border-zinc-300 bg-white px-4 text-sm font-semibold text-zinc-900 hover:bg-zinc-50"
        >
          Limpar filtros
        </button>
      </div>

      <p className="mt-4 text-sm text-zinc-600">
        {filteredCells.length}{" "}
        {filteredCells.length === 1 ? "célula encontrada" : "células encontradas"}
      </p>

      <div className="mt-3 space-y-3">
        {filteredCells.map((cell) => (
          <article
            key={cell.id}
            className="rounded-2xl border border-zinc-200 bg-white p-5"
          >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-xl font-semibold text-zinc-950">
                    {cell.name}
                  </h2>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      cell.isActive
                        ? "bg-emerald-50 text-emerald-800"
                        : "bg-zinc-200 text-zinc-700"
                    }`}
                  >
                    {cell.isActive ? "Ativa" : "Desativada"}
                  </span>
                </div>
                <p className="mt-1 text-sm text-zinc-600">
                  {cell.networkName} · {cell.cellTypeName}
                </p>
                <p className="mt-2 text-sm text-zinc-700">
                  <strong>Líder:</strong> {cell.leaderName}
                </p>
                <p className="mt-1 text-sm text-zinc-600">
                  <strong>Vices:</strong>{" "}
                  {cell.viceLeaderNames.length > 0
                    ? cell.viceLeaderNames.join(", ")
                    : "Nenhum"}
                </p>
              </div>
              {cell.isActive ? (
                <Link
                  href={`/portal/admin/celulas/${cell.id}`}
                  className="flex min-h-11 shrink-0 items-center justify-center rounded-xl border border-zinc-300 px-5 font-semibold text-zinc-900 hover:bg-zinc-100"
                >
                  Editar
                </Link>
              ) : (
                <Link
                  href={`/portal/admin/celulas/${cell.id}`}
                  className="flex min-h-11 shrink-0 items-center justify-center rounded-xl border border-zinc-300 px-5 font-semibold text-zinc-900 hover:bg-zinc-100"
                >
                  Reativar
                </Link>
              )}
            </div>
          </article>
        ))}
        {filteredCells.length === 0 ? (
          <p className="rounded-xl border border-zinc-200 px-4 py-6 text-center text-zinc-600">
            Nenhuma célula encontrada com esses filtros.
          </p>
        ) : null}
      </div>
    </>
  );
}
