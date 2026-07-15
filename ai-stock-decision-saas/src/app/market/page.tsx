import { MetricCard } from "@/components/MetricCard";
import { marketOverviewQuotes, type MarketQuote } from "@/lib/real-data";

export const dynamic = "force-dynamic";

function formatNumber(value: number) {
  return value.toLocaleString("zh-TW", { maximumFractionDigits: value >= 100 ? 2 : 4 });
}

function formatChange(value: number) {
  return `${value >= 0 ? "+" : ""}${formatNumber(value)}`;
}

function formatPct(value: number) {
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
}

function quoteTone(quote: MarketQuote) {
  if (quote.symbol === "^VIX") return quote.change >= 0 ? "warn" : "bull";
  return quote.change >= 0 ? "bull" : "bear";
}

function MarketQuoteCard({ quote }: { quote: MarketQuote }) {
  return (
    <MetricCard
      label={quote.label}
      value={formatNumber(quote.price)}
      sub={`${formatChange(quote.change)} 點 / ${formatPct(quote.changePct)} · ${quote.session} · ${quote.source}`}
      tone={quoteTone(quote)}
    />
  );
}

export default async function MarketPage() {
  const quotes = await marketOverviewQuotes();
  const headline = quotes.filter((quote) => quote.group !== "futures");
  const futures = quotes.filter((quote) => quote.group === "futures");

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-slate-400">Market Overview</p>
        <h1 className="text-3xl font-black text-white">市場總覽</h1>
        <p className="mt-2 text-slate-300">資料來源：Yahoo Finance 真實報價。顯示最新點數、漲跌點與漲跌百分比。</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {headline.map((quote) => <MarketQuoteCard key={quote.symbol} quote={quote} />)}
      </div>

      <div className="glass rounded-3xl p-5">
        <h2 className="text-xl font-black text-white">美股期貨日 / 夜盤</h2>
        <p className="mt-2 text-slate-300">期貨採電子盤即時報價，依台北時間標示日盤或夜盤，同時顯示點數、漲跌點與漲跌百分比。</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {futures.map((quote) => (
            <div key={quote.symbol} className="glass rounded-2xl p-4">
              <p className="text-sm text-slate-400">{quote.label}</p>
              <p className={`mt-2 text-2xl font-black tracking-tight ${quote.change >= 0 ? "text-emerald-300" : "text-rose-300"}`}>
                {formatNumber(quote.price)}
              </p>
              <p className={`mt-1 text-sm font-bold ${quote.change >= 0 ? "text-emerald-300" : "text-rose-300"}`}>
                {formatChange(quote.change)} 點 / {formatPct(quote.changePct)}
              </p>
              <p className="mt-1 text-xs text-slate-400">{quote.session} · {quote.symbol}</p>
            </div>
          ))}
        </div>
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
