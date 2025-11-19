import type { Expense } from "./transactions";

type StatementOptions = {
  from: string;
  to: string;
  transactions: Expense[];
  summary: {
    totalSpending: number;
    totalSales: number;
    gstOnSales: number;
    gstToClaim: number;
    netGst: number;
  };
};

const formatNumber = (value: number) =>
  value.toFixed(2); // ensure CSV is two decimals without currency symbol.

const formatDateIso = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export function buildStatementCsv({
  from,
  to,
  transactions,
  summary,
}: StatementOptions) {
  const rows: string[] = [];
  rows.push(`Period from,${from}`);
  rows.push(`Period to,${to}`);
  rows.push(`Total spending (incl GST),${formatNumber(summary.totalSpending)}`);
  rows.push(`Total sales (GST-incl),${formatNumber(summary.totalSales)}`);
  rows.push(`GST to claim,${formatNumber(summary.gstToClaim)}`);
  rows.push(`GST on sales,${formatNumber(summary.gstOnSales)}`);
  rows.push(`Net GST,${formatNumber(summary.netGst)}`);
  rows.push(""); // blank line
  rows.push(
    [
      "Date",
      "Type",
      "Category",
      "Description",
      "Amount",
      "GST claimable",
      "GST included",
      "Receipt URL",
    ].join(","),
  );

  transactions.forEach((transaction) => {
    const amount =
      transaction.type === "income"
        ? transaction.amount
        : transaction.amount * -1;

    rows.push(
      [
        formatDateIso(transaction.date),
        transaction.type,
        `"${(transaction.category ?? "").replace(/"/g, '""')}"`,
        `"${(transaction.description ?? "").replace(/"/g, '""')}"`,
        formatNumber(amount),
        formatNumber(transaction.gstClaimable),
        transaction.gstIncluded ? "Yes" : "No",
        transaction.receiptUrl ?? "",
      ].join(","),
    );
  });

  return rows.join("\n");
}
