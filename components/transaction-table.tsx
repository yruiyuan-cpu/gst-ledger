import { useRouter } from "next/navigation";
import { displayAmountWithSign, formatCurrency, formatDate } from "@/lib/utils";
import { type Expense } from "@/lib/transactions";

type TransactionTableProps = {
  transactions: Expense[];
  emptyMessage: string;
  includeGstColumn?: boolean;
};

const TransactionTable = ({
  transactions,
  emptyMessage,
  includeGstColumn = true,
}: TransactionTableProps) => {
  const router = useRouter();

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="md:hidden">
        {transactions.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-slate-500">
            {emptyMessage}
          </p>
        ) : (
          <div className="space-y-3 p-4">
            {transactions.map((transaction) => (
              <button
                key={transaction.id}
                onClick={() =>
                  router.push(`/transactions/${transaction.id}/edit`)
                }
                className="w-full rounded-2xl border border-slate-100 bg-white p-4 text-left shadow-sm transition hover:border-blue-200"
              >
                <div className="flex items-center justify-between text-sm text-slate-500">
                  <span>{formatDate(transaction.date)}</span>
                  <span
                    className={`font-semibold ${
                      transaction.type === "income"
                        ? "text-emerald-600"
                        : "text-rose-600"
                    }`}
                  >
                    {displayAmountWithSign(
                      transaction.amount,
                      transaction.type,
                    )}
                  </span>
                </div>
                <p className="mt-1 text-base font-semibold text-slate-900">
                  {transaction.category}
                </p>
                <p className="text-sm text-slate-600">
                  {transaction.description}
                </p>
                <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
                  <span>
                    GST claimable: {formatCurrency(transaction.gstClaimable)}
                  </span>
                  <span>
                    {transaction.receiptUrl ? "Receipt on file" : "No receipt"}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="hidden overflow-x-auto md:block">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left font-semibold text-slate-700">
                Date
              </th>
              <th className="px-4 py-3 text-left font-semibold text-slate-700">
                Category
              </th>
              <th className="px-4 py-3 text-left font-semibold text-slate-700">
                Description
              </th>
              <th className="px-4 py-3 text-left font-semibold text-slate-700">
                Amount
              </th>
              {includeGstColumn && (
                <th className="px-4 py-3 text-left font-semibold text-slate-700">
                  GST included
                </th>
              )}
              <th className="px-4 py-3 text-left font-semibold text-slate-700">
                GST claimable
              </th>
              <th className="px-4 py-3 text-left font-semibold text-slate-700">
                Receipt
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {transactions.length === 0 && (
              <tr>
                <td
                  colSpan={includeGstColumn ? 7 : 6}
                  className="px-4 py-8 text-center text-slate-500"
                >
                  {emptyMessage}
                </td>
              </tr>
            )}
            {transactions.map((transaction) => {
              const amountIsExpense = transaction.type !== "income";
              return (
                <tr
                  key={transaction.id}
                  role="button"
                  tabIndex={0}
                  onClick={(event) => {
                    const target = event.target as HTMLElement;
                    if (target.closest("a,button")) return;
                    router.push(`/transactions/${transaction.id}/edit`);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      router.push(`/transactions/${transaction.id}`);
                    }
                  }}
                  className="group cursor-pointer transition-colors hover:bg-slate-50/70 focus:outline-none focus:ring-2 focus:ring-blue-200"
                >
                  <td className="px-4 py-4 text-slate-800">
                    {formatDate(transaction.date)}
                  </td>
                  <td className="px-4 py-4 text-slate-800">
                    {transaction.category}
                  </td>
                  <td className="px-4 py-4 text-slate-700">
                    {transaction.description}
                  </td>
                  <td
                    className={`px-4 py-4 font-semibold ${
                      amountIsExpense ? "text-rose-600" : "text-emerald-600"
                    }`}
                  >
                    {displayAmountWithSign(transaction.amount, transaction.type)}
                  </td>
                  {includeGstColumn && (
                    <td className="px-4 py-4">
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${
                          transaction.gstIncluded
                            ? "bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {transaction.gstIncluded ? "Yes" : "No"}
                      </span>
                    </td>
                  )}
                  <td className="px-4 py-4 text-slate-800">
                    {formatCurrency(transaction.gstClaimable)}
                  </td>
                  <td className="px-4 py-4">
                    {transaction.receiptUrl ? (
                      <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                        On file
                      </span>
                    ) : (
                      <span className="text-slate-400">None</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TransactionTable;
