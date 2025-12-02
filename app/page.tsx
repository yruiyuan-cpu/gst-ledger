'use client';

import Link from "next/link";
import { useMemo, useState, useEffect } from "react";
import SummaryCard from "@/components/summary-card";
import TransactionTable from "@/components/transaction-table";
import { useTransactions } from "@/components/transactions/transactions-provider";
import { useAuth } from "@/components/auth-provider";
import {
  filterTransactionsByRange,
  formatCurrency,
  sortByDateDesc,
  type GstSummary,
  type GstFrequency,
  getGstSummaryForRange,
} from "@/lib/utils";
import { DASHBOARD_RECENT_TRANSACTIONS_LIMIT } from "@/lib/transactions";
import { supabase } from "@/lib/supabase";
import { getOrCreateUserSettings } from "@/lib/user-settings";
import {
  getOrCreateCurrentPeriod,
  type GstPeriod,
} from "@/lib/gstPeriods";

export default function Dashboard() {
  const { transactions, loading } = useTransactions();
  const { user } = useAuth();
  const [recentVisibleCount, setRecentVisibleCount] =
    useState(DASHBOARD_RECENT_TRANSACTIONS_LIMIT);
  const [frequency, setFrequency] = useState<GstFrequency>("two-monthly");
  const [period, setPeriod] = useState<GstPeriod | null>(null);
  const [gstSummary, setGstSummary] = useState<GstSummary>({
    totalSalesInclGst: 0,
    totalSpendingInclGst: 0,
    gstOnSales: 0,
    gstToClaim: 0,
    netGst: 0,
  });
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!user) {
        setSummaryLoading(false);
        return;
      }
      setSummaryLoading(true);
      setError(null);
      try {
        const settings = await getOrCreateUserSettings(supabase, user.id);
        const freq = settings.gst_frequency as GstFrequency;
        setFrequency(freq);
        const currentPeriod = await getOrCreateCurrentPeriod(
          supabase,
          user.id,
          freq,
          new Date(),
        );
        setPeriod(currentPeriod);
        const summary = await getGstSummaryForRange(
          supabase,
          user.id,
          new Date(currentPeriod.start_date),
          new Date(currentPeriod.end_date),
        );
        setGstSummary(summary);
      } catch (err) {
        const msg =
          err instanceof Error
            ? err.message
            : "Failed to load GST summary.";
        setError(msg);
      } finally {
        setSummaryLoading(false);
      }
    };

    load();
  }, [user]);

  const filteredTransactions = useMemo(() => {
    if (!period) return transactions;
    return filterTransactionsByRange(transactions, {
      from: period.start_date,
      to: period.end_date,
    });
  }, [transactions, period]);

  const netLabel = gstSummary.netGst >= 0 ? "GST to pay" : "GST refund";

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
  const formattedPeriod = period
    ? `${period.start_date} – ${period.end_date}`
    : "No period";

  if (loading || summaryLoading) {
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
            <div className="flex flex-col">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Current GST period
              </p>
              <p className="text-sm font-medium text-slate-900">
                {formattedPeriod}
              </p>
              <p className="text-xs text-slate-500 capitalize">
                Frequency: {frequency.replace("-", " ")}
              </p>
            </div>
            {user && (
              <Link
                href="/gst-return"
                className="rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-blue-200 hover:text-blue-700"
              >
                View GST return
              </Link>
            )}
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
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <Link href="/transactions?type=expense" className="block h-full">
          <SummaryCard
            title="Total spending"
            subtitle={`Includes ${formatCurrency(gstSummary.gstToClaim)} claimable GST`}
            value={formatCurrency(gstSummary.totalSpendingInclGst)}
          />
        </Link>
        <Link href="/transactions?type=income" className="block h-full">
          <SummaryCard
            title="Total sales (GST-incl.)"
            subtitle={`GST on sales: ${formatCurrency(gstSummary.gstOnSales)}`}
            value={formatCurrency(gstSummary.totalSalesInclGst)}
            accent="primary"
          />
        </Link>
        <Link href="/gst-return" className="block h-full">
          <SummaryCard
            title="Net GST"
            subtitle={netLabel}
            value={formatCurrency(Math.abs(gstSummary.netGst))}
            accent={gstSummary.netGst >= 0 ? "muted" : "success"}
            chip="This period"
          />
        </Link>
      </section>

      <section className="flex flex-col gap-4">
        <section>
          <div className="h-full rounded-3xl border border-slate-100 bg-white p-6 shadow-lg shadow-slate-100/70">
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <Link href="/gst-return" className="block">
                  <h2 className="text-lg font-semibold text-slate-900">
                    NZ IRD – GST return helper
                  </h2>
                  <p className="text-sm text-slate-500">
                    Statement period: {formattedPeriod}
                  </p>
                </Link>
                <button
                  type="button"
                  disabled={!period || exporting}
                  onClick={async () => {
                    if (!period) return;
                    setExporting(true);
                    setError(null);
                    try {
                      const { data, error: sessionError } =
                        await supabase.auth.getSession();
                      if (
                        sessionError ||
                        !data?.session?.access_token ||
                        !data.session.refresh_token
                      ) {
                        throw new Error("Please sign in again to export CSV.");
                      }
                      const response = await fetch("/gst-return/export", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          from: period.start_date,
                          to: period.end_date,
                          access_token: data.session.access_token,
                          refresh_token: data.session.refresh_token,
                        }),
                      });

                      if (!response.ok) {
                        throw new Error("Failed to export CSV.");
                      }

                      const blob = await response.blob();
                      const url = URL.createObjectURL(blob);
                      const link = document.createElement("a");
                      link.href = url;
                      link.setAttribute(
                        "download",
                        `gst-statement-${period.start_date}-${period.end_date}.csv`,
                      );
                      document.body.appendChild(link);
                      link.click();
                      link.remove();
                      URL.revokeObjectURL(url);
                    } catch (err) {
                      const msg =
                        err instanceof Error
                          ? err.message
                          : "Failed to export CSV.";
                      setError(msg);
                    } finally {
                      setExporting(false);
                    }
                  }}
                  className="rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800 shadow-sm transition hover:border-blue-200"
                >
                  {exporting ? "Exporting…" : "Download statement (CSV)"}
                </button>
              </div>
              {error && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  {error}
                </div>
              )}
              <div className="space-y-3 text-sm">
                <HelperRow
                  label="Total purchases & expenses (GST-incl.)"
                  value={formatCurrency(gstSummary.totalSpendingInclGst)}
                />
                <HelperRow
                  label="Total sales (GST-incl.)"
                  value={formatCurrency(gstSummary.totalSalesInclGst)}
                />
                <div className="border-t border-slate-100 pt-3 space-y-3">
                  <HelperRow
                    label="GST to claim (input tax)"
                    value={formatCurrency(gstSummary.gstToClaim)}
                  />
                  <HelperRow
                    label="GST on sales (output tax)"
                    value={formatCurrency(gstSummary.gstOnSales)}
                  />
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-sm text-slate-500">Net GST</span>
                      <p className="text-xs text-slate-400">{netLabel}</p>
                    </div>
                    <span
                      className={`text-base font-semibold ${
                        gstSummary.netGst >= 0
                          ? "text-rose-600"
                          : "text-emerald-600"
                      }`}
                    >
                      {formatCurrency(Math.abs(gstSummary.netGst))}
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
