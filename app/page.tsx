'use client';

import Link from "next/link";
import { format } from "date-fns";
import { useMemo, useRef, useState } from "react";
import SummaryCard from "@/components/summary-card";
import TransactionTable from "@/components/transaction-table";
import { useTransactions } from "@/components/transactions/transactions-provider";
import { useAuth } from "@/components/auth-provider";
import {
  calculateExpenseSummary,
  filterTransactionsByRange,
  formatCurrency,
  sortByDateDesc,
} from "@/lib/utils";
import {
  calculateGstBreakdown,
  DASHBOARD_RECENT_TRANSACTIONS_LIMIT,
} from "@/lib/transactions";
import { getRangeForPreset } from "@/lib/dateRange";
import type { DateRangePreset } from "@/lib/dateRange";
import { useDateRange } from "@/components/date-range-context";
import { buildStatementCsv } from "@/lib/statement";

export default function Dashboard() {
  const { transactions, loading } = useTransactions();
  const { user } = useAuth();
  const { range, setRange } = useDateRange();
  const [selectedRange, setSelectedRange] =
    useState<DateRangePreset>("this_month");
  const [pendingCustomRange, setPendingCustomRange] = useState<{
    from: string;
    to: string;
  } | null>(null);
  const customStartRef = useRef<HTMLInputElement | null>(null);
  const customEndRef = useRef<HTMLInputElement | null>(null);
  const [recentVisibleCount, setRecentVisibleCount] =
    useState(DASHBOARD_RECENT_TRANSACTIONS_LIMIT);

  const currentPending = pendingCustomRange ?? range;

  const handlePresetChange = (value: DateRangePreset) => {
    setSelectedRange(value);
    if (value === "custom") {
      setPendingCustomRange(range);
      return;
    }
    setPendingCustomRange(null);
    setRange(getRangeForPreset(value));
    setRecentVisibleCount(DASHBOARD_RECENT_TRANSACTIONS_LIMIT);
  };

  const handleCustomDateChange = (field: "from" | "to") => (value: string) => {
    setPendingCustomRange((prev) => {
      const base = prev ?? range;
      return { ...base, [field]: value };
    });
  };

  const applyCustomRange = () => {
    if (!pendingCustomRange?.from || !pendingCustomRange?.to) return;
    setRange(pendingCustomRange);
    setRecentVisibleCount(DASHBOARD_RECENT_TRANSACTIONS_LIMIT);
  };

  const filteredTransactions = useMemo(
    () => filterTransactionsByRange(transactions, range),
    [transactions, range],
  );

  const summary = useMemo(
    () => calculateExpenseSummary(filteredTransactions),
    [filteredTransactions],
  );
  const gstTotals = useMemo(
    () => calculateGstBreakdown(filteredTransactions),
    [filteredTransactions],
  );
  const netLabel = gstTotals.netGst >= 0 ? "GST to pay" : "GST refund";
  const statementSummary = {
    totalSpending: summary.totalSpending,
    totalSales: gstTotals.totalIncomeAmount,
    gstOnSales: gstTotals.totalIncomeGst,
    gstToClaim: summary.gstToClaim,
    netGst: gstTotals.netGst,
  };

  const visibleRecentTransactions = useMemo(
    () =>
      [...filteredTransactions]
        .sort(sortByDateDesc)
        .slice(0, recentVisibleCount),
    [filteredTransactions, recentVisibleCount],
  );
  const recentHasMore =
    filteredTransactions.length > visibleRecentTransactions.length;
  const recentSubtitle = recentHasMore
    ? `Showing ${visibleRecentTransactions.length} of ${filteredTransactions.length} transactions`
    : `Showing ${filteredTransactions.length} transactions`;
  const formattedPeriod =
    range.from && range.to
      ? `${format(new Date(range.from), "yyyy/MM/dd")} – ${format(
          new Date(range.to),
          "yyyy/MM/dd",
        )}`
      : "No date range selected";

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-sm text-slate-600">
        Loading your expenses…
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <section className="grid gap-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-semibold text-slate-900">
              GST dashboard
            </h1>
            <p className="text-sm text-slate-600">
              Track your GST position across expenses and income.
            </p>
          </div>
          <div className="space-y-2 sm:flex sm:items-end sm:justify-end sm:space-y-0 sm:gap-3">
            <div className="flex-1 space-y-2 sm:flex sm:flex-col sm:items-start sm:justify-end">
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Date range
              </label>
              <select
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                value={selectedRange}
                onChange={(event) =>
                  handlePresetChange(event.target.value as DateRangePreset)
                }
              >
                <option value="this_month">This month</option>
                <option value="last_2_months">Last 2 months</option>
                <option value="custom">Custom range</option>
              </select>
            </div>
            {user && (
              <Link
                href="/bank-import"
                className="rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-blue-200 hover:text-blue-700"
              >
                Import from bank CSV
              </Link>
            )}
          </div>
        </div>
        {selectedRange === "custom" && (
          <>
            <div className="flex flex-col gap-3 text-sm sm:flex-row">
              <div
                onClick={() => customStartRef.current?.showPicker()}
                className="flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100"
              >
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  From
                </label>
                <input
                  ref={customStartRef}
                  type="date"
                  value={currentPending.from}
                  onChange={(event) =>
                    handleCustomDateChange("from")(event.target.value)
                  }
                  className="w-full bg-transparent text-slate-900 outline-none"
                />
              </div>
              <div
                onClick={() => customEndRef.current?.showPicker()}
                className="flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100"
              >
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  To
                </label>
                <input
                  ref={customEndRef}
                  type="date"
                  value={currentPending.to}
                  onChange={(event) =>
                    handleCustomDateChange("to")(event.target.value)
                  }
                  className="w-full bg-transparent text-slate-900 outline-none"
                />
              </div>
            </div>
            <div className="flex justify-end">
              <button
                type="button"
                disabled={
                  !pendingCustomRange?.from || !pendingCustomRange?.to
                }
                onClick={applyCustomRange}
                className="rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition enabled:hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Apply
              </button>
            </div>
          </>
        )}
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <Link href="/transactions?type=expense" className="block h-full">
          <SummaryCard
            title="Total spending"
            subtitle={`Includes ${formatCurrency(summary.gstToClaim)} claimable GST`}
            value={formatCurrency(summary.totalSpending)}
          />
        </Link>
        <Link href="/transactions?type=income" className="block h-full">
          <SummaryCard
            title="Total sales (GST-incl.)"
            subtitle={`GST on sales: ${formatCurrency(gstTotals.totalIncomeGst)}`}
            value={formatCurrency(gstTotals.totalIncomeAmount)}
            accent="primary"
          />
        </Link>
        <SummaryCard
          title="Net GST"
          subtitle={netLabel}
          value={formatCurrency(Math.abs(gstTotals.netGst))}
          accent={gstTotals.netGst >= 0 ? "muted" : "success"}
          chip={netLabel}
        />
      </section>

      <section className="flex flex-col gap-4">
        <section>
          <div className="h-full rounded-3xl border border-slate-100 bg-white p-6 shadow-lg shadow-slate-100/70">
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">
                    NZ IRD – GST return helper
                  </h2>
                  <p className="text-sm text-slate-500">
                    Statement period: {formattedPeriod}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const csv = buildStatementCsv({
                      from: range.from,
                      to: range.to,
                      transactions: filteredTransactions,
                      summary: statementSummary,
                    });
                    const blob = new Blob([csv], {
                      type: "text/csv;charset=utf-8;",
                    });
                    const url = URL.createObjectURL(blob);
                    const link = document.createElement("a");
                    link.href = url;
                    link.setAttribute(
                      "download",
                      `gst-statement-${range.from}-${range.to}.csv`,
                    );
                    document.body.appendChild(link);
                    link.click();
                    link.remove();
                    URL.revokeObjectURL(url);
                  }}
                  className="rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800 shadow-sm transition hover:border-blue-200"
                >
                  Download statement (CSV)
                </button>
              </div>
              <div className="space-y-3 text-sm">
                <HelperRow
                  label="Total purchases & expenses (GST-incl.)"
                  value={formatCurrency(summary.totalSpending)}
                />
                <HelperRow
                  label="Total sales (GST-incl.)"
                  value={formatCurrency(gstTotals.totalIncomeAmount)}
                />
                <div className="border-t border-slate-100 pt-3 space-y-3">
                  <HelperRow
                    label="GST to claim (input tax)"
                    value={formatCurrency(summary.gstToClaim)}
                  />
                  <HelperRow
                    label="GST on sales (output tax)"
                    value={formatCurrency(gstTotals.totalIncomeGst)}
                  />
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-sm text-slate-500">Net GST</span>
                      <p className="text-xs text-slate-400">{netLabel}</p>
                    </div>
                    <span
                      className={`text-base font-semibold ${
                        gstTotals.netGst >= 0
                          ? "text-rose-600"
                          : "text-emerald-600"
                      }`}
                    >
                      {formatCurrency(Math.abs(gstTotals.netGst))}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
        <section className="w-full">
          <div className="h-full rounded-3xl border border-slate-100 bg-white p-5 md:p-6 shadow-lg shadow-slate-100/70">
            <h3 className="text-lg font-semibold text-slate-900">
              Notes for this period
            </h3>
            <ul className="mt-3 space-y-2 text-sm text-slate-600">
              <li>• Keep receipts handy; claimable GST updates instantly.</li>
              <li>• Overseas services and bank fees are set to “No GST” by default.</li>
              <li>• Record both income and expenses to refine your GST balance.</li>
            </ul>
          </div>
        </section>
      </section>

      <section className="space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              Recent transactions
            </h2>
            <p className="text-sm text-slate-600">{recentSubtitle}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/transactions"
              className="text-sm font-medium text-blue-600 hover:text-blue-700"
            >
              View all transactions
            </Link>
            <Link
              href="/transactions/new"
              className="rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
            >
              Add transaction
            </Link>
          </div>
        </div>

        <TransactionTable
          transactions={visibleRecentTransactions}
          includeGstColumn={false}
          emptyMessage="No transactions yet. Start by adding your first expense."
        />
        {recentHasMore && (
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-500">{recentSubtitle}</p>
            <button
              type="button"
              onClick={() =>
                setRecentVisibleCount(
                  (count) => count + DASHBOARD_RECENT_TRANSACTIONS_LIMIT,
                )
              }
              className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800 shadow-sm transition hover:border-blue-200"
            >
              Load more
            </button>
          </div>
        )}
      </section>
    </div>
  );
}

type HelperRowProps = {
  label: string;
  value: string;
  description?: string;
  highlighted?: boolean;
};

const HelperRow = ({ label, description, value }: HelperRowProps) => (
  <div className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:justify-between">
    <div>
      <p className="text-sm font-medium text-slate-800">{label}</p>
      {description && <p className="text-xs text-slate-500">{description}</p>}
    </div>
    <p className="text-base font-semibold text-slate-900">{value}</p>
  </div>
);
