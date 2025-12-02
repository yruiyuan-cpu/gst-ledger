export type Category = string;

import { supabase } from "./supabase";
import {
  calculateGstClaimable,
  calculateGstSummary,
} from "./utils";
export { isIrdGstSettlement } from "./utils";
import {
  getPeriodStatusForDate,
} from "./gstPeriods";
import { getOrCreateUserSettings } from "./user-settings";
import type { GstFrequency } from "./utils";

export type ExpenseType = "expense" | "income";

export type Expense = {
  id: string;
  userId: string;
  date: string;
  category: string;
  description: string;
  amount: number;
  gstIncluded: boolean;
  gstClaimable: number;
  receiptUrl: string | null;
  createdAt?: string;
  updatedAt?: string;
  deletedAt?: string | null;
  type: ExpenseType;
};

export type ExpenseInput = {
  date: string;
  category: string;
  description?: string;
  amount: number;
  gstIncluded: boolean;
  receiptUrl?: string | null;
  type: ExpenseType;
};

const LOCKED_PERIOD_MESSAGE =
  "This GST period has been filed. Changes are not allowed. Please create an adjustment in a later period instead.";

const getUserFrequency = async (userId: string): Promise<GstFrequency> => {
  const settings = await getOrCreateUserSettings(supabase, userId);
  return settings.gst_frequency;
};

const ensurePeriodAllowsDate = async (
  userId: string,
  date: string,
  frequency: GstFrequency,
) => {
  const status = await getPeriodStatusForDate(
    supabase,
    userId,
    new Date(date),
    frequency,
  );
  if (status === "filed") {
    throw new Error(LOCKED_PERIOD_MESSAGE);
  }
};

type ExpenseRow = {
  id: string | number;
  user_id: string;
  date: string;
  category: string;
  description?: string | null;
  amount: number | string;
  gst_included: boolean;
  gst_claimable: number | string;
  receipt_url?: string | null;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;
  type?: string;
};

export const DASHBOARD_RECENT_TRANSACTIONS_LIMIT = 50;

export const mapExpenseFromRow = (row: ExpenseRow): Expense => {
  const normalizedType =
    row.type && row.type.toLowerCase() === "income" ? "income" : "expense";
  const amount = Number(row.amount ?? 0);
  const gstIncluded = Boolean(row.gst_included);

  return {
    id: String(row.id),
    userId: row.user_id,
    date: row.date,
    category: row.category,
    description: row.description ?? "",
    amount,
    gstIncluded,
    gstClaimable: Number.isFinite(Number(row.gst_claimable))
      ? Number(row.gst_claimable)
      : calculateGstClaimable(amount, gstIncluded, normalizedType),
    receiptUrl: row.receipt_url ?? null,
    createdAt: row.created_at ?? undefined,
    updatedAt: row.updated_at ?? undefined,
    deletedAt: row.deleted_at ?? null,
    type: normalizedType,
  };
};

const buildPayload = (
  input: ExpenseInput,
  userId: string,
): Record<string, unknown> => ({
  user_id: userId,
  date: input.date,
  category: input.category,
  description: input.description ?? "",
  amount: input.amount,
  gst_included: input.gstIncluded,
  gst_claimable: calculateGstClaimable(
    input.amount,
    input.gstIncluded,
    input.type,
  ),
  receipt_url: input.receiptUrl ?? null,
  type: input.type,
});

export const getExpensesForCurrentUser = async (
  userId: string | null,
): Promise<Expense[]> => {
  // 1）如果还没拿到 userId，就先返回空数组，什么都不查
  if (!userId) {
    console.warn("getExpensesForCurrentUser called without userId");
    return [];
  }

  const { data, error } = await supabase
    .from("expenses")
    .select("*")
    .eq("user_id", userId)
    .is("deleted_at", null)
    .order("date", { ascending: false })
    .limit(DASHBOARD_RECENT_TRANSACTIONS_LIMIT);

  // 2）如果 Supabase 报错，只打印一下，不再 throw，让页面正常继续
  if (error) {
    console.error("Failed to load expenses", error);
    return [];
  }

  return (data ?? []).map(mapExpenseFromRow);
};

export const getExpensesForRange = async (
  userId: string,
  from: string,
  to: string,
): Promise<Expense[]> => {
  const { data, error } = await supabase
    .from("expenses")
    .select("*")
    .eq("user_id", userId)
    .gte("date", from)
    .lte("date", to)
    .is("deleted_at", null)
    .order("date", { ascending: false });

  if (error) {
    console.error("Failed to load expenses for range", error);
    throw error;
  }

  return (data ?? []).map(mapExpenseFromRow);
};


export const getExpenseById = async (
  id: string,
  userId: string,
): Promise<Expense | null> => {
  const { data, error } = await supabase
    .from("expenses")
    .select("*")
    .eq("id", id)
    .eq("user_id", userId)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) {
    console.error("Failed to fetch expense", error);
    throw error;
  }

  return data ? mapExpenseFromRow(data) : null;
};

export const createExpense = async (
  userId: string,
  input: ExpenseInput,
): Promise<Expense> => {
  const frequency = await getUserFrequency(userId);
  await ensurePeriodAllowsDate(userId, input.date, frequency);

  const payload = buildPayload(input, userId);
  const { data, error } = await supabase
    .from("expenses")
    .insert([payload])
    .select("*")
    .single();

  if (error) {
    console.error("Create expense error:", {
      message: error.message,
      details: error.details,
      hint: error.hint,
    });
    throw error;
  }

  return mapExpenseFromRow(data);
};

export const updateExpense = async (
  id: string,
  userId: string,
  input: ExpenseInput,
): Promise<Expense> => {
  const { data: existing, error: existingError } = await supabase
    .from("expenses")
    .select("date")
    .eq("id", id)
    .eq("user_id", userId)
    .maybeSingle();

  if (existingError) {
    console.error("Failed to load expense for update", existingError);
    throw existingError;
  }

  if (!existing) {
    throw new Error("Transaction not found.");
  }

  const frequency = await getUserFrequency(userId);
  await ensurePeriodAllowsDate(userId, existing.date, frequency);
  await ensurePeriodAllowsDate(userId, input.date, frequency);

  const payload = buildPayload(input, userId);
  const { data, error } = await supabase
    .from("expenses")
    .update(payload)
    .eq("id", id)
    .eq("user_id", userId)
    .select("*")
    .single();

  if (error) {
    console.error("Update expense error:", {
      message: error.message,
      details: error.details,
      hint: error.hint,
    });
    throw error;
  }

  return mapExpenseFromRow(data);
};

export const deleteExpense = async (id: string, userId: string) => {
  const { data: existing, error: fetchError } = await supabase
    .from("expenses")
    .select("date")
    .eq("id", id)
    .eq("user_id", userId)
    .maybeSingle();

  if (fetchError) {
    console.error("Failed to load expense for delete", fetchError);
    throw fetchError;
  }
  if (!existing) throw new Error("Transaction not found.");

  const frequency = await getUserFrequency(userId);
  await ensurePeriodAllowsDate(userId, existing.date, frequency);

  const { error } = await supabase
    .from("expenses")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", userId);

  if (error) {
    console.error("Delete expense error:", {
      message: error.message,
      details: error.details,
      hint: error.hint,
    });
    throw error;
  }
};

export const calculateGstBreakdown = (records: Expense[]) => {
  const summary = calculateGstSummary(records);

  return {
    totalExpenseAmount: summary.totalSpendingInclGst,
    totalExpenseGstClaimable: summary.gstToClaim,
    totalIncomeAmount: summary.totalSalesInclGst,
    totalIncomeGst: summary.gstOnSales,
    netGst: summary.netGst,
  };
};
