'use client';

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/components/auth-provider";
import {
  getOrCreateCurrentPeriod,
  listRecentPeriods,
  type GstPeriod,
  type GstPeriodStatus,
  formatPeriodRangeLabel,
} from "@/lib/gstPeriods";
import {
  formatCurrency,
  getGstSummaryForRange,
  type GstFrequency,
  type GstSummary,
} from "@/lib/utils";
import { getOrCreateUserSettings } from "@/lib/user-settings";

const emptySummary: GstSummary = {
  totalSalesInclGst: 0,
  totalSpendingInclGst: 0,
  gstOnSales: 0,
  gstToClaim: 0,
  netGst: 0,
};

const statusLabels: Record<GstPeriodStatus, string> = {
  open: "Open",
  ready_to_file: "Ready to file",
  filed: "Filed",
};

export default function GstReturnPage() {
  const { user } = useAuth();
  const [frequency, setFrequency] = useState<GstFrequency>("two-monthly");
  const [periods, setPeriods] = useState<GstPeriod[]>([]);
  const [selectedPeriodId, setSelectedPeriodId] = useState<number | null>(null);
  const [summary, setSummary] = useState<GstSummary>(emptySummary);
  const [loading, setLoading] = useState(true);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  const selectedPeriod = useMemo(
    () => periods.find((p) => p.id === selectedPeriodId) ?? null,
    [periods, selectedPeriodId],
  );

  useEffect(() => {
    const load = async () => {
      if (!user) return;
      setLoading(true);
      setError(null);
      setMessage(null);
      try {
        const settings = await getOrCreateUserSettings(supabase, user.id);
        const freq = settings.gst_frequency as GstFrequency;
        setFrequency(freq);

        const currentPeriod = await getOrCreateCurrentPeriod(
          supabase,
          user.id,
          freq,
          new Date(),
        );
        const existingPeriods = await listRecentPeriods(supabase, user.id, 6);

        const hasCurrent = existingPeriods.some(
          (item) => item.id === currentPeriod.id,
        );
        const merged = hasCurrent
          ? existingPeriods
          : [currentPeriod, ...existingPeriods];
        merged.sort((a, b) => (a.start_date < b.start_date ? 1 : -1));

        setPeriods(merged);
        setSelectedPeriodId(currentPeriod.id);
      } catch (err) {
        const msg =
          err instanceof Error
            ? err.message
            : "Failed to load GST periods.";
        setError(msg);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [user]);

  useEffect(() => {
    const loadSummary = async () => {
      if (!user || !selectedPeriod) return;
      setLoadingSummary(true);
      setError(null);
      setMessage(null);
      try {
        const value = await getGstSummaryForRange(
          supabase,
          user.id,
          new Date(selectedPeriod.start_date),
          new Date(selectedPeriod.end_date),
        );
        setSummary(value);
      } catch (err) {
        const msg =
          err instanceof Error
            ? err.message
            : "Failed to load GST summary.";
        setError(msg);
      } finally {
        setLoadingSummary(false);
      }
    };

    loadSummary();
  }, [selectedPeriod, user]);

  const handleStatusChange = async (status: GstPeriodStatus) => {
    if (!user || !selectedPeriod) return;
    setError(null);
    setMessage(null);
    const periodId = selectedPeriod.id;
    const { error: updateError } = await supabase
      .from("gst_periods")
      .update({
        status,
        updated_at: new Date().toISOString(),
      })
      .eq("id", periodId)
      .eq("user_id", user.id);

    if (updateError) {
      setError(updateError.message ?? "Failed to update status.");
      return;
    }

    setPeriods((prev) =>
      prev.map((period) =>
        period.id === periodId ? { ...period, status } : period,
      ),
    );
    setMessage(`Period marked as ${statusLabels[status]}.`);
  };

  const handleExport = async () => {
    if (!selectedPeriod) return;
    setExporting(true);
    setError(null);
    setMessage(null);
    try {
      const { data, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !data?.session?.access_token || !data.session.refresh_token) {
        throw new Error("You need to sign in again to export CSV.");
      }

      const response = await fetch("/gst-return/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          from: selectedPeriod.start_date,
          to: selectedPeriod.end_date,
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
        }),
      });

      if (!response.ok) {
        const details = await response.text();
        throw new Error(details || "Failed to export CSV.");
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `gst-return-${selectedPeriod.start_date}-${selectedPeriod.end_date}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      setMessage("CSV exported successfully.");
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Failed to export CSV.";
      setError(msg);
    } finally {
      setExporting(false);
    }
  };

  if (!user) {
    return (
      <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200/80">
        <p className="text-sm text-slate-700">
          Please sign in to view your GST return.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-semibold text-slate-900">GST return</h1>
        <p className="text-sm text-slate-600">
          Review GST summary for your current filing period and mark its status.
        </p>
      </div>

      <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200/80 space-y-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              GST filing frequency
            </p>
            <p className="text-sm font-medium text-slate-900 capitalize">
              {frequency.replace("-", " ")}
            </p>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Period
            </label>
            <select
              value={selectedPeriodId ?? ""}
              onChange={(event) => {
                const id = Number(event.target.value);
                setSelectedPeriodId(Number.isNaN(id) ? null : id);
              }}
              disabled={loading}
              className="min-w-[220px] rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 disabled:opacity-50"
            >
              {periods.map((period) => (
                <option key={period.id} value={period.id}>
                  {formatPeriodRangeLabel(period)}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Status
            </p>
            <span
              className={`inline-flex w-fit items-center rounded-full px-3 py-1 text-xs font-semibold ${
                selectedPeriod?.status === "filed"
                  ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
                  : selectedPeriod?.status === "ready_to_file"
                    ? "bg-amber-50 text-amber-700 ring-1 ring-amber-200"
                    : "bg-slate-100 text-slate-700 ring-1 ring-slate-200"
              }`}
            >
              {selectedPeriod ? statusLabels[selectedPeriod.status] : "—"}
            </span>
          </div>
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

        <div className="flex flex-wrap gap-3">
          {selectedPeriod?.status === "open" && (
            <button
              type="button"
              onClick={() => handleStatusChange("ready_to_file")}
              className="rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
            >
              Mark as Ready to file
            </button>
          )}
          {selectedPeriod?.status === "ready_to_file" && (
            <>
              <button
                type="button"
                onClick={() => handleStatusChange("filed")}
                className="rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700"
              >
                Mark as Filed
              </button>
              <button
                type="button"
                onClick={() => handleStatusChange("open")}
                className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800 shadow-sm transition hover:border-blue-200"
              >
                Back to Open
              </button>
            </>
          )}
          {selectedPeriod?.status === "filed" && (
            <button
              type="button"
              onClick={() => handleStatusChange("ready_to_file")}
              className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800 shadow-sm transition hover:border-blue-200"
            >
              Back to Ready to file
            </button>
          )}
          <button
            type="button"
            onClick={handleExport}
            disabled={!selectedPeriod || exporting}
            className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800 shadow-sm transition hover:border-blue-200 disabled:opacity-60"
          >
            {exporting ? "Exporting…" : "Export CSV"}
          </button>
        </div>
      </div>

      <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200/80 space-y-4">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              GST summary (this period)
            </h2>
            <p className="text-sm text-slate-500">
              {selectedPeriod ? formatPeriodRangeLabel(selectedPeriod) : "—"}
            </p>
          </div>
        </div>

        {loading || loadingSummary ? (
          <p className="text-sm text-slate-500">Loading summary…</p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <SummaryItem
              label="Total purchases & expenses (GST-incl.)"
              value={formatCurrency(summary.totalSpendingInclGst)}
            />
            <SummaryItem
              label="Total sales (GST-incl.)"
              value={formatCurrency(summary.totalSalesInclGst)}
            />
            <SummaryItem
              label="GST on sales (output tax)"
              value={formatCurrency(summary.gstOnSales)}
            />
            <SummaryItem
              label="GST to claim (input tax)"
              value={formatCurrency(summary.gstToClaim)}
            />
            <SummaryItem
              label="Net GST"
              value={formatCurrency(Math.abs(summary.netGst))}
              helper={summary.netGst >= 0 ? "GST to pay" : "GST refund"}
              highlight={summary.netGst >= 0 ? "text-rose-600" : "text-emerald-600"}
            />
          </div>
        )}
      </div>
    </div>
  );
}

const SummaryItem = ({
  label,
  value,
  helper,
  highlight,
}: {
  label: string;
  value: string;
  helper?: string;
  highlight?: string;
}) => (
  <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4 shadow-sm">
    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
      {label}
    </p>
    <p className={`mt-2 text-2xl font-semibold ${highlight ?? "text-slate-900"}`}>
      {value}
    </p>
    {helper && <p className="text-xs text-slate-500">{helper}</p>}
  </div>
);
