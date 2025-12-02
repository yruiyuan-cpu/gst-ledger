'use client';

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/components/auth-provider";
import {
  getOrCreateUserSettings,
  updateUserFrequency,
} from "@/lib/user-settings";
import type { GstFrequency } from "@/lib/utils";

const FREQUENCY_OPTIONS: { value: GstFrequency; label: string }[] = [
  { value: "monthly", label: "Monthly" },
  { value: "two-monthly", label: "Two-monthly" },
  { value: "six-monthly", label: "Six-monthly" },
];

export default function SettingsPage() {
  const { user } = useAuth();
  const [frequency, setFrequency] = useState<GstFrequency>("two-monthly");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!user) return;
      setLoading(true);
      setMessage(null);
      setError(null);
      try {
        const settings = await getOrCreateUserSettings(supabase, user.id);
        setFrequency(settings.gst_frequency as GstFrequency);
      } catch (err) {
        const msg =
          err instanceof Error
            ? err.message
            : "Failed to load GST settings.";
        setError(msg);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      await updateUserFrequency(supabase, user.id, frequency);
      setMessage("Settings saved successfully.");
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : "Failed to save GST settings.";
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  if (!user) {
    return (
      <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200/80">
        <p className="text-sm text-slate-700">
          Please sign in to manage your GST settings.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold text-slate-900">Settings</h1>
        <p className="text-sm text-slate-600">
          Configure your GST filing preferences.
        </p>
      </div>

      <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200/80">
        <div className="flex flex-col gap-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              GST settings
            </h2>
            <p className="text-sm text-slate-600">
              Choose how often you file GST with IRD.
            </p>
          </div>

          {error && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}
            </div>
          )}
          {message && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              {message}
            </div>
          )}

          <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
            GST filing frequency
            <select
              value={frequency}
              onChange={(event) =>
                setFrequency(event.target.value as GstFrequency)
              }
              disabled={loading}
              className="max-w-xs rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 disabled:opacity-60"
            >
              {FREQUENCY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <div>
            <button
              type="button"
              onClick={handleSave}
              disabled={loading || saving}
              className="rounded-full bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
