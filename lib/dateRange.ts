export type DateRangePreset = "this_month" | "last_2_months" | "custom";
export type DatePresetKey =
  | "thisMonth"
  | "lastMonth"
  | "last2Months"
  | "all";

export const DATE_PRESETS: { key: DatePresetKey; label: string }[] = [
  { key: "thisMonth", label: "This month" },
  { key: "lastMonth", label: "Last month" },
  { key: "last2Months", label: "Last 2 months" },
  { key: "all", label: "All time" },
];

export type DateRange = {
  preset: DateRangePreset;
  from: string;
  to: string;
};

const formatDate = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export const getRangeForPreset = (
  preset: Exclude<DateRangePreset, "custom">,
  baseDate = new Date(),
) => {
  const today = new Date(
    baseDate.getFullYear(),
    baseDate.getMonth(),
    baseDate.getDate(),
  );

  if (preset === "this_month") {
    const start = new Date(today.getFullYear(), today.getMonth(), 1);
    const end = new Date(today.getFullYear(), today.getMonth() + 1, 0); // inclusive end of month
    return { from: formatDate(start), to: formatDate(end) };
  }

  const start = new Date(today.getFullYear(), today.getMonth() - 2, 1);
  const end = new Date(today.getFullYear(), today.getMonth() + 1, 0); // inclusive end of current month
  return { from: formatDate(start), to: formatDate(end) };
};

export const getPresetRange = (
  key: DatePresetKey,
  baseDate = new Date(),
): { from: string | null; to: string | null } => {
  const today = new Date(
    baseDate.getFullYear(),
    baseDate.getMonth(),
    baseDate.getDate(),
  );

  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);

  if (key === "thisMonth") {
    return { from: formatDate(monthStart), to: formatDate(monthEnd) };
  }

  if (key === "lastMonth") {
    const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);
    return { from: formatDate(lastMonthStart), to: formatDate(lastMonthEnd) };
  }

  if (key === "last2Months") {
    const start = new Date(today.getFullYear(), today.getMonth() - 2, 1);
    const end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    return { from: formatDate(start), to: formatDate(end) };
  }

  return { from: null, to: null };
};
