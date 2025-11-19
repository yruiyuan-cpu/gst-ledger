'use client';

import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useTransactions } from "@/components/transactions/transactions-provider";
import { formatCurrency, formatDate } from "@/lib/utils";
import { getExpenseById, type Expense } from "@/lib/transactions";
import { useAuth } from "@/components/auth-provider";

export default function TransactionDetailsPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { deleteTransaction } = useTransactions();
  const { user } = useAuth();
  const showUpdatedToast = searchParams.get("updated") === "1";
  const showDeletedToast = searchParams.get("deleted") === "1";
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [transaction, setTransaction] = useState<Expense | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadTransaction = async () => {
      if (!params?.id || !user) return;
      setLoading(true);
      try {
        const data = await getExpenseById(params.id, user.id);
        setTransaction(data);
      } catch (error) {
        console.error("Failed to load transaction", error);
        setTransaction(null);
      } finally {
        setLoading(false);
      }
    };

    loadTransaction();
  }, [params?.id, user]);

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-slate-600">
        Loading transaction…
      </div>
    );
  }

  if (!transaction) {
    return (
      <div className="space-y-3 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200/80">
        <h1 className="text-xl font-semibold text-slate-900">
          Transaction not found
        </h1>
        <p className="text-sm text-slate-600">
          We couldn&apos;t find that transaction. It may have been deleted.
        </p>
        <Link
          href="/transactions"
          className="inline-flex w-fit rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
        >
          Back to transactions
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {(showUpdatedToast || showDeletedToast) && (
        <div
          className={`flex items-center justify-between rounded-xl px-4 py-3 text-sm shadow-sm ${
            showDeletedToast
              ? "bg-rose-50 text-rose-700"
              : "bg-emerald-50 text-emerald-700"
          }`}
        >
          <span>
            {showDeletedToast ? "Transaction deleted" : "Transaction updated"}
          </span>
          <button
            className="text-xs font-medium underline"
            onClick={() => router.replace(`/transactions/${transaction.id}`)}
          >
            Dismiss
          </button>
        </div>
      )}

      <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200/80">
        <div className="mb-4 flex flex-col gap-1">
          <h1 className="text-2xl font-semibold text-slate-900">
            Transaction details
          </h1>
          <p className="text-sm text-slate-600">ID: {transaction.id}</p>
        </div>

        <dl className="grid gap-4 sm:grid-cols-2">
          <DetailRow label="Date" value={formatDate(transaction.date)} />
          <DetailRow label="Amount" value={formatCurrency(transaction.amount)} />
          <DetailRow label="Category" value={transaction.category} />
          <DetailRow
            label="Includes GST"
            value={transaction.gstIncluded ? "Yes" : "No"}
          />
          <DetailRow
            label="GST claimable"
            value={formatCurrency(transaction.gstClaimable)}
          />
          <DetailRow
            label="Type"
            value={transaction.type === "income" ? "Income" : "Expense"}
          />
          <div className="sm:col-span-2">
            <dt className="text-sm font-medium text-slate-700">Description</dt>
            <dd className="mt-2 rounded-xl bg-slate-50 p-3 text-sm text-slate-700">
              {transaction.description || "No description provided."}
            </dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-sm font-medium text-slate-700">Receipt</dt>
            <dd className="mt-2">
              {transaction.receiptUrl ? (
                <Link
                  href={transaction.receiptUrl}
                  target="_blank"
                  className="inline-flex w-fit rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
                >
                  View receipt
                </Link>
              ) : (
                <span className="text-sm text-slate-500">
                  No receipt uploaded.
                </span>
              )}
            </dd>
          </div>
        </dl>

        <div className="mt-6 space-y-3">
          <Link
            href={`/transactions/${transaction.id}/edit`}
            className="inline-flex w-full items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 shadow-sm transition hover:border-blue-200 hover:text-blue-700"
          >
            Edit
          </Link>
          <button
            onClick={() => setConfirmingDelete(true)}
            className="inline-flex w-full items-center justify-center rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 shadow-sm transition hover:bg-rose-100"
          >
            Delete
          </button>
          <Link
            href="/transactions"
            className="inline-flex w-full items-center justify-center rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
          >
            Back to transactions
          </Link>
        </div>
      </div>

      {confirmingDelete && (
        <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/30 px-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-lg ring-1 ring-slate-200">
            <h3 className="text-lg font-semibold text-slate-900">
              Delete this transaction?
            </h3>
            <p className="mt-2 text-sm text-slate-600">
              This action cannot be undone.
            </p>
            <div className="mt-4 flex flex-col gap-2">
              <button
                onClick={() => setConfirmingDelete(false)}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 shadow-sm transition hover:border-slate-300"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  await deleteTransaction(transaction.id);
                  router.push("/transactions?deleted=1");
                }}
                className="w-full rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-rose-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const DetailRow = ({ label, value }: { label: string; value: string }) => (
  <div className="flex flex-col gap-1 rounded-xl border border-slate-200 px-4 py-3">
    <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
      {label}
    </dt>
    <dd className="text-sm font-medium text-slate-800">{value}</dd>
  </div>
);
