/**
 * One-off helper to clean existing expense amounts for a single user.
 * It sets every row's amount to its absolute value (no negative numbers).
 * Run manually once: `ts-node scripts/normalize-amounts.ts <USER_ID>`
 * Requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in env for update rights.
 */
import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars.");
  process.exit(1);
}

const userId = process.argv[2];

if (!userId) {
  console.error("Usage: ts-node scripts/normalize-amounts.ts <USER_ID>");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function normalize() {
  const { data, error } = await supabase
    .from("expenses")
    .select("id, amount")
    .eq("user_id", userId);

  if (error) {
    console.error("Failed to load expenses", error);
    process.exit(1);
  }

  const updates =
    data?.map((row) => ({
      id: row.id,
      amount: Math.abs(Number(row.amount ?? 0)),
    })) ?? [];

  if (updates.length === 0) {
    console.log("No expenses found for that user.");
    return;
  }

  const { error: updateError } = await supabase.from("expenses").upsert(updates);
  if (updateError) {
    console.error("Failed to normalize amounts", updateError);
    process.exit(1);
  }

  console.log(`Normalized amounts to positive values for user ${userId}`);
}

normalize();
