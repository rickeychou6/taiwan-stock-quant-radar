import { MetricCard } from "@/components/MetricCard";
import { marketMarginOverview, marketOverviewQuotes, type MarketMarginWarning, type MarketQuote } from "@/lib/real-data";

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

function formatMoney(value: number, signed = false) {
  const abs = Math.abs(value);
  const sign = signed ? (value > 0 ? "+" : value < 0 ? "-" : "") : value < 0 ? "-" : "";
  if (abs >= 100_000_000_000) return `${sign}${(abs / 100_000_000_000).toFixed(2)} 千億`;
  if (abs >= 100_000_000) return `${sign}${(abs / 100_000_000).toFixed(2)} 億`;
  if (abs >= 10_000) return `${sign}${(abs / 10_000).toFixed(2)} 萬`;
  return `${sign}${Math.round(abs).toLocaleString("zh-TW")} 元`;
}

function formatShares(value: number) {
  return `${value >= 0 ? "+" : ""}${Math.round(value).toLocaleString("zh-TW")} 張`;
}

function quoteTone(quote: MarketQuote) {
  if (quote.symbol === "^VIX") return quote.change >= 0 ? "warn" : "bull";
  return quote.change >= 0 ? "bull" : "bear";
}

function safetyTone(level: string) {
  if (level === "安全") return "bull";
  if (level === "危險" || level === "警戒") return "bear";
  if (level === "注意" || level === "資料不足") return "warn";
  return "neutral";
}

function warningClass(warning: MarketMarginWarning) {
  if (warning.severity === "danger") return "border-rose-400/30 bg-rose-400/10 text-rose-100";
  if (warning.severity === "warn") return "border-amber-400/30 bg-amber-400/10 text-amber-100";
  return "border-emerald-400/25 bg-emerald-400/10 text-emerald-100";
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
  const [quotes, marginOverview] = await Promise.all([marketOverviewQuotes(), marketMarginOverview()]);
  const headline = quotes.filter((quote) => quote.group !== "futures" && quote.group !== "twfutures");
  const twFutures = quotes.filter((quote) => quote.group === "twfutures");
  const futures = quotes.filter((quote) => quote.group === "futures");

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-slate-400">Market Overview</p>
        <h1 className="text-3xl font-black text-white">市場總覽</h1>
        <p className="mt-2 text-slate-300">資料來源：TWSE MIS、TAIFEX 官方即時行情與 Yahoo Finance。顯示最新點數、漲跌點與漲跌百分比。</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {headline.map((quote) => <MarketQuoteCard key={quote.symbol} quote={quote} />)}
      </div>

      <div className="glass rounded-3xl p-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm text-slate-400">Market Margin Financing</p>
            <h2 className="text-xl font-black text-white">大盤融資水位</h2>
          </div>
          <p className="text-sm text-slate-400">
            {marginOverview.date || "最新官方資料"} · {marginOverview.source}
          </p>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            label="融資安全狀態"
            value={marginOverview.safety.level}
            sub={`${marginOverview.safety.score} 分 · ${marginOverview.safety.summary}`}
            tone={safetyTone(marginOverview.safety.level)}
          />
          <MetricCard
            label="目前融資總額"
            value={formatMoney(marginOverview.currentAmount)}
            sub={`原來總額 ${formatMoney(marginOverview.previousAmount)}`}
            tone="neutral"
          />
          <MetricCard
            label="融資增減金額"
            value={formatMoney(marginOverview.changeAmount, true)}
            sub={`相對原總額 ${formatPct(marginOverview.changePct)} · ${marginOverview.marketCount} 檔`}
            tone={marginOverview.changeAmount > 0 ? "warn" : "bull"}
          />
          <MetricCard
            label="融資餘額增減"
            value={formatShares(marginOverview.balanceChange)}
            sub={`融資張數變化 ${formatPct(marginOverview.balanceChangePct)}`}
            tone={marginOverview.balanceChange > 0 ? "warn" : "bull"}
          />
          <MetricCard
            label="融資使用率"
            value={`${marginOverview.utilizationPct.toFixed(2)}%`}
            sub={`融資餘額 / 融資限額`}
            tone={safetyTone(marginOverview.safety.level)}
          />
          <MetricCard
            label="融資總額 / 成交值"
            value={`${marginOverview.amountToTurnoverPct.toFixed(2)}%`}
            sub={`今日成交值 ${formatMoney(marginOverview.turnover)}`}
            tone={safetyTone(marginOverview.safety.level)}
          />
          <MetricCard
            label="上市融資水位"
            value={formatMoney(marginOverview.listedAmount)}
            sub={`今日增減 ${formatMoney(marginOverview.listedChangeAmount, true)}`}
            tone={marginOverview.listedChangeAmount > 0 ? "warn" : "bull"}
          />
          <MetricCard
            label="上櫃融資水位"
            value={formatMoney(marginOverview.otcAmount)}
            sub={`今日增減 ${formatMoney(marginOverview.otcChangeAmount, true)}`}
            tone={marginOverview.otcChangeAmount > 0 ? "warn" : "bull"}
          />
        </div>

        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          {marginOverview.safety.warnings.map((warning) => (
            <div key={warning.id} className={`rounded-2xl border p-4 ${warningClass(warning)}`}>
              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <p className="font-black">{warning.label}</p>
                <p className="text-sm font-bold">{warning.triggeredValue}</p>
              </div>
              <p className="mt-2 text-sm leading-6 opacity-90">{warning.message}</p>
            </div>
          ))}
        </div>
      </div>

      {twFutures.length > 0 ? (
        <div className="glass rounded-3xl p-5">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm text-slate-400">TAIFEX Taiwan Index Futures</p>
              <h2 className="text-xl font-black text-white">台指期日 / 夜盤</h2>
            </div>
            <p className="text-sm text-slate-400">免費官方即時行情，依成交量自動選取近月活躍合約。</p>
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {twFutures.map((quote) => (
              <div key={quote.symbol} className="glass rounded-2xl p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm text-slate-400">{quote.label}</p>
                    <p className="mt-1 text-xs text-slate-500">{quote.symbol}</p>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-bold ${quote.change >= 0 ? "bg-emerald-400/15 text-emerald-300" : "bg-rose-400/15 text-rose-300"}`}>
                    {formatPct(quote.changePct)}
                  </span>
                </div>
                <p className={`mt-4 text-4xl font-black tracking-tight ${quote.change >= 0 ? "text-emerald-300" : "text-rose-300"}`}>
                  {formatNumber(quote.price)}
                </p>
                <p className={`mt-2 text-base font-bold ${quote.change >= 0 ? "text-emerald-300" : "text-rose-300"}`}>
                  {formatChange(quote.change)} 點 / {formatPct(quote.changePct)}
                </p>
                <p className="mt-3 text-xs text-slate-400">{quote.session} · {quote.source}</p>
              </div>
            ))}
          </div>
        </div>
      ) : null}

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
