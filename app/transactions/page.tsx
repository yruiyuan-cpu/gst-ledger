'use client';

import Link from "next/link";
import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import TransactionTable from "@/components/transaction-table";
import { useTransactions } from "@/components/transactions/transactions-provider";
import { ALL_CATEGORIES } from "@/lib/categories";
import { filterTransactionsByRange, sortByDateDesc } from "@/lib/utils";
import { useDateRange } from "@/components/date-range-context";

const gstFilterOptions = ["All", "Includes GST", "No GST"] as const;

export default function TransactionsPage() {
  const { transactions, loading } = useTransactions();
  const { range } = useDateRange();
  const searchParams = useSearchParams();
  const showDeletedToast = searchParams.get("deleted") === "1";

  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [category, setCategory] = useState<string>("All categories");
  const [gstFilter, setGstFilter] = useState<(typeof gstFilterOptions)[number]>(
    "All",
  );
  const [search, setSearch] = useState("");
  const PAGE_SIZE = 20;
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const resetVisible = () => setVisibleCount(PAGE_SIZE);

  const filteredTransactions = useMemo(() => {
    const query = search.trim().toLowerCase();
    const base = filterTransactionsByRange(transactions, range);

    return [...base]
      .filter((transaction) => {
        const matchesFrom = fromDate
          ? new Date(transaction.date) >= new Date(fromDate)
          : true;

        const matchesTo = toDate
          ? new Date(transaction.date) <= new Date(toDate)
          : true;

        const matchesCategory =
          category === "All categories" || transaction.category === category;

        const matchesGst =
          gstFilter === "All"
            ? true
            : gstFilter === "Includes GST"
              ? transaction.gstIncluded
              : !transaction.gstIncluded;

        const matchesSearch = query
          ? transaction.description.toLowerCase().includes(query)
          : true;

        return (
          matchesFrom &&
          matchesTo &&
          matchesCategory &&
          matchesGst &&
          matchesSearch
        );
      })
      .sort(sortByDateDesc);
  }, [transactions, range, fromDate, toDate, category, gstFilter, search]);

  const visibleTransactions = useMemo(
    () => filteredTransactions.slice(0, visibleCount),
    [filteredTransactions, visibleCount],
  );

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-slate-600">
        Loading transactions…
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {showDeletedToast && (
        <div className="flex items-center justify-between rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700 shadow-sm">
          <span>Deleted</span>
          <span className="text-xs opacity-70">Updated just now</span>
        </div>
      )}

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">
            Transactions
          </h1>
          <p className="text-sm text-slate-600">
            View and filter all your expenses and receipts.
          </p>
        </div>
        <Link
          href="/transactions/new"
          className="rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
        >
          Add transaction
        </Link>
      </div>

      <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200/80">
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-slate-700">Date</label>
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={fromDate}
                onChange={(event) => {
                  setFromDate(event.target.value);
                  resetVisible();
                }}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                placeholder="From"
              />
              <input
                type="date"
                value={toDate}
                onChange={(event) => {
                  setToDate(event.target.value);
                  resetVisible();
                }}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                placeholder="To"
              />
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-slate-700">
              Category
            </label>
            <select
              value={category}
              onChange={(event) => {
                setCategory(event.target.value);
                resetVisible();
              }}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
            >
              <option>All categories</option>
              {ALL_CATEGORIES.map((option) => (
                <option key={option}>{option}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-slate-700">GST</label>
            <select
              value={gstFilter}
              onChange={(event) => {
                setGstFilter(
                  event.target.value as (typeof gstFilterOptions)[number],
                );
                resetVisible();
              }}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
            >
              {gstFilterOptions.map((option) => (
                <option key={option}>{option}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-slate-700">Search</label>
            <input
              type="text"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                resetVisible();
              }}
              placeholder="Search description or merchant…"
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
            />
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <TransactionTable
          transactions={visibleTransactions}
          includeGstColumn
          emptyMessage="No transactions found for this filter."
        />
        {filteredTransactions.length > visibleTransactions.length && (
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-500">
              Showing {visibleTransactions.length} of{" "}
              {filteredTransactions.length} transactions
            </p>
            <button
              type="button"
              onClick={() =>
                setVisibleCount((count) => count + PAGE_SIZE)
              }
              className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800 shadow-sm transition hover:border-blue-200"
            >
              Load more
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
