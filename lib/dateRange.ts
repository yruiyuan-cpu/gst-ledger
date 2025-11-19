export type DateRangePreset = "this_month" | "last_2_months" | "custom";

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
    return { from: formatDate(start), to: formatDate(today) };
  }

  const start = new Date(today.getFullYear(), today.getMonth() - 2, 1);
  return { from: formatDate(start), to: formatDate(today) };
};
