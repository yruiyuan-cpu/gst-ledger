'use client';

import { useState } from "react";
import Papa from "papaparse";
import { useRouter } from "next/navigation";
import { importBankRowsAction } from "./actions";
import type { BankImportRow } from "@/lib/bank-import";
import {
  CATEGORY_OPTIONS,
  guessCategoryForText,
} from "@/lib/bank-import";
import { supabase } from "@/lib/supabase";

export default function BankImportPage() {
  const [file, setFile] = useState<File | null>(null);
  const [importRows, setImportRows] = useState<BankImportRow[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const router = useRouter();

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files?.[0] ?? null;
    setFile(selected);
    setImportRows([]);
    setParseError(null);
  };

  const handleParse = () => {
    if (!file) return;
    setParsing(true);
    setParseError(null);
    setImportRows([]);
    // no local success banner; we redirect with query params
    setImportError(null);

    Papa.parse(file, {
      header: false,
      delimiter: ",",
      skipEmptyLines: "greedy",
      complete: (result) => {
        if (result.errors?.length) {
          console.log("CSV parse warnings", result.errors);
        }

        const rows = result.data as string[][];
        const headerIndex = rows.findIndex(
          (row) =>
            Array.isArray(row) &&
            row[0]?.toString().trim() === "Date" &&
            row[6]?.toString().trim() === "Amount",
        );

        if (headerIndex === -1) {
          setImportRows([]);
          setParseError(
            "We could not recognize any rows from this CSV. Please check the file format.",
          );
          setParsing(false);
          return;
        }

        const dataRows = rows.slice(headerIndex + 1);
        const mappedWithNulls = dataRows.map((row, index): BankImportRow | null => {
          const cells = Array.isArray(row) ? row : [];
          const [
            date,
            uniqueId,
            tranType,
            chequeNbr,
            payee,
            memo,
            amountStr,
          ] = cells.map((value) =>
            typeof value === "string" ? value.trim() : String(value ?? "").trim(),
          );

          if (!date || !amountStr) return null;

          const amount = Number.parseFloat(amountStr.replace(/,/g, ""));
          if (Number.isNaN(amount)) return null;

          const description = [payee, memo].filter(Boolean).join(" - ");
          const counterparty = payee || null;
          const transactionType: BankImportRow["transactionType"] =
            amount < 0 ? "expense" : "income";
          const combinedText = [description || "", counterparty || ""]
            .join(" ")
            .trim();
          const categoryGuess = combinedText
            ? guessCategoryForText(
                combinedText,
                transactionType,
                CATEGORY_OPTIONS,
              )
            : null;

          return {
            id: `${date}-${uniqueId || tranType || chequeNbr || payee || index}`,
            import: true,
            date,
            description: description || null,
            amount,
            counterparty,
            transactionType,
            categoryId: categoryGuess,
          };
        });

        const mapped: BankImportRow[] = mappedWithNulls.filter(
          (row): row is BankImportRow => row !== null,
        );

        if (mapped.length === 0) {
          setImportRows([]);
          setParseError(
            "We could not recognize any rows from this CSV. Please check the file format.",
          );
        } else {
          setParseError(null);
          setImportRows(mapped);
        }

        setParsing(false);
      },
      error: (error) => {
        setParseError(error.message || "Failed to parse CSV file.");
        setParsing(false);
      },
    });
  };

  const handleImport = async () => {
    setImportError(null);
    if (importRows.length === 0) {
      setImportError("No rows to import.");
      return;
    }

    setImporting(true);
    try {
      const { data, error } = await supabase.auth.getSession();
      if (error) {
        throw error;
      }
      const session = data.session;
      if (!session?.user?.id || !session.access_token || !session.refresh_token) {
        throw new Error("You must be signed in to import.");
      }

      const result = await importBankRowsAction(importRows, {
        access_token: session.access_token,
        refresh_token: session.refresh_token,
      });

      if (!result.ok || !("imported" in result)) {
        setImportError(result.message ?? "Import failed. Please try again.");
        return;
      }

      const importedCount = result.imported ?? 0;
      const skippedCount = result.skipped ?? 0;

      router.push(
        `/transactions?imported=${importedCount}&skipped=${skippedCount}`,
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Import failed. Please try again.";
      setImportError(message);
    } finally {
      setImporting(false);
    }
  };

  const handleRowUpdate = (
    id: string,
    updater: (row: BankImportRow) => BankImportRow,
  ) => {
    setImportRows((prev) => prev.map((row) => (row.id === id ? updater(row) : row)));
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold text-slate-900">
          Bank statement import
        </h1>
        <p className="text-sm text-slate-600">
          Upload your CSV bank statement to get started.
        </p>
      </div>

      <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200/80">
        <div className="space-y-4">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-slate-700">
              Select CSV file
            </label>
            <input
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 shadow-sm transition hover:border-slate-300"
            />
            <p className="text-xs text-slate-500">
              Only .csv files are supported for now.
            </p>
          </div>

          {file && (
            <div className="flex flex-wrap items-center gap-3 rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-700">
              <span className="font-semibold">Selected:</span>
              <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-800 ring-1 ring-slate-200">
                {file.name}
              </span>
              <button
                type="button"
                onClick={handleParse}
                className="rounded-full bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-blue-700"
                disabled={parsing}
              >
                {parsing ? "Parsing…" : "Parse file"}
              </button>
            </div>
          )}

          {parseError && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {parseError}
            </div>
          )}

          {importError && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {importError}
            </div>
          )}

          {importRows.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-800">
                  Preview
                </h3>
                <span className="text-xs text-slate-500">
                  Parsed {importRows.length} rows
                </span>
              </div>
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold text-slate-700">
                        Import?
                      </th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-700">
                        Date
                      </th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-700">
                        Description
                      </th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-700">
                        Amount
                      </th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-700">
                        Counterparty
                      </th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-700">
                        Type
                      </th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-700">
                        Category
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {importRows.map((row) => (
                      <tr key={row.id}>
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                            checked={row.import}
                            onChange={(event) =>
                              handleRowUpdate(row.id, (current) => ({
                                ...current,
                                import: event.target.checked,
                              }))
                            }
                          />
                        </td>
                        <td className="px-4 py-3 text-slate-800">
                          {row.date || "—"}
                        </td>
                        <td className="px-4 py-3 text-slate-800">
                          {row.description || "—"}
                        </td>
                        <td className="px-4 py-3 text-slate-800">
                          {row.amount !== null ? row.amount : "—"}
                        </td>
                        <td className="px-4 py-3 text-slate-800">
                          {row.counterparty || "—"}
                        </td>
                        <td className="px-4 py-3 text-slate-800">
                          <select
                            value={row.transactionType}
                            onChange={(event) =>
                              handleRowUpdate(row.id, (current) => ({
                                ...current,
                                transactionType: event.target
                                  .value as BankImportRow["transactionType"],
                              }))
                            }
                            className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-sm shadow-sm focus:border-blue-400 focus:outline-none"
                          >
                            <option value="expense">Expense</option>
                            <option value="income">Income</option>
                          </select>
                        </td>
                        <td className="px-4 py-3 text-slate-800">
                          <select
                            value={row.categoryId ?? ""}
                            onChange={(event) =>
                              handleRowUpdate(row.id, (current) => ({
                                ...current,
                                categoryId:
                                  event.target.value === ""
                                    ? null
                                    : event.target.value,
                              }))
                            }
                            className="w-full min-w-[200px] rounded-lg border border-slate-200 bg-white px-2 py-1 text-sm shadow-sm focus:border-blue-400 focus:outline-none"
                          >
                            <option value="">Choose a category</option>
                            {CATEGORY_OPTIONS.map((category) => (
                              <option key={category.id} value={category.id}>
                                {category.name}
                              </option>
                            ))}
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={handleImport}
                  disabled={importing}
                  className="rounded-full bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-60"
                >
                  {importing ? "Importing…" : "Import selected rows"}
                </button>
                <span className="text-xs text-slate-500">
                  Only rows with a date and amount will be imported.
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
