import { cn } from "@/lib/utils";

export function MetricCard({
  label,
  value,
  sub,
  tone = "neutral"
}: {
  label: string;
  value: string | number;
  sub?: string;
  tone?: "neutral" | "bull" | "bear" | "warn";
}) {
  const toneClass = {
    neutral: "text-white",
    bull: "text-emerald-300",
    bear: "text-rose-300",
    warn: "text-amber-300"
  }[tone];
  return (
    <div className="glass rounded-2xl p-4">
      <p className="text-sm text-slate-400">{label}</p>
      <p className={cn("mt-2 text-2xl font-black tracking-tight", toneClass)}>{value}</p>
      {sub ? <p className="mt-1 text-xs text-slate-400">{sub}</p> : null}
    </div>
  );
}
