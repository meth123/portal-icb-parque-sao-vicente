import { getSaoPauloDate } from "./dates/sao-paulo.ts";

export type ChecklistResultsPeriodType = "weekly" | "monthly";

const monthPattern = /^\d{4}-(0[1-9]|1[0-2])$/;
const datePattern = /^\d{4}-(0[1-9]|1[0-2])-([0-2]\d|3[01])$/;

function parseDate(value: string) {
  return new Date(`${value}T12:00:00Z`);
}

function formatDate(value: Date) {
  return value.toISOString().slice(0, 10);
}

function addDays(value: string, days: number) {
  const date = parseDate(value);
  date.setUTCDate(date.getUTCDate() + days);
  return formatDate(date);
}

function isMonday(value: string) {
  if (!datePattern.test(value)) return false;
  const parsed = parseDate(value);
  return formatDate(parsed) === value && parsed.getUTCDay() === 1;
}

export function normalizeChecklistResultsPeriodType(
  value: string | undefined,
): ChecklistResultsPeriodType {
  return value === "weekly" || value === "semanal" ? "weekly" : "monthly";
}

export function getLatestClosedChecklistWeek(date = new Date()) {
  const today = getSaoPauloDate(date);
  const localDate = parseDate(today);
  const isoWeekday = localDate.getUTCDay() === 0 ? 7 : localDate.getUTCDay();
  const currentMonday = addDays(today, -(isoWeekday - 1));
  const checklistWeek = addDays(currentMonday, -7);

  return isoWeekday <= 3 ? addDays(checklistWeek, -7) : checklistWeek;
}

export function normalizeChecklistResultsMonth(
  value: string | undefined,
  date = new Date(),
) {
  if (value && monthPattern.test(value)) return value;
  return getSaoPauloDate(date).slice(0, 7);
}

export function normalizeChecklistResultsWeek(
  value: string | undefined,
  date = new Date(),
) {
  return value && isMonday(value)
    ? value
    : getLatestClosedChecklistWeek(date);
}

export function normalizeChecklistNetworkCode(value: string | undefined) {
  const normalized = value?.trim().toUpperCase().replaceAll(".", "") ?? "";
  if (normalized === "RJ") return "RJ";
  if (normalized === "HM") return "H.M";
  return null;
}

export function formatChecklistPeriodLabel(
  periodType: ChecklistResultsPeriodType,
  periodStart: string,
  periodEnd: string,
) {
  if (periodType === "monthly") {
    const label = new Intl.DateTimeFormat("pt-BR", {
      timeZone: "UTC",
      month: "long",
      year: "numeric",
    }).format(parseDate(periodStart));

    return label.charAt(0).toUpperCase() + label.slice(1);
  }

  const formatter = new Intl.DateTimeFormat("pt-BR", {
    timeZone: "UTC",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  return `${formatter.format(parseDate(periodStart))} a ${formatter.format(parseDate(periodEnd))}`;
}

export function formatChecklistAvailableAt(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    dateStyle: "short",
  }).format(new Date(value));
}
