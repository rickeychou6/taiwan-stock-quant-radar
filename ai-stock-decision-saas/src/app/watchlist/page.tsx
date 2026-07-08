import { runRealFullAnalysis } from "@/lib/real-analysis-engine";
import { MetricCard } from "@/components/MetricCard";

export const dynamic = "force-dynamic";

const watchlistSeed = [
  { id: "1", symbol: "2330.TW", name: "台積電", alert: "接近關鍵買點" },
  { id: "2", symbol: "2317.TW", name: "鴻海", alert: "觀察量能突破" },
  { id: "3", symbol: "4976.TWO", name: "佳凌", alert: "留意停損線" }
];

export default async function WatchlistPage() {
  const rows = await Promise.all(watchlistSeed.map(async (item) => ({ item, analysis: await runRealFullAnalysis(item.symbol) })));
  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-slate-400">Watchlist</p>
        <h1 className="text-3xl font-black text-white">自選股清單</h1>
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        {rows.map(({ item, analysis }) => {
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
