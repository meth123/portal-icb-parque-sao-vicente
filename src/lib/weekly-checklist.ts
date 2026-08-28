import { getSaoPauloDate } from "./dates/sao-paulo.ts";

export type WeeklyChecklistPeriod = {
  weekStartsOn: string;
  weekEndsOn: string;
  opensOn: string;
  closesOn: string;
  isOpen: boolean;
};

function parseDate(date: string) {
  return new Date(`${date}T12:00:00Z`);
}

function formatDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function addDays(date: Date, days: number) {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

export function getWeeklyChecklistPeriod(date = new Date()): WeeklyChecklistPeriod {
  const localDate = getSaoPauloDate(date);
  const today = parseDate(localDate);
  const isoWeekday = today.getUTCDay() === 0 ? 7 : today.getUTCDay();
  const currentMonday = addDays(today, -(isoWeekday - 1));
  const weekStartsOn = addDays(currentMonday, -7);
  const weekEndsOn = addDays(currentMonday, -1);
  const closesOn = addDays(currentMonday, 2);

  return {
    weekStartsOn: formatDate(weekStartsOn),
    weekEndsOn: formatDate(weekEndsOn),
    opensOn: formatDate(currentMonday),
    closesOn: formatDate(closesOn),
    isOpen: today >= currentMonday && today <= closesOn,
  };
}

export function formatWeeklyChecklistRange(period: WeeklyChecklistPeriod) {
  const formatter = new Intl.DateTimeFormat("pt-BR", {
    timeZone: "UTC",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  return `${formatter.format(parseDate(period.weekStartsOn))} a ${formatter.format(parseDate(period.weekEndsOn))}`;
}
