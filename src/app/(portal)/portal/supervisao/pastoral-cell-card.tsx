import Link from "next/link";
import { ArrowRight, House, Send } from "lucide-react";
import { buttonClassName } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";

type PastoralCellCardData = {
  id: string;
  name: string;
  networkName: string;
  cellTypeName: string;
  metrics: {
    reports: number;
    averageMembers: number;
    averageGuests: number;
    averageAttendance: number;
    firstTimeGuests: number;
  };
  evangelismParticipation: {
    accompanied: number;
    evangelized: number;
    percentage: number | null;
  };
};

type PastoralCellCardProps = {
  cell: PastoralCellCardData;
  month: string;
  historyMonths: number;
};

function formatAverage(value: number) {
  return value.toLocaleString("pt-BR", { maximumFractionDigits: 1 });
}

export function PastoralCellCard({
  cell,
  month,
  historyMonths,
}: PastoralCellCardProps) {
  return (
    <li className="flex h-full flex-col overflow-hidden rounded-2xl border border-app-border bg-surface">
      <div className="p-5 sm:p-6">
        <div className="flex flex-col items-start gap-3 sm:flex-row sm:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-theme-primary-soft text-theme-primary-active">
              <House aria-hidden="true" className="size-5" />
            </span>
            <div className="min-w-0">
              <h3 className="text-lg font-semibold leading-6 text-app-foreground">
                {cell.name}
              </h3>
              <p className="mt-1 text-sm leading-5 text-app-secondary">
                {cell.networkName} · {cell.cellTypeName}
              </p>
            </div>
          </div>
          <StatusBadge
            tone={cell.metrics.reports > 0 ? "success" : "warning"}
            className="ml-14 shrink-0 sm:ml-0"
          >
            {cell.metrics.reports > 0
              ? `${cell.metrics.reports} ${cell.metrics.reports === 1 ? "Ficha" : "Fichas"}`
              : "Sem Ficha"}
          </StatusBadge>
        </div>

        <dl className="mt-6 grid grid-cols-2 gap-x-5 gap-y-5 sm:grid-cols-4">
          {[
            ["Média presentes", formatAverage(cell.metrics.averageAttendance)],
            ["Média membros", formatAverage(cell.metrics.averageMembers)],
            ["Média convidados", formatAverage(cell.metrics.averageGuests)],
            ["Primeira vez", String(cell.metrics.firstTimeGuests)],
          ].map(([label, value], index) => (
            <div key={label} className="min-w-0">
              <dt className="text-sm leading-5 text-app-secondary">{label}</dt>
              <dd
                className={`mt-1 text-2xl font-semibold ${index === 0 ? "text-theme-primary-active" : "text-app-foreground"}`}
              >
                {value}
              </dd>
            </div>
          ))}
        </dl>
      </div>

      <div className="mt-auto border-t border-theme-primary-border bg-theme-primary-soft px-5 py-4 sm:px-6 sm:py-5">
        <div className="flex items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-surface text-theme-primary-active">
              <Send aria-hidden="true" className="size-4" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-app-foreground">Evangelismo</p>
              <p className="mt-0.5 text-sm leading-5 text-app-secondary">
                {cell.evangelismParticipation.percentage === null
                  ? "Ainda sem dados neste mês"
                  : `${cell.evangelismParticipation.evangelized} de ${cell.evangelismParticipation.accompanied} ${cell.evangelismParticipation.accompanied === 1 ? "líder participou" : "líderes participaram"}`}
              </p>
            </div>
          </div>
          <strong className="shrink-0 text-2xl font-semibold text-theme-primary-active">
            {cell.evangelismParticipation.percentage === null
              ? "—"
              : `${cell.evangelismParticipation.percentage}%`}
          </strong>
        </div>

        {cell.evangelismParticipation.percentage !== null ? (
          <div
            className="mt-3 h-2 overflow-hidden rounded-full bg-surface"
            role="progressbar"
            aria-label={`Participação no evangelismo da célula ${cell.name}`}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={cell.evangelismParticipation.percentage}
          >
            <div
              className="h-full rounded-full bg-theme-primary"
              style={{ width: `${cell.evangelismParticipation.percentage}%` }}
            />
          </div>
        ) : null}

        <Link
          href={`/portal/celulas/${cell.id}?mes=${month}&historico=${historyMonths}`}
          className={buttonClassName({
            variant: "secondary",
            size: "compact",
            className: "mt-4 w-full bg-surface sm:w-auto",
          })}
        >
          Ver detalhes
          <ArrowRight aria-hidden="true" className="size-4" />
        </Link>
      </div>
    </li>
  );
}
