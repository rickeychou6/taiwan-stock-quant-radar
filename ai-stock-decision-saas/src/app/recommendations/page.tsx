import Link from "next/link";
import { ArrowDownRight, ArrowUpRight, ShieldCheck, Target, TrendingUp } from "lucide-react";
import { MetricCard } from "@/components/MetricCard";
import { runStockRecommendations, type StockRecommendation } from "@/lib/recommendation-engine";

export const dynamic = "force-dynamic";

function formatPrice(value: number) {
  return `${value.toFixed(2)} 元`;
}

function formatPct(value: number) {
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
}

function formatMoney(value: number) {
  if (!Number.isFinite(value) || value <= 0) return "-";
  if (value >= 100_000_000) return `${(value / 100_000_000).toFixed(2)} 億元`;
  if (value >= 10_000) return `${(value / 10_000).toFixed(0)} 萬元`;
  return `${Math.round(value).toLocaleString()} 元`;
}

function recommendationTone(item: StockRecommendation) {
  if (item.recommendation === "買入候選") return "border-emerald-400/50 bg-emerald-400/10 text-emerald-200";
  if (item.recommendation === "可小量試單") return "border-blue-400/50 bg-blue-400/10 text-blue-100";
  if (item.recommendation === "接近買點") return "border-cyan-400/50 bg-cyan-400/10 text-cyan-100";
  if (item.recommendation === "等待回檔") return "border-amber-400/50 bg-amber-400/10 text-amber-200";
  return "border-slate-500/50 bg-slate-500/10 text-slate-200";
}

function safetyTone(level: StockRecommendation["marginSafetyLevel"]) {
  if (level === "安全") return "bull";
  if (level === "危險") return "bear";
  if (level === "資料不足") return "neutral";
  return "warn";
}

function RecommendationCard({ item, rank }: { item: StockRecommendation; rank: number }) {
  const isUp = item.changePct >= 0;

  return (
    <article className="glass rounded-3xl p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <span className="grid h-9 w-9 place-items-center rounded-2xl bg-blue-600 text-sm font-black text-white">
              {rank}
            </span>
            <div>
              <h2 className="text-2xl font-black text-white">{item.name}</h2>
              <p className="text-sm text-slate-400">{item.symbol} · {item.trendStage} · {item.holdingPeriod}</p>
            </div>
          </div>
        </div>

        <div className={`rounded-2xl border px-4 py-2 text-sm font-black ${recommendationTone(item)}`}>
          {item.recommendation}
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <MetricCard label="現價" value={formatPrice(item.price)} sub={formatPct(item.changePct)} tone={isUp ? "bull" : "bear"} />
        <MetricCard label="AI 分數" value={item.finalScore} sub={`信心 ${item.confidence}%`} tone={item.finalScore >= 66 ? "bull" : item.finalScore >= 55 ? "warn" : "neutral"} />
        <MetricCard label="進場建議" value={item.entryAdvice} sub={item.entryRule} tone={item.entryAdvice === "應買" || item.entryAdvice === "可買" ? "bull" : item.entryAdvice === "不買" || item.entryAdvice === "觀察" ? "bear" : "warn"} />
        <MetricCard label="融資水位" value={item.marginSafetyLevel} sub={`${item.marginSafetyScore} 分，警示 ${item.marginWarningsCount} 項`} tone={safetyTone(item.marginSafetyLevel)} />
        <MetricCard label="融資金額" value={formatMoney(item.marginAmount)} sub={`佔比 ${item.marginUtilizationPct.toFixed(2)}%`} tone={item.marginUtilizationPct >= 30 || item.marginChangePct >= 5 ? "bear" : item.marginUtilizationPct >= 20 || item.marginChange > 0 ? "warn" : "neutral"} />
        <MetricCard label="融資增減" value={`${item.marginChange >= 0 ? "+" : ""}${item.marginChange.toLocaleString()} 張`} sub={formatPct(item.marginChangePct)} tone={item.marginChange <= 0 ? "bull" : item.marginChangePct >= 5 ? "bear" : "warn"} />
        <MetricCard label="買入區間" value={item.idealBuyPrice} sub="分批掛單區" tone="bull" />
        <MetricCard label="停損價" value={formatPrice(item.stopLossPrice)} sub="跌破應停損" tone="bear" />
        <MetricCard label="賣出目標" value={item.sellPrice} sub="第一 / 第二目標" tone="warn" />
        <MetricCard label="3-5 天機率" value={`${item.probabilityUp3To5}%`} sub={`第 5 天 ${formatPct(item.forecastDay5Pct)}`} tone={item.probabilityUp3To5 >= 56 ? "bull" : "warn"} />
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-2xl border border-slate-700/60 bg-slate-950/35 p-4">
          <h3 className="flex items-center gap-2 text-lg font-black text-white">
            <TrendingUp className="h-5 w-5 text-emerald-300" />
            推薦原因
          </h3>
          <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-300">
            {item.reasons.map((reason) => (
              <li key={reason}>• {reason}</li>
            ))}
          </ul>
          {item.warning ? <p className="mt-3 rounded-2xl bg-rose-500/10 p-3 text-sm text-rose-200">{item.warning}</p> : null}
        </div>

        <div className="rounded-2xl border border-slate-700/60 bg-slate-950/35 p-4">
          <h3 className="flex items-center gap-2 text-lg font-black text-white">
            <Target className="h-5 w-5 text-blue-300" />
            交易規劃
          </h3>
          <div className="mt-3 space-y-3 text-sm text-slate-300">
            <div className="flex items-center justify-between gap-4">
              <span className="flex items-center gap-2"><ArrowUpRight className="h-4 w-4 text-emerald-300" />買入規劃</span>
              <span className="font-bold text-white">{item.buyPrice}</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="flex items-center gap-2"><ArrowDownRight className="h-4 w-4 text-rose-300" />停損</span>
              <span className="font-bold text-white">{formatPrice(item.stopLossPrice)}</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-amber-300" />報酬風險比</span>
              <span className="font-bold text-white">1 : {item.riskReward.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span>持股後建議</span>
              <span className="font-bold text-white">{item.positionAdvice}</span>
            </div>
          </div>
          <Link
            href={`/dashboard?symbol=${encodeURIComponent(item.symbol)}`}
            className="mt-4 inline-flex w-full justify-center rounded-2xl bg-blue-600 px-4 py-3 text-sm font-black text-white transition hover:bg-blue-500"
          >
            查看完整單股分析
          </Link>
        </div>
      </div>
    </article>
  );
}

export default async function RecommendationsPage() {
  const report = await runStockRecommendations({ scanLimit: 30, outputLimit: 18, concurrency: 5 });
  const buyRows = report.recommendations.filter((item) => item.recommendation === "買入候選" || item.recommendation === "可小量試單");
  const nearRows = report.recommendations.filter((item) => item.recommendation === "接近買點" || item.recommendation === "等待回檔");
  const avoidRows = report.recommendations.filter((item) => item.recommendation === "暫不買入");
  const averageScore = report.recommendations.length
    ? Math.round(report.recommendations.reduce((sum, item) => sum + item.finalScore, 0) / report.recommendations.length)
    : 0;

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-slate-400">Stock Recommendation Radar</p>
        <h1 className="text-3xl font-black text-white">個股推薦雷達</h1>
        <p className="mt-2 max-w-3xl text-slate-300">
          系統會先用 TWSE/TPEX 官方全市場日行情做初選，不鎖定你查過或提供過的股票；接著對入選標的跑真實 K 線、
          量價、布林、箱型、MACD、KD、RSI、ATR、資金熱度與消息面摘要，最後依完整分析分數排序。此頁僅供研究輔助，不構成投資建議。
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="全市場初選" value={`${report.qualifiedCount}/${report.universeCount} 檔`} sub="上市 / 上櫃官方日行情" tone="bull" />
        <MetricCard label="完整分析" value={`${report.success}/${report.analysisTargets} 檔`} sub={report.failed ? `失敗 ${report.failed} 檔` : "依分數排序完成"} tone={report.failed ? "warn" : "bull"} />
        <MetricCard label="可買/試單" value={`${report.buyCandidates} 檔`} sub="買入候選 + 可小量試單" tone={report.buyCandidates ? "bull" : "warn"} />
        <MetricCard label="更新時間" value={new Date(report.updatedAt).toLocaleTimeString("zh-TW", { hour: "2-digit", minute: "2-digit" })} sub="即時重新分析" />
      </div>

      <div className="rounded-3xl border border-blue-400/20 bg-blue-500/10 p-4 text-sm leading-6 text-blue-100">
        {report.source}。本頁平均 AI 分數 {averageScore}，排名會依完整分析後的 rankScore、AI 分數與 3-5 天上漲機率由高到低排列。
      </div>

      {buyRows.length ? (
        <section className="space-y-4">
          <div>
            <h2 className="text-2xl font-black text-white">現在可優先看的標的</h2>
            <p className="mt-1 text-sm text-slate-400">買入候選可分批，試單候選只適合小量，不追高、不重倉。</p>
          </div>
          {buyRows.map((item, index) => <RecommendationCard key={item.symbol} item={item} rank={index + 1} />)}
        </section>
      ) : (
        <div className="rounded-3xl border border-amber-400/30 bg-amber-400/10 p-5 text-amber-100">
          目前沒有達到「買入候選 / 可小量試單」的標的。這代表現在盤面不適合硬買，請看下方「接近買點」等待價格或量能條件。
        </div>
      )}

      {nearRows.length ? (
        <section className="space-y-4">
          <div>
            <h2 className="text-2xl font-black text-white">接近買點 / 等待回檔</h2>
            <p className="mt-1 text-sm text-slate-400">這些不是立即重倉買進，適合設警示、等回測或突破確認。</p>
          </div>
          {nearRows.map((item, index) => <RecommendationCard key={item.symbol} item={item} rank={buyRows.length + index + 1} />)}
        </section>
      ) : null}

      {avoidRows.length ? (
        <section className="space-y-4">
          <div>
            <h2 className="text-2xl font-black text-white">暫不買入</h2>
            <p className="mt-1 text-sm text-slate-400">破線、停損或條件不足的標的放在最後，避免你誤買弱勢股。</p>
          </div>
          {avoidRows.map((item, index) => <RecommendationCard key={item.symbol} item={item} rank={buyRows.length + nearRows.length + index + 1} />)}
        </section>
      ) : null}

      {report.errors.length ? (
        <div className="rounded-3xl border border-rose-400/30 bg-rose-400/10 p-5">
          <h2 className="font-black text-rose-100">未完成分析</h2>
          <p className="mt-2 text-sm text-rose-100/80">
            {report.errors.map((error) => `${error.symbol}: ${error.message}`).join("；")}
          </p>
        </div>
      ) : null}
    </div>
  );
}
