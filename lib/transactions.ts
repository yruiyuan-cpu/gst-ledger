export type Category = string;

import { supabase } from "./supabase";
import { calculateGstClaimable } from "./utils";

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
  type?: string;
};

const mapExpenseFromRow = (row: ExpenseRow): Expense => ({
  id: String(row.id),
  userId: row.user_id,
  date: row.date,
  category: row.category,
  description: row.description ?? "",
  amount: Number(row.amount ?? 0),
  gstIncluded: Boolean(row.gst_included),
  gstClaimable: Number(row.gst_claimable ?? 0),
  receiptUrl: row.receipt_url ?? null,
  createdAt: row.created_at ?? undefined,
  updatedAt: row.updated_at ?? undefined,
  type:
    row.type && row.type.toLowerCase() === "income" ? "income" : "expense",
});

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
  gst_claimable: calculateGstClaimable(input.amount, input.gstIncluded),
  receipt_url: input.receiptUrl ?? null,
  type: input.type,
});

export const getExpensesForCurrentUser = async (
  userId: string,
): Promise<Expense[]> => {
  const { data, error } = await supabase
    .from("expenses")
    .select("*")
    .eq("user_id", userId)
    .order("date", { ascending: false })
    .limit(200);

  if (error) {
    console.error("Failed to load expenses", error);
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
    .single();

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
  const { error } = await supabase
    .from("expenses")
    .delete()
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
  const initial = {
    totalExpenseAmount: 0,
    totalExpenseGstClaimable: 0,
    totalIncomeAmount: 0,
  };
  const totals = records.reduce((acc, record) => {
    if (record.type === "income") {
      acc.totalIncomeAmount += record.amount;
    } else {
      acc.totalExpenseAmount += record.amount;
      acc.totalExpenseGstClaimable += record.gstClaimable;
    }
    return acc;
  }, initial);

  const totalIncomeGst = Math.round(((totals.totalIncomeAmount * 3) / 23) * 100) / 100;
  const netGst = totalIncomeGst - totals.totalExpenseGstClaimable;

  return {
    ...totals,
    totalIncomeGst,
    netGst,
  };
};
