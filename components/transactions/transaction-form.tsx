'use client';

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  type Category,
  type Expense,
  type ExpenseType,
} from "@/lib/transactions";
import {
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
} from "@/lib/categories";
import {
  calculateGstFromGross,
  formatCurrency,
  isGstDefaultIncluded,
} from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/components/auth-provider";

type FormErrors = {
  date?: string;
  amount?: string;
  category?: string;
};

type TransactionFormProps = {
  mode: "create" | "edit";
  initialValues?: Partial<Expense>;
  onSubmit: (values: {
    date: string;
    amount: number;
    category: Category;
    description: string;
    gstIncluded: boolean;
    receiptUrl?: string | null;
    type: ExpenseType;
  }) => void | Promise<void>;
  onCancelHref: string;
  submitLabel?: string;
  successLabel?: string;
  redirectTo?: string;
  successQueryKey?: string;
};

const TransactionForm = ({
  mode,
  initialValues,
  onSubmit,
  onCancelHref,
  submitLabel = mode === "edit" ? "Save changes" : "Save transaction",
  successLabel = "Transaction saved",
  redirectTo,
  successQueryKey,
}: TransactionFormProps) => {
  const router = useRouter();
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const dateInputRef = useRef<HTMLInputElement | null>(null);
  const [date, setDate] = useState(initialValues?.date ?? "");
  const [amount, setAmount] = useState(
    initialValues?.amount ? String(initialValues.amount) : "",
  );
  const [category, setCategory] = useState<string>(
    initialValues?.category ?? "",
  );
  const [gstIncluded, setGstIncluded] = useState(
    initialValues?.gstIncluded ?? true,
  );
  const [description, setDescription] = useState(
    initialValues?.description ?? "",
  );
  const [receiptUrl, setReceiptUrl] = useState<string | undefined>(
    initialValues?.receiptUrl ?? undefined,
  );
  const [transactionType, setTransactionType] = useState<ExpenseType>(
    initialValues?.type ?? "expense",
  );
  const [errors, setErrors] = useState<FormErrors>({});
  const [status, setStatus] = useState<"idle" | "success">("idle");
  const [uploadingReceipt, setUploadingReceipt] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [categoryQuery, setCategoryQuery] = useState("");
  const categoryDropdownRef = useRef<HTMLDivElement | null>(null);

  const numericAmount = useMemo(() => {
    if (!amount) return 0;
    const parsed = Number(amount);
    if (Number.isNaN(parsed)) return 0;
    return Math.round(parsed * 100) / 100;
  }, [amount]);

  const gstPortion = useMemo(
    () => (gstIncluded ? calculateGstFromGross(numericAmount) : 0),
    [numericAmount, gstIncluded],
  );
  const netAmount = useMemo(
    () => Math.max(numericAmount - gstPortion, 0),
    [numericAmount, gstPortion],
  );

  const categoryOptions = useMemo<string[]>(
    () =>
      transactionType === "income"
        ? [...INCOME_CATEGORIES]
        : [...EXPENSE_CATEGORIES],
    [transactionType],
  );

  const filteredCategories = useMemo(
    () =>
      categoryOptions.filter((option) =>
        option.toLowerCase().includes(categoryQuery.toLowerCase()),
      ),
    [categoryOptions, categoryQuery],
  );

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      if (
        categoryDropdownRef.current &&
        !categoryDropdownRef.current.contains(event.target as Node)
      ) {
        setCategoryOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  useEffect(() => {
    setCategoryOpen(false);
    setCategoryQuery("");
    if (category && !categoryOptions.includes(category)) {
      setCategory("");
    }
  }, [transactionType, category, categoryOptions]);

  const handleUploadReceipt = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!user) {
      setUploadError("You need to be logged in to upload receipts.");
      return;
    }

    setUploadingReceipt(true);
    setUploadError(null);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
      const datePart = date || new Date().toISOString().split("T")[0];
      const randomId =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `${Date.now()}`;
      const path = `${user.id}/${datePart}/${randomId}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("receipts")
        .upload(path, file, {
          cacheControl: "3600",
          upsert: false,
          contentType: file.type,
        });
      if (uploadError) throw uploadError;
      const { data } = supabase.storage.from("receipts").getPublicUrl(path);
      if (!data?.publicUrl) {
        throw new Error("Failed to fetch public URL for receipt.");
      }
      setReceiptUrl(data.publicUrl);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to upload receipt. Please try again.";
      setUploadError(message);
      console.error("Receipt upload failed", error);
    } finally {
      setUploadingReceipt(false);
      if (event.target) {
        event.target.value = "";
      }
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const nextErrors: FormErrors = {};

    if (!amount) nextErrors.amount = "Please enter an amount.";
    if (!category) nextErrors.category = "Please select a category.";
    if (!date) nextErrors.date = "Please choose a valid date.";

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    const parsedAmount =
      amount.trim() === "" ? 0 : numericAmount;

    await onSubmit({
      date,
      amount: parsedAmount,
      category: category as Category,
      description,
      gstIncluded,
      receiptUrl: receiptUrl ?? null,
      type: transactionType,
    });

    setStatus("success");
    if (redirectTo) {
      const url = successQueryKey
        ? `${redirectTo}?${successQueryKey}=1`
        : redirectTo;
      setTimeout(() => router.push(url), 50);
    }
  };

  return (
    <div className="grid gap-5 lg:grid-cols-3">
      <form
        onSubmit={handleSubmit}
        className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200/80 lg:col-span-2"
      >
        <div className="space-y-5">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-slate-700">
              Transaction type
            </label>
            <div className="flex gap-3 rounded-2xl border border-slate-200 p-2 text-sm font-medium text-slate-700">
              {(["expense", "income"] as ExpenseType[]).map((option) => (
                <button
                  type="button"
                  key={option}
                  onClick={() => setTransactionType(option)}
                  className={`flex-1 rounded-xl px-3 py-2 capitalize transition ${
                    transactionType === option
                      ? "bg-blue-600 text-white shadow-sm"
                      : "bg-white text-slate-700"
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-slate-700">Date</label>
            <div
              onClick={() => dateInputRef.current?.showPicker()}
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100"
            >
              <input
                ref={dateInputRef}
                type="date"
                value={date}
                onChange={(event) => setDate(event.target.value)}
                placeholder="Select date"
                className="w-full bg-transparent outline-none"
              />
            </div>
            {errors.date && <p className="text-sm text-rose-600">{errors.date}</p>}
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-slate-700">Amount</label>
            <input
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              value={amount}
              placeholder="eg. 460.00"
              onChange={(event) => setAmount(event.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
            />
            <p className="text-xs text-slate-500">
              Enter the total amount shown on the receipt.
            </p>
            {errors.amount && (
              <p className="text-sm text-rose-600">{errors.amount}</p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-slate-700">Category</label>
            <div ref={categoryDropdownRef} className="relative">
              <button
                type="button"
                onClick={() => setCategoryOpen((prev) => !prev)}
                className="flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
              >
                <span className={category ? "text-slate-900" : "text-slate-500"}>
                  {category ||
                    `Select ${
                      transactionType === "income" ? "income" : "expense"
                    } category`}
                </span>
                <svg
                  className="h-4 w-4 text-slate-500"
                  viewBox="0 0 20 20"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                >
                  <path d="M6 8l4 4 4-4" />
                </svg>
              </button>
              {categoryOpen && (
                <div className="absolute z-20 mt-2 w-full rounded-2xl border border-slate-200 bg-white shadow-xl">
                  <div className="p-2">
                    <input
                      type="text"
                      value={categoryQuery}
                      onChange={(event) => setCategoryQuery(event.target.value)}
                      placeholder="Search categories..."
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                      autoFocus
                    />
                  </div>
                  <div className="max-h-48 overflow-y-auto">
                    {filteredCategories.length === 0 ? (
                      <p className="px-4 py-3 text-sm text-slate-500">
                        No categories found
                      </p>
                    ) : (
                      filteredCategories.map((option) => (
                        <button
                          type="button"
                          key={option}
                          onClick={() => {
                            setCategory(option);
                            setCategoryOpen(false);
                            setCategoryQuery("");
                            setGstIncluded(isGstDefaultIncluded(option as Category));
                          }}
                          className={`flex w-full items-center justify-between px-4 py-2 text-left text-sm ${
                            category === option
                              ? "bg-blue-50 text-blue-700"
                              : "text-slate-700 hover:bg-slate-50"
                          }`}
                        >
                          {option}
                          {category === option && (
                            <svg
                              className="h-4 w-4 text-blue-600"
                              viewBox="0 0 20 20"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                            >
                              <path d="M5 10l3 3 7-7" />
                            </svg>
                          )}
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
            {errors.category && (
              <p className="text-sm text-rose-600">{errors.category}</p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-700">
                  Includes NZ GST?
                </p>
                <p className="text-xs text-slate-500">
                  This amount includes 15% NZ GST
                </p>
              </div>
              <label className="relative inline-flex cursor-pointer items-center">
                <input
                  type="checkbox"
                  checked={gstIncluded}
                  onChange={(event) => setGstIncluded(event.target.checked)}
                  className="peer sr-only"
                />
                <div className="h-6 w-11 rounded-full bg-slate-200 transition peer-checked:bg-blue-600" />
                <div className="absolute left-1 top-1 h-4 w-4 rounded-full bg-white transition peer-checked:translate-x-5" />
              </label>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-slate-700">
              Description (optional)
            </label>
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="eg. Timber from Bunnings, kitchen renovation project"
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
              rows={3}
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-slate-700">
              Receipt upload (optional)
            </label>
            <div className="flex flex-col gap-2 rounded-2xl border border-dashed border-slate-200 p-4">
              <p className="text-sm text-slate-600">
                Upload a receipt image or paste a URL below.
              </p>
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800 shadow-sm transition hover:border-blue-200 hover:text-blue-700"
                >
                  {uploadingReceipt ? "Uploading…" : "Upload receipt"}
                </button>
                {receiptUrl && (
                  <Link
                    href={receiptUrl}
                    target="_blank"
                    className="text-sm font-medium text-blue-600"
                  >
                    View uploaded receipt
                  </Link>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleUploadReceipt}
              />
              {uploadError && (
                <p className="text-sm text-rose-600">{uploadError}</p>
              )}
            </div>
          </div>

          <input type="hidden" name="receiptUrl" value={receiptUrl ?? ""} />
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="submit"
            disabled={uploadingReceipt}
            className="rounded-full bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-60"
          >
            {uploadingReceipt ? "Uploading…" : submitLabel}
          </button>
          <Link
            href={onCancelHref}
            className="rounded-full border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300"
          >
            Cancel
          </Link>
          {status === "success" && (
            <span className="text-sm font-medium text-emerald-600">
              {successLabel}
            </span>
          )}
        </div>
      </form>

      <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200/80">
        <h2 className="text-lg font-semibold text-slate-900">GST summary</h2>
        <p className="mt-1 text-sm text-slate-600">
          Updates live as you enter details.
        </p>
        <div className="mt-4 space-y-3 rounded-xl bg-slate-50 p-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-600">Amount (incl. GST)</span>
            <span className="font-semibold text-slate-900">
              {formatCurrency(numericAmount)}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-600">GST (15% input tax)</span>
            <span className="font-semibold text-slate-900">
              {formatCurrency(gstPortion)}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-600">Net amount (excl. GST)</span>
            <span className="font-semibold text-slate-900">
              {formatCurrency(netAmount)}
            </span>
          </div>
        </div>
        <div className="mt-4 rounded-xl bg-blue-50 p-4 text-sm text-blue-800">
          Using 3/23 of the GST-inclusive total to get the 15% GST portion.
        </div>
      </div>
    </div>
  );
};

export default TransactionForm;
