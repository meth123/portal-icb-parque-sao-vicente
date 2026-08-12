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
    ["MEMBROS", members],
    ["CONVIDADOS", guests],
    ["1ª VEZ", firstTimeGuests],
    ["GERAL", totalParticipants],
  ] as const;

  return (
    <section
      aria-label="Totais calculados"
      className="grid grid-cols-2 gap-2 rounded-xl bg-zinc-100 p-2 sm:grid-cols-4 sm:p-3"
    >
      {totals.map(([label, value]) => (
        <div key={label} className="rounded-lg bg-white px-3 py-2.5">
          <p className="text-[0.65rem] font-semibold tracking-wide text-zinc-600">
            {label}
          </p>
          <p className="mt-0.5 text-xl font-semibold leading-none text-zinc-950">
            {value}
          </p>
        </div>
      ))}
    </section>
  );
}
