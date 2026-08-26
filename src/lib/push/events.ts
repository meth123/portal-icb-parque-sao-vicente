import { getSaoPauloDate } from "../dates/sao-paulo.ts";
import { getWeeklyChecklistPeriod } from "../weekly-checklist.ts";

export type WeeklyPushEventType =
  | "weekly-form-last-day"
  | "checklist-open"
  | "checklist-last-day";

export type WeeklyPushEvent = {
  key: string;
  type: WeeklyPushEventType;
  date: string;
  weekEndsOn: string;
  title: string;
  message: string;
  destination: string;
};

const simulationDatePattern = /^\d{4}-\d{2}-\d{2}$/;

export function parsePushSimulationDate(value: string) {
  if (!simulationDatePattern.test(value)) return null;

  const date = new Date(`${value}T12:00:00Z`);

  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
    return null;
  }

  return date;
}

export function getWeeklyPushEvent(date = new Date()): WeeklyPushEvent | null {
  const today = getSaoPauloDate(date);
  const checklistPeriod = getWeeklyChecklistPeriod(date);

  if (today === checklistPeriod.opensOn) {
    return {
      key: `checklist-open:${checklistPeriod.opensOn}`,
      type: "checklist-open",
      date: today,
      weekEndsOn: checklistPeriod.weekEndsOn,
      title: "📋 Checklist semanal disponível",
      message: "O checklist desta semana já está aberto. Toque para responder.",
      destination: "/portal/checklist",
    };
  }

  if (today === checklistPeriod.closesOn) {
    return {
      key: `checklist-last-day:${checklistPeriod.closesOn}`,
      type: "checklist-last-day",
      date: today,
      weekEndsOn: checklistPeriod.weekEndsOn,
      title: "⏰ Último dia para finalizar o checklist",
      message: "Hoje é o último dia para finalizar o checklist semanal.",
      destination: "/portal/checklist",
    };
  }

  const weekday = new Date(`${today}T12:00:00Z`).getUTCDay();

  if (weekday === 0) {
    return {
      key: `weekly-form-last-day:${today}`,
      type: "weekly-form-last-day",
      date: today,
      weekEndsOn: today,
      title: "📝 Último dia para preencher a ficha",
      message: "Hoje é o último dia para preencher a ficha semanal.",
      destination: "/portal/relatorios/novo",
    };
  }

  return null;
}
