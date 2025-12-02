import type { SupabaseClient } from "@supabase/supabase-js";
import type { GstFrequency } from "./utils";

export type UserSettings = {
  user_id: string;
  gst_frequency: GstFrequency;
  created_at?: string;
  updated_at?: string;
};

const DEFAULT_FREQUENCY: GstFrequency = "two-monthly";

export const getOrCreateUserSettings = async (
  supabase: SupabaseClient,
  userId: string,
): Promise<UserSettings> => {
  const { data, error } = await supabase
    .from("user_settings")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.error("Failed to fetch user settings", error);
  }

  if (data) {
    return data as UserSettings;
  }

  const { data: inserted, error: insertError } = await supabase
    .from("user_settings")
    .insert({
      user_id: userId,
      gst_frequency: DEFAULT_FREQUENCY,
    })
    .select("*")
    .maybeSingle();

  if (insertError) {
    if ((insertError as { code?: string }).code === "23505") {
      const { data: retry } = await supabase
        .from("user_settings")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();
      if (retry) return retry as UserSettings;
    }
    console.error("Failed to create default user settings", insertError);
    throw insertError;
  }

  if (!inserted) {
    throw new Error("Unable to create default settings");
  }

  return inserted as UserSettings;
};

export const updateUserFrequency = async (
  supabase: SupabaseClient,
  userId: string,
  frequency: GstFrequency,
): Promise<UserSettings> => {
  const { data, error } = await supabase
    .from("user_settings")
    .upsert(
      {
        user_id: userId,
        gst_frequency: frequency,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    )
    .select("*")
    .maybeSingle();

  if (error) {
    console.error("Failed to update user settings", error);
    throw error;
  }

  if (!data) {
    throw new Error("No settings returned after update");
  }

  return data as UserSettings;
};
