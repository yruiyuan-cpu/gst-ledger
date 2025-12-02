import type { SupabaseClient } from "@supabase/supabase-js";
import type { GstFrequency } from "./utils";

export type GstPeriodStatus = "open" | "ready_to_file" | "filed";

export interface GstPeriod {
  id: number;
  user_id: string;
  start_date: string; // ISO date string (yyyy-MM-dd)
  end_date: string; // ISO date string (yyyy-MM-dd)
  status: GstPeriodStatus;
}

const formatDateOnly = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export function getPeriodRange(
  frequency: GstFrequency,
  baseDate: Date,
): { start: Date; end: Date } {
  const date = new Date(
    baseDate.getFullYear(),
    baseDate.getMonth(),
    baseDate.getDate(),
  );
  const year = date.getFullYear();
  const month = date.getMonth(); // zero-based

  if (frequency === "monthly") {
    const start = new Date(year, month, 1);
    const end = new Date(year, month + 1, 0);
    return { start, end };
  }

  if (frequency === "two-monthly") {
    const startMonth = month % 2 === 0 ? month : month - 1; // odd-numbered months (1,3,5...) start the period
    const start = new Date(year, startMonth, 1);
    const end = new Date(year, startMonth + 2, 0);
    return { start, end };
  }

  // six-monthly
  const startMonth = month < 6 ? 0 : 6;
  const start = new Date(year, startMonth, 1);
  const end = new Date(year, startMonth + 6, 0);
  return { start, end };
}

const mapPeriodRow = (row: {
  id: number;
  user_id: string;
  start_date: string;
  end_date: string;
  status: GstPeriodStatus;
}): GstPeriod => ({
  id: row.id,
  user_id: row.user_id,
  start_date: row.start_date,
  end_date: row.end_date,
  status: row.status,
});

export async function getOrCreateCurrentPeriod(
  supabase: SupabaseClient,
  userId: string,
  frequency: GstFrequency,
  baseDate: Date,
): Promise<GstPeriod> {
  const range = getPeriodRange(frequency, baseDate);
  const startDate = formatDateOnly(range.start);
  const endDate = formatDateOnly(range.end);

  const { data: existing, error: existingError } = await supabase
    .from("gst_periods")
    .select("*")
    .eq("user_id", userId)
    .eq("start_date", startDate)
    .eq("end_date", endDate)
    .maybeSingle();

  if (existingError) {
    console.error("Failed to query GST period", existingError);
  }

  if (existing) {
    return mapPeriodRow(existing);
  }

  const { data, error } = await supabase
    .from("gst_periods")
    .insert({
      user_id: userId,
      start_date: startDate,
      end_date: endDate,
      status: "open",
    })
    .select("*")
    .maybeSingle();

  if (error) {
    // Unique constraint might have raced; try to fetch again.
    if ((error as { code?: string }).code === "23505") {
      const { data: retry } = await supabase
        .from("gst_periods")
        .select("*")
        .eq("user_id", userId)
        .eq("start_date", startDate)
        .eq("end_date", endDate)
        .maybeSingle();
      if (retry) return mapPeriodRow(retry);
    }
    console.error("Failed to create GST period", error);
    throw error;
  }

  if (!data) {
    throw new Error("Unable to create GST period");
  }

  return mapPeriodRow(data);
}

export async function getPeriodStatusForDate(
  supabase: SupabaseClient,
  userId: string,
  date: Date,
  frequency: GstFrequency,
): Promise<GstPeriodStatus | null> {
  const range = getPeriodRange(frequency, date);
  const startDate = formatDateOnly(range.start);
  const endDate = formatDateOnly(range.end);

  const { data, error } = await supabase
    .from("gst_periods")
    .select("status")
    .eq("user_id", userId)
    .eq("start_date", startDate)
    .eq("end_date", endDate)
    .maybeSingle();

  if (error) {
    console.error("Failed to fetch GST period status", error);
    return "open";
  }

  return (data?.status as GstPeriodStatus | undefined) ?? "open";
}

export async function listRecentPeriods(
  supabase: SupabaseClient,
  userId: string,
  limit = 6,
): Promise<GstPeriod[]> {
  const { data, error } = await supabase
    .from("gst_periods")
    .select("*")
    .eq("user_id", userId)
    .order("start_date", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("Failed to list GST periods", error);
    return [];
  }

  return (data ?? []).map(mapPeriodRow);
}

export const formatPeriodRangeLabel = (period: GstPeriod) =>
  `${period.start_date} – ${period.end_date}`;
