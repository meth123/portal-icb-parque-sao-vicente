"use client";

import {
  CalendarDays,
  ChevronDown,
  MapPin,
  MessageCircle,
  Pencil,
  Search,
  UserRound,
  UsersRound,
} from "lucide-react";
import Link from "next/link";
import { type ReactNode, useMemo, useState } from "react";
import { EmptyState } from "@/components/ui/empty-state";
import { buttonClassName } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { compactControlClassName } from "@/components/ui/control-styles";
import type { MemberRegistrationSummary } from "@/lib/data/member-registrations";
import { memberNetworkLabel } from "@/lib/member-registration";
import { DeleteMemberRegistrationForm } from "./delete-member-registration-form";

function normalizeSearch(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR");
}

function formatDate(value: string) {
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatPostalCode(value: string) {
  return value.length === 8 ? `${value.slice(0, 5)}-${value.slice(5)}` : value;
}

function whatsappHref(value: string) {
  const international = value.startsWith("55") ? value : `55${value}`;
  return `https://wa.me/${international}`;
}

export function MemberRegistrationDirectory({
  registrations,
}: {
  registrations: MemberRegistrationSummary[];
}) {
  const [query, setQuery] = useState("");
  const normalizedQuery = normalizeSearch(query.trim());
  const filteredRegistrations = useMemo(() => {
    if (!normalizedQuery) return registrations;

    return registrations.filter((registration) =>
      normalizeSearch(
        [
          registration.fullName,
          registration.rg,
          registration.city,
          registration.neighborhood,
          registration.disciplerName,
          registration.whatsapp,
          memberNetworkLabel(registration.network),
        ].join(" "),
      ).includes(normalizedQuery),
    );
  }, [normalizedQuery, registrations]);

  return (
    <>
      <div className="mt-7 flex flex-col gap-3 rounded-2xl border border-app-border bg-surface p-4 shadow-[var(--shadow-subtle)] sm:flex-row sm:items-center sm:justify-between">
        <label htmlFor="member-search" className="sr-only">
          Buscar membro
        </label>
        <div className="relative w-full sm:max-w-md">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute left-3.5 top-1/2 size-5 -translate-y-1/2 text-app-secondary"
          />
          <input
            id="member-search"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar por nome, RG, rede, cidade..."
            className={`${compactControlClassName} pl-11`}
          />
        </div>
        <StatusBadge tone="theme" className="self-start sm:self-auto">
          {filteredRegistrations.length} {filteredRegistrations.length === 1 ? "cadastro" : "cadastros"}
        </StatusBadge>
      </div>

      {filteredRegistrations.length > 0 ? (
        <ul className="mt-4 space-y-3">
          {filteredRegistrations.map((registration) => (
            <li key={registration.id}>
              <details className="group rounded-[var(--radius-surface)] border border-app-border bg-surface shadow-[var(--shadow-subtle)] open:border-theme-primary-border open:shadow-[var(--shadow-raised)]">
                <summary className="flex cursor-pointer list-none items-center gap-4 rounded-[var(--radius-surface)] p-4 transition-colors hover:bg-theme-primary-subtle focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus sm:p-5 [&::-webkit-details-marker]:hidden">
                  <span className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-theme-primary-soft text-theme-primary-active sm:size-14">
                    <UserRound aria-hidden="true" className="size-6 sm:size-7" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold text-app-foreground sm:text-lg">
                      {registration.fullName}
                    </span>
                    <span className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-app-secondary">
                      <span>{memberNetworkLabel(registration.network)}</span>
                      <span aria-hidden="true">•</span>
                      <span>{registration.city}</span>
                      <span aria-hidden="true">•</span>
                      <span>Enviado em {formatDateTime(registration.createdAt)}</span>
                    </span>
                  </span>
                  <ChevronDown
                    aria-hidden="true"
                    className="size-5 shrink-0 text-app-secondary transition-transform group-open:rotate-180"
                  />
                </summary>

                <div className="border-t border-app-border p-4 sm:p-6">
                  <div className="grid gap-6 md:grid-cols-2">
                    <InformationGroup
                      icon={<UserRound className="size-5" />}
                      title="Dados pessoais"
                      items={[
                        ["Nome completo", registration.fullName],
                        ["Data de nascimento", formatDate(registration.birthDate)],
                        ["RG", registration.rg],
                      ]}
                    />
                    <InformationGroup
                      icon={<MapPin className="size-5" />}
                      title="Endereço"
                      items={[
                        ["Logradouro", `${registration.addressStreet}, ${registration.addressNumber}`],
                        ["Bairro", registration.neighborhood],
                        ["Cidade", registration.city],
                        ["CEP", formatPostalCode(registration.postalCode)],
                      ]}
                    />
                    <InformationGroup
                      icon={<UsersRound className="size-5" />}
                      title="Vida na igreja"
                      items={[
                        ["Rede", memberNetworkLabel(registration.network)],
                        ["Data de batismo", formatDate(registration.baptismDate)],
                        ["Discipulador(a)", registration.disciplerName],
                      ]}
                    />
                    <InformationGroup
                      icon={<MessageCircle className="size-5" />}
                      title="Contato"
                      items={[["WhatsApp", registration.whatsapp]]}
                      action={
                        <a
                          href={whatsappHref(registration.whatsapp)}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-theme-primary-active hover:underline"
                        >
                          <MessageCircle aria-hidden="true" className="size-4" />
                          Abrir conversa
                        </a>
                      }
                    />
                  </div>
                  <div className="mt-6 flex flex-col gap-4 border-t border-app-border pt-4 sm:flex-row sm:items-center sm:justify-between">
                    <p className="flex items-center gap-2 text-xs text-app-secondary">
                      <CalendarDays aria-hidden="true" className="size-4" />
                      Ficha recebida em {formatDateTime(registration.createdAt)}
                    </p>
                    <div className="flex flex-wrap items-start justify-end gap-2">
                      <Link
                        href={`/portal/ficha-de-membro/cadastros/${registration.id}/editar`}
                        className={buttonClassName({ variant: "secondary", size: "compact" })}
                      >
                        <Pencil aria-hidden="true" className="size-4" />
                        Editar
                      </Link>
                      <DeleteMemberRegistrationForm
                        registrationId={registration.id}
                        memberName={registration.fullName}
                      />
                    </div>
                  </div>
                </div>
              </details>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState
          className="mt-5"
          icon={<UsersRound className="size-8" />}
          title={query ? "Nenhum membro encontrado" : "Nenhuma ficha recebida"}
          description={
            query
              ? "Tente buscar por outro nome, rede, RG ou cidade."
              : "Os cadastros enviados aparecerão aqui."
          }
        />
      )}
    </>
  );
}

function InformationGroup({
  icon,
  title,
  items,
  action,
}: {
  icon: ReactNode;
  title: string;
  items: [string, string][];
  action?: ReactNode;
}) {
  return (
    <section>
      <h3 className="flex items-center gap-2 font-semibold text-app-foreground">
        <span className="text-theme-primary" aria-hidden="true">{icon}</span>
        {title}
      </h3>
      <dl className="mt-3 space-y-2.5">
        {items.map(([label, value]) => (
          <div key={label} className="grid gap-0.5 text-sm sm:grid-cols-[8rem_minmax(0,1fr)] sm:gap-3">
            <dt className="text-app-secondary">{label}</dt>
            <dd className="break-words font-medium text-app-foreground">{value}</dd>
          </div>
        ))}
      </dl>
      {action}
    </section>
  );
}
