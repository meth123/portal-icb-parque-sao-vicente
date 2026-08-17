import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import {
  getWeeklyChecklistData,
  type WeeklyChecklistPerson,
} from "@/lib/data/weekly-checklist";
import { ChecklistForm } from "./checklist-form";

function getInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toLocaleUpperCase("pt-BR"))
    .join("");
}

function Answer({ value }: { value: boolean | null }) {
  const label = value === null ? "Pendente" : value ? "Sim" : "Não";
  const style =
    value === null
      ? "bg-amber-50 text-amber-800"
      : value
        ? "bg-emerald-50 text-emerald-800"
        : "bg-zinc-200 text-zinc-700";

  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${style}`}>
      {label}
    </span>
  );
}

function EvangelismAnswer({
  value,
}: {
  value: WeeklyChecklistPerson["evangelismStatus"];
}) {
  if (value === "yes") return <Answer value />;
  if (value === "no") return <Answer value={false} />;
  return <Answer value={null} />;
}

export default async function WeeklyChecklistPage() {
  const user = await getCurrentUser();

  if (!user) redirect("/login?erro=perfil");
  if (!user.isActive) redirect("/portal");

  const checklist = await getWeeklyChecklistData();

  if (!checklist) redirect("/portal");

  const networks = new Map<string, WeeklyChecklistPerson[]>();
  for (const person of checklist.people) {
    const people = networks.get(person.networkId) ?? [];
    people.push(person);
    networks.set(person.networkId, people);
  }

  return (
    <main className="min-h-screen bg-zinc-100 px-3 py-6 sm:px-6 sm:py-10">
      <div className="mx-auto w-full max-w-5xl space-y-6">
        <section className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-zinc-600">
            {checklist.periodLabel}
          </p>
          <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight text-zinc-950">
                Checklist semanal
              </h1>
              <p className="mt-3 max-w-2xl leading-7 text-zinc-700">
                Oração e Jejum são respostas individuais. O Evangelismo vem
                automaticamente da Ficha de Organização.
              </p>
            </div>
            <span
              className={`w-fit rounded-full px-3 py-1.5 text-sm font-semibold ${
                checklist.period.isOpen
                  ? "bg-emerald-50 text-emerald-800"
                  : "bg-zinc-200 text-zinc-700"
              }`}
            >
              {checklist.period.isOpen
                ? `Aberto até ${new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" }).format(new Date(`${checklist.period.closesOn}T12:00:00Z`))}`
                : "Encerrado"}
            </span>
          </div>

          {checklist.hasError ? (
            <p
              role="alert"
              className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-4 text-red-800"
            >
              Não foi possível carregar o checklist. Tente novamente.
            </p>
          ) : null}

        </section>

        {checklist.currentPerson && checklist.canRespond ? (
          <section className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-8">
            <p className="text-sm font-semibold text-zinc-600">
              Sua resposta · {checklist.currentPerson.cellName}
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-zinc-950">
              {checklist.currentPerson.fullName}
            </h2>
            <ChecklistForm
              initialPrayer={checklist.currentPerson.prayedInGroup}
              initialFasting={checklist.currentPerson.fastedForCell}
            />
          </section>
        ) : null}

        {checklist.currentPerson && !checklist.period.isOpen ? (
          <p className="rounded-2xl border border-zinc-200 bg-white px-5 py-4 text-center text-zinc-700">
            O prazo de resposta terminou. O resultado permanece disponível para consulta.
          </p>
        ) : null}

        {[...networks.entries()].map(([networkId, people]) => {
          const responded = people.filter(
            (person) =>
              person.prayedInGroup !== null && person.fastedForCell !== null,
          ).length;
          const prayed = people.filter(
            (person) => person.prayedInGroup === true,
          ).length;
          const fasted = people.filter(
            (person) => person.fastedForCell === true,
          ).length;
          const evangelized = people.filter(
            (person) => person.evangelismStatus === "yes",
          ).length;

          return (
            <section
              key={networkId}
              className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-8"
            >
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.14em] text-zinc-600">
                    Resultado da Rede
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold text-zinc-950">
                    {people[0]?.networkName}
                  </h2>
                </div>
                <p className="text-sm font-semibold text-zinc-700">
                  {responded} de {people.length} responderam
                </p>
              </div>

              <dl className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="rounded-2xl bg-zinc-100 px-4 py-4 text-center">
                  <dd className="text-2xl font-semibold text-zinc-950">
                    {evangelized}/{people.length}
                  </dd>
                  <dt className="mt-1 text-sm text-zinc-700">Evangelizaram</dt>
                </div>
                <div className="rounded-2xl bg-zinc-100 px-4 py-4 text-center">
                  <dd className="text-2xl font-semibold text-zinc-950">
                    {prayed}/{people.length}
                  </dd>
                  <dt className="mt-1 text-sm text-zinc-700">Oraram em grupo</dt>
                </div>
                <div className="rounded-2xl bg-zinc-100 px-4 py-4 text-center">
                  <dd className="text-2xl font-semibold text-zinc-950">
                    {fasted}/{people.length}
                  </dd>
                  <dt className="mt-1 text-sm text-zinc-700">Jejuaram pela Célula</dt>
                </div>
              </dl>

              <div className="mt-5 grid gap-3 lg:grid-cols-2">
                {people.map((person) => (
                  <article
                    key={person.profileId}
                    className="rounded-2xl border border-zinc-200 p-4"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-zinc-200 font-semibold text-zinc-700">
                        {person.avatarUrl ? (
                          <Image
                            src={person.avatarUrl}
                            alt={`Foto de ${person.fullName}`}
                            width={48}
                            height={48}
                            unoptimized
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          getInitials(person.fullName)
                        )}
                      </div>
                      <div className="min-w-0">
                        <h3 className="truncate font-semibold text-zinc-950">
                          {person.fullName}
                        </h3>
                        <p className="truncate text-sm text-zinc-600">
                          {person.cellName} · {person.leadershipRole === "leader" ? "Líder" : "Vice-líder"}
                        </p>
                      </div>
                    </div>

                    <dl className="mt-4 grid gap-2 text-sm">
                      <div className="flex items-center justify-between gap-3">
                        <dt className="text-zinc-700">Oração em Grupo</dt>
                        <dd><Answer value={person.prayedInGroup} /></dd>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <dt className="text-zinc-700">Jejum pela Célula</dt>
                        <dd><Answer value={person.fastedForCell} /></dd>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <dt className="text-zinc-700">Evangelismo</dt>
                        <dd><EvangelismAnswer value={person.evangelismStatus} /></dd>
                      </div>
                    </dl>
                  </article>
                ))}
              </div>
            </section>
          );
        })}

        <Link
          href="/portal"
          className="flex min-h-12 w-full items-center justify-center rounded-xl border border-zinc-300 bg-white px-5 font-semibold text-zinc-900 hover:bg-zinc-50 sm:w-fit sm:min-w-48"
        >
          Voltar ao portal
        </Link>
      </div>
    </main>
  );
}
