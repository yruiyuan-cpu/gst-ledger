'use client';

export const dynamic = "force-dynamic";

import { useState } from "react";
import TransactionForm from "@/components/transactions/transaction-form";
import { useTransactions } from "@/components/transactions/transactions-provider";

export default function NewTransactionPage() {
  const { addTransaction } = useTransactions();
  const [submitError, setSubmitError] = useState<string | null>(null);

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">
            Add transaction
          </h1>
          <p className="text-sm text-slate-600">
            Record a new business expense and let us calculate the GST for you.
          </p>
        </div>
      </div>

      {submitError && (
        <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {submitError}
        </p>
      )}

      <TransactionForm
        mode="create"
        onSubmit={async (values) => {
          try {
            await addTransaction(values);
            setSubmitError(null);
          } catch (error) {
            const message =
              error instanceof Error
                ? error.message
                : "Failed to save transaction.";
            setSubmitError(message);
          }
        }}
        onCancelHref="/transactions"
        redirectTo="/transactions"
      />
    </div>
  );
}
