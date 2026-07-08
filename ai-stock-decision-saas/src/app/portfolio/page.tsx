import { runRealFullAnalysis } from "@/lib/real-analysis-engine";
import { MetricCard } from "@/components/MetricCard";

export const dynamic = "force-dynamic";

const portfolioSeed = [
  { id: "1", symbol: "2330.TW", name: "台積電", shares: 1000, cost: 900 },
  { id: "2", symbol: "2317.TW", name: "鴻海", shares: 1000, cost: 180 }
];

export default async function PortfolioPage() {
  const rows = await Promise.all(portfolioSeed.map(async (item) => ({ item, analysis: await runRealFullAnalysis(item.symbol) })));
  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-slate-400">Portfolio</p>
        <h1 className="text-3xl font-black text-white">持股管理</h1>
      </div>
      <div className="grid gap-4">
        {rows.map(({ item, analysis }) => {
          const pnl = ((analysis.price - item.cost) / item.cost) * 100;
          return (
            <div key={item.id} className="glass rounded-3xl p-5">
              <div className="grid gap-4 md:grid-cols-5">
                <MetricCard label="持股" value={`${item.name} ${item.symbol}`} sub={`${item.shares.toLocaleString()} 股`} />
                <MetricCard label="成本 / 現價" value={`${item.cost} / ${analysis.price.toFixed(2)}`} />
                <MetricCard label="損益率" value={`${pnl >= 0 ? "+" : ""}${pnl.toFixed(2)}%`} tone={pnl >= 0 ? "bull" : "bear"} />
                <MetricCard label="個人化建議" value={analysis.postEntryForecast.positionAdvice} sub={analysis.postEntryForecast.reason} />
                <MetricCard label="停損 / 目標" value={`${analysis.stopLossPrice} / ${analysis.takeProfit1}`} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
