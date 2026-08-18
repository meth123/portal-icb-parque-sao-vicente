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
    ["Membros", members],
    ["Convidados", guests],
    ["Primeira vez", firstTimeGuests],
    ["Total", totalParticipants],
  ] as const;

  return (
    <section
      aria-label="Totais calculados"
      className="grid grid-cols-2 gap-2 sm:grid-cols-4"
    >
      {totals.map(([label, value]) => (
        <div key={label} className="rounded-lg bg-surface-muted px-3 py-3">
          <p className="text-xs font-medium text-app-secondary">
            {label}
          </p>
          <p className="mt-1 text-xl font-semibold leading-none text-app-foreground">
            {value}
          </p>
        </div>
      ))}
    </section>
  );
}
