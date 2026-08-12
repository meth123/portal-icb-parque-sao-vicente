export function getSaoPauloMonthStart(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(date);
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;

  if (!year || !month) {
    throw new Error("Não foi possível identificar o mês atual.");
  }

  return `${year}-${month}-01`;
}

export function formatMonthLabel(monthStart: string) {
  const label = new Intl.DateTimeFormat("pt-BR", {
    timeZone: "UTC",
    month: "long",
    year: "numeric",
  }).format(new Date(`${monthStart}T12:00:00Z`));

  return label.charAt(0).toUpperCase() + label.slice(1);
}

const monthPattern = /^(\d{4})-(0[1-9]|1[0-2])$/;

export function normalizeMonth(month: string | undefined, date = new Date()) {
  if (month && monthPattern.test(month)) {
    return month;
  }

  return getSaoPauloMonthStart(date).slice(0, 7);
}

export function getMonthRange(month: string) {
  const normalizedMonth = normalizeMonth(month);
  const [year, monthNumber] = normalizedMonth.split("-").map(Number);
  const nextMonth = new Date(Date.UTC(year, monthNumber, 1));

  return {
    month: normalizedMonth,
    startsOn: `${normalizedMonth}-01`,
    endsBefore: nextMonth.toISOString().slice(0, 10),
  };
}

export function getMonthSequence(endingMonth: string, totalMonths: number) {
  const normalizedMonth = normalizeMonth(endingMonth);
  const [year, monthNumber] = normalizedMonth.split("-").map(Number);

  return Array.from({ length: totalMonths }, (_, index) => {
    const monthsBeforeEnd = totalMonths - index - 1;
    const date = new Date(
      Date.UTC(year, monthNumber - 1 - monthsBeforeEnd, 1),
    );

    return date.toISOString().slice(0, 7);
  });
}
