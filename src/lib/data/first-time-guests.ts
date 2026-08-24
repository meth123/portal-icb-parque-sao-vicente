import "server-only";

import { getCurrentUser } from "@/lib/auth/current-user";
import { formatMonthLabel } from "@/lib/dates/sao-paulo";
import { createClient } from "@/lib/supabase/server";

type RawFirstTimeGuestMonth = {
  monthStart?: unknown;
  total?: unknown;
};

type RawFirstTimeGuestHistory = {
  accumulatedTotal?: unknown;
  months?: unknown;
};

export type FirstTimeGuestMonth = {
  monthStart: string;
  monthLabel: string;
  total: number;
};

export type FirstTimeGuestHistory = {
  accumulatedTotal: number;
  months: FirstTimeGuestMonth[];
  hasError: boolean;
};

const monthStartPattern = /^\d{4}-(0[1-9]|1[0-2])-01$/;

function parseNonNegativeInteger(value: unknown) {
  const parsed = Number(value);

  return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : null;
}

function parseMonth(value: unknown): FirstTimeGuestMonth | null {
  if (!value || typeof value !== "object") return null;

  const month = value as RawFirstTimeGuestMonth;
  const total = parseNonNegativeInteger(month.total);

  if (
    typeof month.monthStart !== "string" ||
    !monthStartPattern.test(month.monthStart) ||
    total === null
  ) {
    return null;
  }

  return {
    monthStart: month.monthStart,
    monthLabel: formatMonthLabel(month.monthStart),
    total,
  };
}

export async function getFirstTimeGuestHistory(): Promise<FirstTimeGuestHistory | null> {
  const user = await getCurrentUser();

  if (!user?.isActive) return null;

  const supabase = await createClient();
  const { data, error } = await supabase.rpc(
    "get_institution_first_time_guests_history",
  );
  const history = data as RawFirstTimeGuestHistory | null;
  const accumulatedTotal = parseNonNegativeInteger(history?.accumulatedTotal);
  const rawMonths = history?.months;
  const months = Array.isArray(rawMonths)
    ? rawMonths.map(parseMonth).filter((month) => month !== null)
    : [];
  const hasInvalidMonths =
    Array.isArray(rawMonths) && months.length !== rawMonths.length;

  if (
    error ||
    !history ||
    accumulatedTotal === null ||
    !Array.isArray(rawMonths) ||
    hasInvalidMonths
  ) {
    return {
      accumulatedTotal: 0,
      months: [],
      hasError: true,
    };
  }

  return {
    accumulatedTotal,
    months,
    hasError: false,
  };
}
