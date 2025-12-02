import type { Category, Expense } from "./transactions";
import { isCategoryIncludedInGst } from "./categories";
import type { SupabaseClient } from "@supabase/supabase-js";

export type GstFrequency = "monthly" | "two-monthly" | "six-monthly";

export const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-NZ", {
    style: "currency",
    currency: "NZD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);

export const formatDate = (value: string) =>
  new Intl.DateTimeFormat("en-NZ", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));

export const displayAmountWithSign = (
  amount: number,
  type: string = "Expense",
) => {
  const sign = type.toLowerCase() === "income" ? "+" : "-";
  return `${sign}${formatCurrency(amount)}`;
};

export const getDefaultGstIncluded = (
  _type: "expense" | "income",
  categoryName?: Category | null,
) => {
  return isCategoryIncludedInGst(categoryName ?? "") ?? true;
};

// Keep backward-compatible name used elsewhere.
export const isGstDefaultIncluded = (category?: Category) =>
  getDefaultGstIncluded("expense", category);

export const sortByDateDesc = (
  a: { date: string },
  b: { date: string },
) => new Date(b.date).getTime() - new Date(a.date).getTime();

export const getTransactionGstClaimable = (tx: Expense) => {
  const raw = (tx as { gstClaimable?: number; gst_claimable?: number }).gstClaimable ?? (tx as { gst_claimable?: number }).gst_claimable ?? 0;
  const value = Number(raw);
  return Number.isFinite(value) ? value : 0;
};

export const isIrdGstSettlement = (tx: Expense) => {
  const category = tx.category?.toLowerCase?.() ?? "";
  const memo =
    (tx as { memo?: string | null }).memo?.toLowerCase?.() ?? "";
  const payee =
    (tx as { payee?: string | null }).payee?.toLowerCase?.() ?? "";

  // Treat any transaction involving IRD as a GST settlement transaction
  // (e.g. GST payment to IRD or GST refund from IRD).
  return (
    category.includes("ird") ||
    memo.includes("ird") ||
    payee.includes("ird")
  );
};

export const calculateExpenseSummary = (transactions: Expense[]) => {
  const normalTransactions = transactions.filter((tx) =>
    isCategoryIncludedInGst(tx.category),
  );
  const expenses = normalTransactions.filter((tx) => tx.type !== "income");

  // Amounts should already be positive; Math.abs guards older rows that may still be negative.
  const totalSpending = expenses.reduce(
    (sum, tx) => sum + Math.abs(tx.amount),
    0,
  );
  const gstAble = expenses
    .filter((tx) => tx.gstIncluded)
    .reduce((sum, tx) => sum + Math.abs(tx.amount), 0);
  const gstToClaim = expenses.reduce(
    (sum, tx) => sum + getTransactionGstClaimable(tx),
    0,
  );

  return { totalSpending, gstAble, gstToClaim, gstClaimable: gstToClaim };
};

export const calculateGstFromGross = (amount: number) =>
  // For NZ 15% GST, GST portion of a GST-inclusive total is 15/115 (3/23).
  (amount * 3) / 23;

export const calculateGstClaimable = (
  amount: number,
  gstIncluded: boolean,
  type?: Expense["type"],
): number => {
  if (!gstIncluded) return 0;
  if (type && type.toLowerCase() === "income") return 0;

  const GST_RATE = 0.15;
  const abs = Math.abs(amount);
  const gstComponent = abs - abs / (1 + GST_RATE);
  return Number(gstComponent.toFixed(2));
};

export const filterTransactionsByRange = (
  transactions: Expense[],
  range: { from?: string; to?: string },
) => {
  if (!range?.from || !range?.to) return transactions;
  const from = new Date(range.from);
  const to = new Date(range.to);
  to.setHours(23, 59, 59, 999);

  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
    return transactions;
  }

  return transactions.filter((transaction) => {
    const date = new Date(transaction.date);
    return date >= from && date <= to;
  });
};

export type GstSummary = {
  totalSpendingInclGst: number;
  totalSalesInclGst: number;
  gstOnSales: number;
  gstToClaim: number;
  netGst: number;
};

const emptySummary: GstSummary = {
  totalSpendingInclGst: 0,
  totalSalesInclGst: 0,
  gstOnSales: 0,
  gstToClaim: 0,
  netGst: 0,
};

export const calculateGstSummary = (expenses: Expense[]): GstSummary => {
  if (!expenses?.length) return emptySummary;

  const eligible = expenses.filter((tx) => isCategoryIncludedInGst(tx.category));
  const income = eligible.filter((tx) => tx.type === "income");
  const spending = eligible.filter((tx) => tx.type !== "income");

  const totalSalesInclGst = income.reduce(
    (sum, tx) => sum + Math.abs(tx.amount),
    0,
  );
  const totalSpendingInclGst = spending.reduce(
    (sum, tx) => sum + Math.abs(tx.amount),
    0,
  );

  const gstOnSales = income
    .filter((tx) => tx.gstIncluded)
    .reduce((sum, tx) => sum + calculateGstFromGross(Math.abs(tx.amount)), 0);

  const gstToClaim = spending
    .filter((tx) => tx.gstIncluded)
    .reduce(
      (sum, tx) => sum + getTransactionGstClaimable(tx),
      0,
    );

  const netGst = gstOnSales - gstToClaim;

  return {
    totalSpendingInclGst,
    totalSalesInclGst,
    gstOnSales,
    gstToClaim,
    netGst,
  };
};

type ExpenseRow = {
  id: string | number;
  user_id: string;
  date: string;
  category: string;
  description?: string | null;
  amount: number | string;
  gst_included: boolean;
  gst_claimable?: number | string | null;
  receipt_url?: string | null;
  type?: string;
  deleted_at?: string | null;
};

const mapExpenseRow = (row: ExpenseRow): Expense => {
  const normalizedType =
    row.type && row.type.toLowerCase() === "income" ? "income" : "expense";
  const amount = Number(row.amount ?? 0);

  return {
    id: String(row.id),
    userId: row.user_id,
    date: row.date,
    category: row.category,
    description: row.description ?? "",
    amount,
    gstIncluded: Boolean(row.gst_included),
    gstClaimable: Number.isFinite(Number(row.gst_claimable))
      ? Number(row.gst_claimable)
      : calculateGstClaimable(amount, Boolean(row.gst_included), normalizedType),
    receiptUrl: row.receipt_url ?? null,
    type: normalizedType,
  };
};

const formatDateOnly = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export async function getGstSummaryForRange(
  supabase: SupabaseClient,
  userId: string,
  from: Date,
  to: Date,
): Promise<GstSummary> {
  const fromStr = formatDateOnly(from);
  const toStr = formatDateOnly(to);

  const { data, error } = await supabase
    .from("expenses")
    .select("*")
    .eq("user_id", userId)
    .gte("date", fromStr)
    .lte("date", toStr)
    .is("deleted_at", null);

  if (error) {
    console.error("Failed to load expenses for GST summary", error);
    return emptySummary;
  }

  const expenses = (data ?? []).map(mapExpenseRow);
  return calculateGstSummary(expenses);
}
