'use client';

export const dynamic = "force-dynamic";

import TransactionForm from "@/components/transactions/transaction-form";
import { useTransactions } from "@/components/transactions/transactions-provider";

export default function NewTransactionPage() {
  const { addTransaction } = useTransactions();

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

      <TransactionForm
        mode="create"
        onSubmit={async (values) => {
          await addTransaction(values);
        }}
        onCancelHref="/transactions"
        redirectTo="/transactions"
      />
    </div>
  );
}
