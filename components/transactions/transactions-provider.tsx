'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  createExpense,
  deleteExpense as deleteExpenseRow,
  getExpensesForCurrentUser,
  type Expense,
  type ExpenseInput,
  updateExpense as updateExpenseRow,
} from "@/lib/transactions";
import { useAuth } from "../auth-provider";

type TransactionsContextValue = {
  transactions: Expense[];
  loading: boolean;
  refreshTransactions: () => Promise<void>;
  addTransaction: (input: ExpenseInput) => Promise<Expense | null>;
  updateTransaction: (
    id: string,
    updates: ExpenseInput,
  ) => Promise<Expense | null>;
  deleteTransaction: (id: string) => Promise<void>;
  getTransactionById: (id: string) => Expense | undefined;
};

const TransactionsContext = createContext<TransactionsContextValue | null>(null);

export const TransactionsProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTransactions = useCallback(async () => {
    if (!user) {
      setTransactions([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const data = await getExpensesForCurrentUser(user.id);
      setTransactions(data);
    } catch (error) {
      console.error("Unable to fetch expenses", error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    const load = async () => {
      await fetchTransactions();
    };
    load();
  }, [fetchTransactions]);

  const addTransaction: TransactionsContextValue["addTransaction"] =
    useCallback(
      async (input) => {
        if (!user) return null;
        try {
          const created = await createExpense(user.id, input);
          setTransactions((prev) => [created, ...prev]);
          return created;
        } catch (error) {
          console.error("Create transaction failed", error);
          throw error;
        }
      },
      [user],
    );

  const updateTransaction: TransactionsContextValue["updateTransaction"] =
    useCallback(
      async (id, updates) => {
        if (!user) return null;
        try {
          const updated = await updateExpenseRow(id, user.id, updates);
          setTransactions((prev) =>
            prev.map((tx) => (tx.id === id ? updated : tx)),
          );
          return updated;
        } catch (error) {
          console.error("Update transaction failed", error);
          throw error;
        }
      },
      [user],
    );

  const deleteTransaction: TransactionsContextValue["deleteTransaction"] =
    useCallback(
      async (id) => {
        if (!user) return;
        try {
          await deleteExpenseRow(id, user.id);
          setTransactions((prev) => prev.filter((tx) => tx.id !== id));
        } catch (error) {
          console.error("Delete transaction failed", error);
          throw error;
        }
      },
      [user],
    );

  const value = useMemo(
    () => ({
      transactions,
      loading,
      refreshTransactions: fetchTransactions,
      addTransaction,
      updateTransaction,
      deleteTransaction,
      getTransactionById: (id: string) =>
        transactions.find((transaction) => transaction.id === id),
    }),
    [
      transactions,
      loading,
      fetchTransactions,
      addTransaction,
      updateTransaction,
      deleteTransaction,
    ],
  );

  return (
    <TransactionsContext.Provider value={value}>
      {children}
    </TransactionsContext.Provider>
  );
};

export const useTransactions = () => {
  const context = useContext(TransactionsContext);
  if (!context) {
    throw new Error("useTransactions must be used within TransactionsProvider");
  }
  return context;
};
