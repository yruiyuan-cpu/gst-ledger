import { ALL_CATEGORIES } from "./categories";
import { supabase } from "./supabase";
import { getDefaultGstIncluded } from "./utils";
import { getOrCreateUserSettings } from "./user-settings";
import {
  getPeriodRange,
  getPeriodStatusForDate,
  type GstPeriodStatus,
} from "./gstPeriods";
import type { GstFrequency } from "./utils";

export type BankRawRow = {
  raw: Record<string, unknown>;
  date: string | null;
  description: string | null;
  amount: number | null;
  counterparty: string | null;
};

export type CategoryOption = {
  id: string;
  name: string;
};

export type BankImportRow = {
  id: string;
  import: boolean;
  date: string | null;
  description: string | null;
  amount: number | null;
  counterparty: string | null;
  transactionType: "expense" | "income";
  categoryId: string | null;
  gstIncluded?: boolean;
};

export const CATEGORY_OPTIONS: CategoryOption[] = ALL_CATEGORIES.map((name) => ({
  id: name,
  name,
}));

export type BankDedupInput = {
  date: string;
  amount: number;
  counterparty?: string | null;
  description?: string | null;
};

export const buildDedupeKey = (input: BankDedupInput): string => {
  const normalizedDate = normalizeDate(input.date) ?? input.date;
  const normalizedAmount = Math.round(input.amount * 100) / 100;
  const text = `${input.counterparty ?? ""} ${input.description ?? ""}`
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 40); // keep it short and stable

  return `${normalizedDate}|${normalizedAmount.toFixed(2)}|${text}`;
};

const normalizeDate = (value: string | null): string | null => {
  if (!value) return null;

  const trimmed = value.trim();
  if (!trimmed) return null;

  // 支持 2025/11/01 和 2025-11-01 两种格式
  const parts = trimmed.split(/[\/\-]/);
  if (parts.length !== 3) return null;

  const [year, month, day] = parts;
  if (!year || !month || !day) return null;

  const mm = month.padStart(2, "0");
  const dd = day.padStart(2, "0");

  return `${year}-${mm}-${dd}`;
};

const parseAmount = (value: unknown): number | null => {
  if (value === null || value === undefined) return null;
  const cleaned = String(value).replace(/[^0-9.-]/g, "");
  const num = Number.parseFloat(cleaned);
  return Number.isNaN(num) ? null : num;
};

export const mapRawRow = (row: Record<string, unknown>): BankRawRow => {
  const normalized = Object.entries(row ?? {}).reduce<Record<string, unknown>>(
    (acc, [key, value]) => {
      acc[key.toLowerCase().trim()] = value;
      return acc;
    },
    {},
  );

  const pickCombined = (keys: string[]): string | null => {
    const parts = keys
      .map((key) => normalized[key.toLowerCase()])
      .filter(
        (value): value is string | number | boolean =>
          value !== undefined && value !== null && String(value).trim() !== "",
      )
      .map((value) => String(value).trim());

    if (parts.length === 0) return null;
    return parts.join(" ").replace(/\s+/g, " ").trim();
  };

  const pickValue = (keys: string[]): string | null => {
    for (const key of keys) {
      const found = normalized[key.toLowerCase()];
      if (found !== undefined && found !== null && String(found).trim() !== "") {
        return String(found).trim();
      }
    }
    return null;
  };

  const date = normalizeDate(pickValue(["date", "transaction date"]));
  const description =
    pickCombined(["description", "particulars", "code", "reference"]) ??
    pickValue(["description"]);
  const counterparty = pickValue(["payee", "other party", "name"]);
  const amountRaw = pickValue(["amount"]);

  return {
    raw: row,
    date,
    description,
    amount: parseAmount(amountRaw),
    counterparty,
  };
};

export const findCategoryIdByName = (
  targetName: string,
  categories: CategoryOption[],
): string | null => {
  const match = categories.find(
    (category) => category.name.toLowerCase() === targetName.toLowerCase(),
  );
  return match ? match.id : null;
};

const normalizeText = (text: string) =>
  text.toLowerCase().replace(/\s+/g, " ").trim();

export const guessCategoryForText = (
  text: string,
  transactionType: "income" | "expense",
  categories: CategoryOption[],
): string | null => {
  const lower = normalizeText(text);

  // IRD – GST payment / refund should take precedence over other rules
  if (
    lower.includes(" ird ") ||
    lower.includes("i.r.d") ||
    lower.includes("inland revenue") ||
    lower.startsWith("ird") ||
    lower.includes(" ird")
  ) {
    const targetName =
      transactionType === "income" ? "Refund from IRD" : "Pay to IRD";
    const categoryId = findCategoryIdByName(targetName, categories);
    if (categoryId) return categoryId;
  }

  // Income-specific: Owner's funding
  if (
    transactionType === "income" &&
    (lower.includes("owners capital") ||
      lower.includes("owner's capital") ||
      lower.includes("d/c from yang") ||
      lower.includes("d/c from guo") ||
      lower.includes("d/c from"))
  ) {
    return findCategoryIdByName("Owner's funding", categories);
  }

  // IRD related rules (other specific IRD cases)
  const hasIrd =
    lower.includes("ird") ||
    lower.includes("i.r.d") ||
    lower.includes("inland revenue");

  if (hasIrd && transactionType === "expense") {
    return (
      findCategoryIdByName("Pay to IRD", categories) ??
      findCategoryIdByName("Other IRD payments", categories)
    );
  }

  if (hasIrd && transactionType === "income") {
    return (
      findCategoryIdByName("Refund from IRD", categories) ??
      findCategoryIdByName("GST refund from IRD", categories)
    );
  }

  // Financial loan
  if (
    lower.includes("udc finance") ||
    lower.includes("instalment") ||
    lower.includes("installment")
  ) {
    return findCategoryIdByName("Financial loan", categories);
  }

  // Internet & mobile
  if (
    lower.includes("2degrees") ||
    lower.includes("spark") ||
    lower.includes("vodafone") ||
    lower.includes("skinny")
  ) {
    return findCategoryIdByName("Internet & mobile phone", categories);
  }

  // Insurance
  if (
    lower.includes("vero insuran") ||
    lower.includes("aia") ||
    lower.includes("southern cross") ||
    lower.includes("insurance")
  ) {
    return findCategoryIdByName("Insurance", categories);
  }

  // Travel & transport
  if (
    lower.includes("uber") ||
    lower.includes(" taxi") ||
    lower.includes("cab ") ||
    lower.includes("airport shuttle") ||
    lower.includes(" parking") ||
    lower.includes("carpark") ||
    lower.includes("z energy") ||
    lower.includes("bp ") ||
    lower.includes("caltex") ||
    lower.includes("mobil") ||
    lower.includes("gull")
  ) {
    return findCategoryIdByName("Travel & transport", categories);
  }

  // Client entertainment & meals
  if (
    lower.includes("cafe") ||
    lower.includes(" coffee") ||
    lower.includes("tea bar") ||
    lower.includes("majesticteabar") ||
    lower.includes("restaurant") ||
    lower.includes("cuisine") ||
    lower.includes(" bar") ||
    lower.includes(" pub") ||
    lower.includes("bistro") ||
    lower.includes("izakaya") ||
    lower.includes("mcdonald") ||
    lower.includes("kfc") ||
    lower.includes("burger king") ||
    lower.includes("subway")
  ) {
    return findCategoryIdByName("Client entertainment & meals", categories);
  }

  // Office supplies & stationery
  if (
    lower.includes("kmart") ||
    lower.includes("the warehouse") ||
    lower.includes("warehouse stationery") ||
    lower.includes("farmers") ||
    lower.includes("paper plus") ||
    lower.includes("chemist warehouse")
  ) {
    return findCategoryIdByName("Office supplies & stationery", categories);
  }

  // Other general expenses
  if (
    lower.includes("westfield shopping") ||
    lower.includes("shopping ctre") ||
    lower.includes("shopping centre") ||
    lower.includes("shopping center") ||
    lower.includes(" mall")
  ) {
    return findCategoryIdByName("Other general expenses", categories);
  }

  return null;
};

export const guessImportRow = (
  raw: BankRawRow,
  categories: CategoryOption[] = CATEGORY_OPTIONS,
): BankImportRow => {
  const makeId = () =>
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

  const transactionType: "expense" | "income" =
    raw.amount !== null && raw.amount > 0 ? "income" : "expense";

  const combinedText = `${raw.description ?? ""} ${raw.counterparty ?? ""}`;
  const categoryId =
    guessCategoryForText(combinedText, transactionType, categories) ??
    findCategoryIdByName("Other general expenses", categories);
  const gstIncluded = getDefaultGstIncluded(transactionType, categoryId);

  return {
    id: makeId(),
    import: true,
    date: raw.date,
    description: raw.description,
    amount: raw.amount,
    counterparty: raw.counterparty,
    transactionType,
    categoryId,
    gstIncluded,
  };
};

export const importBankRows = async (
  userId: string,
  rows: BankImportRow[],
): Promise<{ imported: number; skipped: number; lockedSkipped: number }> => {
  const userSettings = await getOrCreateUserSettings(supabase, userId);
  const frequency = userSettings.gst_frequency as GstFrequency;
  const periodStatusCache = new Map<string, GstPeriodStatus>();

  const getStatusForDate = async (date: string) => {
    const jsDate = new Date(date);
    const range = getPeriodRange(frequency, jsDate);
    const key = `${range.start.toISOString().slice(0, 10)}|${range.end.toISOString().slice(0, 10)}`;
    if (periodStatusCache.has(key)) {
      return periodStatusCache.get(key);
    }
    const status = await getPeriodStatusForDate(
      supabase,
      userId,
      jsDate,
      frequency,
    );
    periodStatusCache.set(key, status);
    return status;
  };

  const validRows = rows
    .filter((row) => row.import && row.amount !== null && row.date)
    .map((row) => ({
      ...row,
      date: normalizeDate(row.date),
    }))
    .filter(
      (row): row is BankImportRow & { date: string } => Boolean(row.date),
    );

  if (validRows.length === 0) {
    return { imported: 0, skipped: rows.length };
  }

  const dates = validRows.map((row) => row.date);
  const minDate = dates.reduce((a, b) => (a < b ? a : b));
  const maxDate = dates.reduce((a, b) => (a > b ? a : b));

  // Fetch existing rows in date range to build dedupe set.
  const { data: existingData, error: existingError } = await supabase
    .from("expenses")
    .select("date, amount, description")
    .eq("user_id", userId)
    .gte("date", minDate)
    .lte("date", maxDate);

  if (existingError) throw existingError;

  const existingKeys = new Set(
    (existingData ?? []).map((item) =>
      buildDedupeKey({
        date: item.date,
        amount: Number(item.amount ?? 0),
        description: item.description ?? "",
      }),
    ),
  );

  const rowsToInsert: {
    user_id: string;
    date: string;
    amount: number;
    gst_included: boolean;
    gst_claimable: number;
    type: string;
    category: string;
    description: string;
    source: string;
  }[] = [];
  let skippedCount = 0;
  let lockedSkipped = 0;

  for (let index = 0; index < validRows.length; index += 1) {
    const row = validRows[index];
    const signedAmount = row.amount ?? 0;
    // Amounts are stored as positive numbers; type carries the intent (expense vs income).
    const amountToStore = Math.round(Math.abs(signedAmount) * 100) / 100;
    const descriptionParts = [
      row.counterparty?.trim() ?? "",
      row.description?.trim() ?? "",
    ].filter(Boolean);
    const description =
      descriptionParts.join(" - ") || "Imported transaction";

    const status = await getStatusForDate(row.date);
    if (status === "filed") {
      lockedSkipped += 1;
      continue;
    }

    const dedupeKey = buildDedupeKey({
      date: row.date,
      amount: amountToStore,
      description,
    });

    if (existingKeys.has(dedupeKey)) {
      skippedCount += 1;
      continue;
    }

    existingKeys.add(dedupeKey);

    rowsToInsert.push({
      user_id: userId,
      date: row.date,
      amount: amountToStore,
      gst_included: row.gstIncluded ?? getDefaultGstIncluded(row.transactionType, row.categoryId),
      gst_claimable: 0,
      type: row.transactionType === "income" ? "income" : "expense",
      category: row.categoryId ?? "Other general expenses",
      description,
      source: "bank_import",
    });
  }

  if (rowsToInsert.length === 0) {
    return { imported: 0, skipped: skippedCount, lockedSkipped };
  }

  const { data: inserted, error } = await supabase
    .from("expenses")
    .insert(rowsToInsert)
    .select("id");

  if (error) {
    throw error;
  }

  const insertedCount = inserted?.length ?? rowsToInsert.length;
  return { imported: insertedCount, skipped: skippedCount, lockedSkipped };
};
