import {
  CircleCheck,
  CircleMinus,
  Clock3,
  type LucideIcon,
} from "lucide-react";
import { Surface } from "@/components/ui/surface";
import { UserAvatar } from "@/components/ui/user-avatar";
import type { WeeklyChecklistPerson } from "@/lib/data/weekly-checklist";

type AnswerStatus = "yes" | "no" | "pending";

const answerStyles: Record<
  AnswerStatus,
  { icon: LucideIcon; className: string }
> = {
  yes: {
    icon: CircleCheck,
    className: "bg-success-soft text-success",
  },
  no: {
    icon: CircleMinus,
    className: "bg-surface-muted text-app-secondary",
  },
  pending: {
    icon: Clock3,
    className: "bg-warning-soft text-warning",
  },
};

function booleanStatus(value: boolean | null): AnswerStatus {
  if (value === null) return "pending";
  return value ? "yes" : "no";
}

function ChecklistAnswer({
  value,
  positiveLabel,
  negativeLabel,
}: {
  value: AnswerStatus;
  positiveLabel: string;
  negativeLabel: string;
}) {
  const status = answerStyles[value];
  const Icon = status.icon;
  const label =
    value === "pending"
      ? "Pendente"
      : value === "yes"
        ? positiveLabel
        : negativeLabel;

  return (
    <span
      className={`inline-flex min-h-8 items-center gap-1.5 rounded-lg px-2.5 py-1 text-sm font-semibold ${status.className}`}
    >
      <Icon aria-hidden="true" size={17} strokeWidth={1.9} />
      {label}
    </span>
  );
}

export function NetworkResult({ people }: { people: WeeklyChecklistPerson[] }) {
  const responded = people.filter(
    (person) => person.prayedInGroup !== null && person.fastedForCell !== null,
  ).length;
  const responseRate = people.length
    ? Math.round((responded / people.length) * 100)
    : 0;
  const prayed = people.filter((person) => person.prayedInGroup === true).length;
  const fasted = people.filter((person) => person.fastedForCell === true).length;
  const evangelized = people.filter(
    (person) => person.evangelismStatus === "yes",
  ).length;

  return (
    <Surface className="overflow-hidden p-0">
      <div className="px-4 py-5 sm:px-5">
        <h3 className="truncate font-semibold text-app-foreground">
          {people[0]?.networkName}
        </h3>
        <div className="mt-4 flex items-end justify-between gap-4">
          <p>
            <span className="text-3xl font-semibold text-theme-primary-active">
              {responseRate}%
            </span>{" "}
            <span className="text-sm text-app-secondary">respondido</span>
          </p>
          <p className="pb-1 text-sm font-semibold text-app-secondary">
            {responded} de {people.length}
          </p>
        </div>
        <div
          role="progressbar"
          aria-label={`Respostas recebidas na ${people[0]?.networkName}`}
          aria-valuemin={0}
          aria-valuemax={people.length}
          aria-valuenow={responded}
          className="mt-3 h-2 overflow-hidden rounded-full bg-surface-muted"
        >
          <div
            className="h-full rounded-full bg-theme-primary"
            style={{ width: `${responseRate}%` }}
          />
        </div>
        <ul className="mt-5 grid gap-3 border-t border-app-border pt-4 sm:grid-cols-3">
          <SummaryMetric
            count={evangelized}
            singular="evangelizou"
            plural="evangelizaram"
          />
          <SummaryMetric
            count={prayed}
            singular="orou em grupo"
            plural="oraram em grupo"
          />
          <SummaryMetric count={fasted} singular="jejuou" plural="jejuaram" />
        </ul>
      </div>

      <div className="divide-y divide-app-border border-t border-app-border">
        {people.map((person) => (
          <article key={person.profileId} className="px-4 py-4 sm:px-5">
            <div className="flex items-center gap-3">
              <UserAvatar
                name={person.fullName}
                src={person.avatarUrl}
                size="small"
              />
              <div className="min-w-0">
                <h4 className="truncate text-sm font-semibold text-app-foreground">
                  {person.fullName}
                </h4>
              </div>
            </div>

            <dl className="mt-4 grid gap-3 sm:ml-12 sm:grid-cols-3">
              <PersonAnswer
                label="Oração"
                value={booleanStatus(person.prayedInGroup)}
                positiveLabel="Participou"
                negativeLabel="Não participou"
              />
              <PersonAnswer
                label="Jejum"
                value={booleanStatus(person.fastedForCell)}
                positiveLabel="Jejuou"
                negativeLabel="Não jejuou"
              />
              <PersonAnswer
                label="Evangelismo"
                value={person.evangelismStatus}
                positiveLabel="Evangelizou"
                negativeLabel="Não evangelizou"
              />
            </dl>
          </article>
        ))}
      </div>
    </Surface>
  );
}

function SummaryMetric({
  count,
  singular,
  plural,
}: {
  count: number;
  singular: string;
  plural: string;
}) {
  return (
    <li className="flex items-baseline gap-2">
      <span className="text-2xl font-semibold text-app-foreground">{count}</span>
      <span className="text-sm leading-5 text-app-secondary">
        {count === 1 ? `líder ${singular}` : `líderes ${plural}`}
      </span>
    </li>
  );
}

function PersonAnswer({
  label,
  value,
  positiveLabel,
  negativeLabel,
}: {
  label: string;
  value: AnswerStatus;
  positiveLabel: string;
  negativeLabel: string;
}) {
  return (
    <div className="flex min-w-0 items-center justify-between gap-3 sm:block">
      <dt className="text-sm font-medium text-app-secondary">{label}</dt>
      <dd className="shrink-0 sm:mt-2">
        <ChecklistAnswer
          value={value}
          positiveLabel={positiveLabel}
          negativeLabel={negativeLabel}
        />
      </dd>
    </div>
  );
}
