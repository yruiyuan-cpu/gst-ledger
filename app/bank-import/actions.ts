'use server';

import {
  importBankRows,
  buildDedupeKey,
  type BankImportRow,
} from "@/lib/bank-import";
import { supabase } from "@/lib/supabase";

type SessionTokens = {
  access_token: string;
  refresh_token: string;
};

export const importBankRowsAction = async (
  rows: BankImportRow[],
  tokens: SessionTokens,
) => {
  try {
    const { error: sessionError } = await supabase.auth.setSession(tokens);
    if (sessionError) {
      return {
        ok: false,
        message: "Failed to set session",
        details: sessionError.message,
      };
    }

    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData?.user?.id) {
      return { ok: false, message: "Not authenticated", details: userError?.message };
    }

    // Normalize dates and build date range from incoming rows
    const datedRows = rows
      .filter((row) => row.date)
      .map((row) => ({
        ...row,
        normalizedDate: row.date,
      }));

    const dateValues = datedRows.map((row) => row.normalizedDate);
    if (dateValues.length === 0) {
      return { ok: false, message: "No valid dates to import." };
    }

    const minDate = dateValues.reduce((a, b) => (a < b ? a : b));
    const maxDate = dateValues.reduce((a, b) => (a > b ? a : b));

    // Fetch existing expenses in the date range to build dedupe set
    const { data: existingData, error: existingError } = await supabase
      .from("expenses")
      .select("date, amount, description")
      .eq("user_id", userData.user.id)
      .gte("date", minDate)
      .lte("date", maxDate);

    if (existingError) {
      return {
        ok: false,
        message: "Failed to load existing expenses",
        details: existingError.message,
      };
    }

    const existingKeys = new Set(
      (existingData ?? []).map((row) =>
        buildDedupeKey({
          date: row.date,
          amount: Number(row.amount ?? 0),
          description: row.description ?? "",
        }),
      ),
    );

    // Filter incoming rows against dedupe set
    const rowsToImport = rows.filter((row) => {
      if (!row.date || row.amount === null) return false;
      const amountValue = Math.round(Math.abs(row.amount) * 100) / 100;
      const descriptionParts = [
        row.counterparty?.trim() ?? "",
        row.description?.trim() ?? "",
      ].filter(Boolean);
      const description = descriptionParts.join(" - ") || "Imported transaction";

      const key = buildDedupeKey({
        date: row.date,
        amount: amountValue,
        description,
      });

      if (existingKeys.has(key)) {
        return false;
      }

      existingKeys.add(key);
      return true;
    });

    const importResult = await importBankRows(userData.user.id, rowsToImport);
    return { ok: true, ...importResult };
  } catch (error) {
    console.error("Failed to import bank rows", JSON.stringify(error, null, 2));
    const message =
      error instanceof Error ? error.message : "Failed to import bank rows";
    return { ok: false, message: "Failed to import bank rows", details: message };
  }
};
