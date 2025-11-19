'use client';

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import TransactionForm from "@/components/transactions/transaction-form";
import { useTransactions } from "@/components/transactions/transactions-provider";
import { getExpenseById, type Expense } from "@/lib/transactions";
import { useAuth } from "@/components/auth-provider";

export const dynamic = "force-dynamic";

export default function EditTransactionPage() {
  const params = useParams<{ id: string }>();
  const { user } = useAuth();
  const { updateTransaction } = useTransactions();
  const [transaction, setTransaction] = useState<Expense | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!params?.id || !user) return;
      setLoading(true);
      try {
        const data = await getExpenseById(params.id, user.id);
        setTransaction(data);
      } catch (error) {
        console.error("Failed to load expense", error);
        setTransaction(null);
      } finally {
        setLoading(false);
      }
    };

    load();
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
        <h1 className="text-xl font-semibold text-slate-900">Not found</h1>
        <p className="text-sm text-slate-600">
          We couldn&apos;t find that transaction to edit.
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
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">
            Edit transaction
          </h1>
          <p className="text-sm text-slate-600">ID: {transaction.id}</p>
        </div>
      </div>

      {submitError && (
        <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {submitError}
        </p>
      )}

      <TransactionForm
        mode="edit"
        initialValues={transaction}
        onSubmit={async (values) => {
          try {
            await updateTransaction(transaction.id, values);
            setSubmitError(null);
          } catch (error) {
            const message =
              error instanceof Error
                ? error.message
                : "Failed to save changes.";
            setSubmitError(message);
          }
        }}
        onCancelHref="/transactions"
        redirectTo="/transactions"
        successQueryKey="updated"
        submitLabel="Save changes"
        successLabel="Changes saved"
      />
    </div>
  );
}
