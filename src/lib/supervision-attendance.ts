const datePattern = /^(\d{4})-(\d{2})-(\d{2})$/;

export function isValidSupervisionDate(value: string) {
  const match = datePattern.exec(value);
  if (!match) return false;

  const parsed = new Date(
    Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])),
  );
  return parsed.toISOString().slice(0, 10) === value;
}

export function normalizeSupervisionNetworkCode(value: string) {
  const normalized = value.trim().toUpperCase().replaceAll(".", "");
  if (normalized === "RJ") return "RJ";
  if (normalized === "HM") return "H.M";
  return null;
}

export function supervisionNetworkLabel(code: string) {
  return code === "H.M" ? "HM" : code;
}

export function formatSupervisionDate(date: string) {
  return new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" }).format(
    new Date(`${date}T12:00:00Z`),
  );
}

export function attendancePercentage(present: number, total: number) {
  return total === 0 ? 0 : Math.round((present * 100) / total);
}
