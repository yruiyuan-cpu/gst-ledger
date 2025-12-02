'use client';

import Link from "next/link";
import { use, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import TransactionTable from "@/components/transaction-table";
import { useTransactions } from "@/components/transactions/transactions-provider";
import { ALL_CATEGORIES } from "@/lib/categories";
import { filterTransactionsByRange, sortByDateDesc } from "@/lib/utils";
import { isIrdGstSettlement } from "@/lib/transactions";
import { DATE_PRESETS, getPresetRange, type DatePresetKey } from "@/lib/dateRange";

const gstFilterOptions = ["All", "Includes GST", "No GST"] as const;

export default function TransactionsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const resolvedParams = use(searchParams);
  const { transactions, loading } = useTransactions();
  const router = useRouter();
  const getParam = (key: string) => {
    const value = resolvedParams?.[key];
    return Array.isArray(value) ? value[0] ?? "" : value ?? "";
  };
  const showDeletedToast = getParam("deleted") === "1";
  const importedRaw = getParam("imported");
  const skippedRaw = getParam("skipped");
  const lockedRaw = getParam("locked");
  const typeFilter =
    typeof resolvedParams?.type === "string"
      ? resolvedParams.type.toLowerCase()
      : undefined;
  const importedCount =
    typeof importedRaw === "string" && Number.isFinite(Number(importedRaw))
      ? Number(importedRaw)
      : 0;
  const skippedCount =
    typeof skippedRaw === "string" && Number.isFinite(Number(skippedRaw))
      ? Number(skippedRaw)
      : 0;
  const lockedCount =
    typeof lockedRaw === "string" && Number.isFinite(Number(lockedRaw))
      ? Number(lockedRaw)
      : 0;
  const showImportedBanner =
    (Number.isFinite(importedCount) && importedCount > 0) ||
    (Number.isFinite(skippedCount) && skippedCount > 0) ||
    (Number.isFinite(lockedCount) && lockedCount > 0);
  let importMessage = "";
  if (showImportedBanner) {
    const lockedPart =
      lockedCount > 0
        ? ` ${lockedCount} in filed periods skipped.`
        : "";
    if (importedCount > 0 && (skippedCount > 0 || lockedCount > 0)) {
      importMessage = `Bank statement import finished: ${importedCount} transactions added, ${skippedCount} duplicates skipped.${lockedPart}`;
    } else if (importedCount > 0) {
      importMessage = `Bank statement import finished: ${importedCount} transactions added.${lockedPart}`;
    } else if (importedCount === 0 && (skippedCount > 0 || lockedCount > 0)) {
      importMessage = `Bank statement import finished: no new transactions, ${skippedCount} duplicates skipped.${lockedPart}`;
    }
  }

  const initialFrom = getParam("from") ?? "";
  const initialTo = getParam("to") ?? "";

  const matchPresetFromRange = (from: string, to: string): DatePresetKey | "" => {
    if (!from && !to) return "all";
    const match = DATE_PRESETS.find((preset) => {
      if (preset.key === "all") return false;
      const range = getPresetRange(preset.key);
      return range.from === (from || null) && range.to === (to || null);
    });
    return match?.key ?? "";
  };

  const initialPreset = matchPresetFromRange(initialFrom, initialTo);

  const [fromDate, setFromDate] = useState(initialFrom);
  const [toDate, setToDate] = useState(initialTo);
  const [presetKey, setPresetKey] = useState<DatePresetKey | "">(initialPreset);
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
    const base = filterTransactionsByRange(transactions, {
      from: fromDate || "",
      to: toDate || "",
    });

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
  }, [transactions, fromDate, toDate, category, gstFilter, search]);

  const visibleTransactions = useMemo(
    () => {
      const typed = filteredTransactions.filter((tx) => {
        if (typeFilter === "income" || typeFilter === "expense") {
          if (isIrdGstSettlement(tx)) return false;
        }

        if (typeFilter === "income") return tx.type === "income";
        if (typeFilter === "expense") return tx.type === "expense";
        return true;
      });
      return typed.slice(0, visibleCount);
    },
    [filteredTransactions, typeFilter, visibleCount],
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
      {showImportedBanner && (
        <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {importMessage}
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
        <div className="flex flex-wrap gap-2">
          <Link
            href="/bank-import"
            className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-blue-200 hover:text-blue-700"
          >
            Import from bank CSV
          </Link>
          <Link
            href="/transactions/new"
            className="rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
          >
            Add transaction
          </Link>
        </div>
      </div>

      <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200/80">
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-slate-700">Date</label>
            <div className="flex flex-col gap-2">
              <select
                value={presetKey}
                onChange={(event) => {
                  const key = event.target.value as DatePresetKey | "";
                  setPresetKey(key);
                  if (!key) return;
                  const range = getPresetRange(key as DatePresetKey);
                  setFromDate(range.from ?? "");
                  setToDate(range.to ?? "");
                  resetVisible();
                }}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
              >
                <option value="">Custom</option>
                {DATE_PRESETS.map((preset) => (
                  <option key={preset.key} value={preset.key}>
                    {preset.label}
                  </option>
                ))}
              </select>
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={fromDate}
                  onChange={(event) => {
                    setFromDate(event.target.value);
                    setPresetKey("");
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
                    setPresetKey("");
                    resetVisible();
                  }}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  placeholder="To"
                />
              </div>
              <button
                type="button"
                onClick={() => {
                  const urlParams = new URLSearchParams();
                  Object.entries(resolvedParams ?? {}).forEach(
                    ([key, value]) => {
                      if (typeof value === "string") {
                        urlParams.set(key, value);
                      } else if (Array.isArray(value)) {
                        value.forEach((v) => urlParams.append(key, v));
                      }
                    },
                  );
                  if (fromDate) urlParams.set("from", fromDate);
                  else urlParams.delete("from");
                  if (toDate) urlParams.set("to", toDate);
                  else urlParams.delete("to");
                  if (importedCount) urlParams.set("imported", String(importedCount));
                  else urlParams.delete("imported");
                  if (skippedCount) urlParams.set("skipped", String(skippedCount));
                  else urlParams.delete("skipped");
                  if (lockedCount) urlParams.set("locked", String(lockedCount));
                  else urlParams.delete("locked");
                  router.push(
                    `/transactions${
                      urlParams.toString() ? `?${urlParams.toString()}` : ""
                    }`,
                  );
                  resetVisible();
                }}
                className="inline-flex w-fit rounded-full bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-blue-700"
              >
                Apply filters
              </button>
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
