type SummaryCardProps = {
  title: string;
  subtitle?: string;
  value: string;
  accent?: "primary" | "success" | "danger" | "muted";
  chip?: string;
};

const accentClasses = {
  primary: "text-blue-600",
  success: "text-emerald-600",
  danger: "text-rose-600",
  muted: "text-slate-900",
};

const SummaryCard = ({
  title,
  subtitle,
  value,
  accent = "muted",
  chip,
}: SummaryCardProps) => {
  return (
    <div className="flex h-full flex-col justify-between rounded-3xl border border-slate-100 bg-white p-6 shadow-lg shadow-slate-100/70">
      <div className="flex items-center gap-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
        <span>{title}</span>
        {chip && (
          <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-600">
            {chip}
          </span>
        )}
      </div>
      <div className={`mt-4 text-3xl font-semibold ${accentClasses[accent]}`}>
        {value}
      </div>
      {subtitle && <p className="mt-3 text-sm text-slate-500">{subtitle}</p>}
    </div>
  );
};

export default SummaryCard;
