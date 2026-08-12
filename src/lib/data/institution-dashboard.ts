import "server-only";

import { getCurrentUser } from "@/lib/auth/current-user";
import {
  formatMonthLabel,
  getSaoPauloMonthStart,
} from "@/lib/dates/sao-paulo";
import { createClient } from "@/lib/supabase/server";

export async function getInstitutionMonthlyIndicator() {
  const user = await getCurrentUser();

  if (!user?.isActive) {
    return null;
  }

  const monthStart = getSaoPauloMonthStart();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc(
    "get_institution_first_time_guests",
    { target_month_start: monthStart },
  );
  const parsedTotal = Number(data ?? 0);

  return {
    monthLabel: formatMonthLabel(monthStart),
    firstTimeGuests: Number.isFinite(parsedTotal) ? parsedTotal : 0,
    hasError: Boolean(error) || !Number.isFinite(parsedTotal),
  };
}
