import type { Category, Expense } from "./transactions";

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
  const name = (categoryName ?? "").toLowerCase();

  // Exceptions: these should default to no GST.
  if (name.includes("financial loan")) return false;
  if (name.includes("owner") && name.includes("funding")) return false;
  if (name.includes("pay to ird")) return false;
  if (name.includes("refund from ird")) return false;
  if (name.includes("ird")) return false;

  // Everything else defaults to GST included.
  return true;
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
  const normalTransactions = transactions.filter(
    (tx) => !isIrdGstSettlement(tx),
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
