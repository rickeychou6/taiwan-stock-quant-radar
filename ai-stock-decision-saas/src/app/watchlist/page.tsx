import { runFullAnalysis } from "@/lib/analysis-engine";
import { watchlistSeed } from "@/lib/mock-data";
import { MetricCard } from "@/components/MetricCard";

export default function WatchlistPage() {
  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-slate-400">Watchlist</p>
        <h1 className="text-3xl font-black text-white">自選股清單</h1>
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        {watchlistSeed.map((item) => {
          const analysis = runFullAnalysis(item.symbol);
          return (
            <div key={item.id} className="glass rounded-3xl p-5">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-xl font-black text-white">{item.name}</h2>
                  <p className="text-sm text-slate-400">{item.symbol}</p>
                </div>
                <span className="rounded-full bg-blue-500/15 px-3 py-1 text-sm text-blue-200">{analysis.finalScore}</span>
              </div>
              <div className="mt-4 grid gap-3">
                <MetricCard label="訊號" value={analysis.action} sub={analysis.postEntryForecast.positionAdvice} />
                <MetricCard label="警示" value={item.alert} />
                <MetricCard label="買點 / 停損" value={analysis.buyPrice} sub={`${analysis.stopLossPrice} 元`} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
