export function ScoreRing({ score, label }: { score: number; label: string }) {
  const clamped = Math.max(0, Math.min(100, score));
  const color = clamped >= 70 ? "#22c55e" : clamped >= 45 ? "#f59e0b" : "#ef4444";
  return (
    <div className="flex items-center gap-4">
      <div
        className="grid h-28 w-28 place-items-center rounded-full"
        style={{ background: `conic-gradient(${color} ${clamped * 3.6}deg, rgba(148,163,184,.18) 0deg)` }}
      >
        <div className="grid h-20 w-20 place-items-center rounded-full bg-ink-950">
          <span className="text-2xl font-black text-white">{Math.round(clamped)}</span>
        </div>
      </div>
      <div>
        <p className="text-sm text-slate-400">{label}</p>
        <p className="text-lg font-bold text-white">AI 綜合分數</p>
      </div>
    </div>
  );
}
