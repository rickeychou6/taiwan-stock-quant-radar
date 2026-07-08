import { MetricCard } from "@/components/MetricCard";
import { marketSnapshot } from "@/lib/real-data";

export const dynamic = "force-dynamic";

const markets = [
  ["台股大盤", "+0.82%", "多頭安全區"],
  ["台指期", "+0.41%", "正價差"],
  ["Nasdaq", "+1.18%", "科技股偏多"],
  ["S&P 500", "+0.62%", "風險偏好"],
  ["道瓊", "+0.21%", "溫和偏多"],
  ["費半", "+1.56%", "半導體強勢"],
  ["VIX", "-3.20%", "恐慌下降"],
  ["美元指數", "-0.12%", "中性"],
  ["美債10Y", "-0.04%", "估值壓力下降"],
  ["原油", "+0.33%", "通膨觀察"],
  ["黃金", "+0.18%", "避險中性"],
  ["BTC", "+2.70%", "風險資產偏多"]
];

function OldMarketPage() {
  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-slate-400">Market Overview</p>
        <h1 className="text-3xl font-black text-white">市場總覽</h1>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {markets.map(([label, value, sub]) => (
          <MetricCard key={label} label={label} value={value} sub={sub} tone={value.startsWith("+") ? "bull" : value.startsWith("-") && label !== "VIX" ? "bear" : "neutral"} />
        ))}
      </div>
      <div className="glass rounded-3xl p-5">
        <h2 className="text-xl font-black text-white">產業資金輪動</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-5">
          {["半導體", "AI 伺服器", "光通訊", "金融", "塑化"].map((sector, idx) => (
            <div key={sector} className="rounded-2xl bg-slate-900 p-4">
              <p className="text-sm text-slate-400">{sector}</p>
              <p className="mt-2 text-2xl font-black text-white">{[88, 82, 76, 54, 41][idx]}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const marketLabels: Record<string, string> = {
  "^TWII": "台股加權",
  "^IXIC": "Nasdaq",
  "^GSPC": "S&P 500",
  "^DJI": "道瓊",
  "^SOX": "費半",
  "DX-Y.NYB": "美元指數",
  "GC=F": "黃金",
  "CL=F": "原油",
  "^VIX": "VIX",
  "BTC-USD": "BTC"
};

export default async function MarketPage() {
  const snapshot = await marketSnapshot();
  const rows = Object.entries(snapshot);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-slate-400">Market Overview</p>
        <h1 className="text-3xl font-black text-white">市場總覽</h1>
        <p className="mt-2 text-slate-300">資料來源：Yahoo Finance 真實市場報價快照。</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {rows.map(([symbol, value]) => (
          <MetricCard
            key={symbol}
            label={marketLabels[symbol] ?? symbol}
            value={`${value >= 0 ? "+" : ""}${value.toFixed(2)}%`}
            sub={symbol}
            tone={value >= 0 ? "bull" : symbol === "^VIX" ? "warn" : "bear"}
          />
        ))}
      </div>
      <div className="glass rounded-3xl p-5">
        <h2 className="text-xl font-black text-white">產業資金輪動</h2>
        <p className="mt-2 text-slate-300">
          產業資金流需串接 TWSE/TPEX 成交值分產業統計或 FinMind 後啟用；目前不使用模擬排名。
        </p>
      </div>
    </div>
  );
}
