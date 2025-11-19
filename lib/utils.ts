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

export const isGstDefaultIncluded = (category?: Category) => {
  if (!category) return true;
  return !["Overseas service", "Bank fees"].includes(category);
};

export const sortByDateDesc = (
  a: { date: string },
  b: { date: string },
) => new Date(b.date).getTime() - new Date(a.date).getTime();

export const calculateExpenseSummary = (transactions: Expense[]) => {
  const expenses = transactions.filter((tx) => tx.type !== "income");

  const totalSpending = expenses.reduce((sum, tx) => sum + tx.amount, 0);
  const gstAble = expenses
    .filter((tx) => tx.gstIncluded)
    .reduce((sum, tx) => sum + tx.amount, 0);
  const gstToClaim = expenses.reduce((sum, tx) => sum + tx.gstClaimable, 0);

  return { totalSpending, gstAble, gstToClaim };
};

export const calculateGstFromGross = (amount: number) =>
  // For NZ 15% GST, GST portion of a GST-inclusive total is 15/115 (3/23).
  (amount * 3) / 23;

export const calculateGstClaimable = (
  amount: number,
  gstIncluded: boolean,
): number => {
  if (!gstIncluded) return 0;
  const value = (amount * 0.15) / 1.15;
  return Math.round(value * 100) / 100;
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
