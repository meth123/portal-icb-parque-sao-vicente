type ReportTotalsProps = {
  members: number;
  guests: number;
  firstTimeGuests: number;
  totalParticipants: number;
};

export function ReportTotals({
  members,
  guests,
  firstTimeGuests,
  totalParticipants,
}: ReportTotalsProps) {
  const totals = [
    ["Participantes", members],
    ["Convidados", guests],
    ["Primeira vez", firstTimeGuests],
    ["Total", totalParticipants],
  ] as const;

  return (
    <section
      aria-label="Totais calculados"
      className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-app-border bg-app-border sm:grid-cols-4"
    >
      {totals.map(([label, value]) => (
        <div key={label} className="bg-surface px-4 py-4">
          <p className="text-xs font-medium text-app-secondary">
            {label}
          </p>
          <p className="mt-2 text-2xl font-semibold leading-none text-app-foreground">
            {value}
          </p>
        </div>
      ))}
    </section>
  );
}
