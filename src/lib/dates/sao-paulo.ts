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
