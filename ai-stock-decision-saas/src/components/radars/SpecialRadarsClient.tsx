"use client";

import Link from "next/link";
import { Activity, ArrowUpRight, Camera, DollarSign, RefreshCw, ShieldCheck, Sparkles, Target } from "lucide-react";
import { useMemo, useState } from "react";
import { BuyStockButton } from "@/components/BuyStockButton";
import { MetricCard } from "@/components/MetricCard";
import { RADAR_LABELS, type RadarMode } from "@/lib/special-radars";
import type { AnalysisResult } from "@/lib/types";

type Recommendation = {
  symbol: string;
  name: string;
  price: number;
  changePct: number;
  finalScore: number;
  action: string;
  recommendation: string;
  entryAdvice: string;
  entryRule: string;
  marginAmount: number;
  marginUtilizationPct: number;
  marginChange: number;
  marginChangePct: number;
  marginSafetyLevel: string;
  leverageRiskLevel: string;
  dayTradeProbability: number;
  overnightProbability: number;
  confidence: number;
  trendStage: string;
  buyPrice: string;
  idealBuyPrice: string;
  stopLossPrice: number;
  takeProfit1: number;
  takeProfit2: number;
  sellPrice: string;
  riskReward: number;
  holdingPeriod: string;
  probabilityUp3To5: number;
  forecastDay5Pct: number;
  positionAdvice: string;
  reasons: string[];
};

type RecommendationReport = {
  updatedAt: string;
  source: string;
  universeCount: number;
  qualifiedCount: number;
  analysisTargets: number;
  success: number;
  failed: number;
  buyCandidates: number;
  recommendations: Recommendation[];
  errors: { symbol: string; message: string }[];
};

const MODES: Array<{ id: RadarMode; icon: typeof Sparkles }> = [
  { id: "next-jump", icon: ArrowUpRight },
  { id: "tw50", icon: Target },
  { id: "non-futures", icon: ShieldCheck },
  { id: "photo", icon: Camera },
  { id: "low-price", icon: DollarSign }
];

function formatPrice(value: number) {
  if (!Number.isFinite(value) || value <= 0) return "-";
  return `${value.toFixed(value >= 100 ? 2 : 2)} 元`;
}

function formatPct(value: number) {
  if (!Number.isFinite(value)) return "-";
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
}

function formatMoney(value: number) {
  if (!Number.isFinite(value) || value <= 0) return "-";
  if (value >= 100_000_000) return `${(value / 100_000_000).toFixed(2)} 億元`;
  if (value >= 10_000) return `${(value / 10_000).toFixed(0)} 萬元`;
  return `${Math.round(value).toLocaleString()} 元`;
}

function scoreTone(score: number) {
  if (score >= 70) return "bull" as const;
  if (score < 45) return "bear" as const;
  return "warn" as const;
}

function recommendationTone(label: string) {
  if (label === "買入候選" || label === "可小量試單") return "bull" as const;
  if (label === "暫不買入") return "bear" as const;
  return "warn" as const;
}

function leverageTone(level: string) {
  if (level === "高" || level === "極高") return "bear" as const;
  if (level === "中") return "warn" as const;
  return "neutral" as const;
}

function canBuy(item: Recommendation) {
  return item.recommendation === "買入候選" || item.recommendation === "可小量試單";
}

function intradayVerdict(analysis: AnalysisResult, entryPrice: number) {
  const basis = entryPrice > 0 ? entryPrice : analysis.price;
  const pnlPct = basis > 0 ? ((analysis.price - basis) / basis) * 100 : 0;
  const weakAction = analysis.action === "SELL" || analysis.action === "STOP_LOSS" || analysis.action === "REDUCE";

  if (analysis.price <= analysis.stopLossPrice || weakAction) {
    return {
      label: "買錯風險高",
      action: "賣出/停損",
      tone: "bear" as const,
      detail: `現價 ${formatPrice(analysis.price)} 接近或跌破停損 ${formatPrice(analysis.stopLossPrice)}，隔日續跌風險偏高。`
    };
  }
  if (entryPrice > 0 && entryPrice > analysis.takeProfit1) {
    return {
      label: "追價偏高",
      action: "不可追，已買先減碼",
      tone: "warn" as const,
      detail: "你的買價高於第一目標價，代表風險報酬不划算，除非盤中持續放量轉強，否則先降低部位。"
    };
  }
  if (analysis.finalScore >= 65 && analysis.postEntryForecast.probabilityUp3To5 >= 55 && pnlPct >= -2) {
    return {
      label: "盤中尚可",
      action: "續抱觀察",
      tone: "bull" as const,
      detail: `AI 分數 ${analysis.finalScore}，3-5 天上漲機率 ${analysis.postEntryForecast.probabilityUp3To5}%，目前仍可用支撐與停損控管。`
    };
  }
  if (analysis.entrySignal.label === "等待" || analysis.entrySignal.label === "觀望" || analysis.entrySignal.label === "觀察") {
    return {
      label: "條件未完成",
      action: "等待",
      tone: "warn" as const,
      detail: analysis.entrySignal.reason
    };
  }
  return {
    label: "盤中中性",
    action: "小量觀察",
    tone: "neutral" as const,
    detail: "目前沒有明顯停損訊號，但也尚未形成完整強勢共振，請用支撐、VWAP/均價與停損紀律控管。"
  };
}

export function SpecialRadarsClient() {
  const [mode, setMode] = useState<RadarMode>("next-jump");
  const [report, setReport] = useState<RecommendationReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [intradaySymbol, setIntradaySymbol] = useState("2330.TW");
  const [entryPrice, setEntryPrice] = useState("");
  const [intraday, setIntraday] = useState<AnalysisResult | null>(null);
  const [intradayLoading, setIntradayLoading] = useState(false);
  const [intradayError, setIntradayError] = useState("");

  async function loadRadar(nextMode = mode) {
    setMode(nextMode);
    setLoading(true);
    setError("");
    setReport(null);
    try {
      const response = await fetch(`/api/recommendations?mode=${nextMode}&scanLimit=48&limit=24`, { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "雷達掃描失敗");
      setReport(payload as RecommendationReport);
    } catch (scanError) {
      setError(scanError instanceof Error ? scanError.message : "雷達掃描失敗");
    } finally {
      setLoading(false);
    }
  }

  async function loadIntraday() {
    const symbol = intradaySymbol.trim();
    if (!symbol) return;
    setIntradayLoading(true);
    setIntradayError("");
    setIntraday(null);
    try {
      const response = await fetch(`/api/analysis/${encodeURIComponent(symbol)}`, { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "盤中分析失敗");
      setIntraday(payload as AnalysisResult);
    } catch (scanError) {
      setIntradayError(scanError instanceof Error ? scanError.message : "盤中分析失敗");
    } finally {
      setIntradayLoading(false);
    }
  }

  const activeMeta = RADAR_LABELS[mode];
  const intradayDecision = useMemo(
    () => (intraday ? intradayVerdict(intraday, Number(entryPrice)) : null),
    [entryPrice, intraday]
  );

  return (
    <div className="space-y-6">
      <section className="glass rounded-3xl p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm text-slate-400">Merged Radar Center</p>
            <h1 className="text-3xl font-black text-white">專用雷達總中心</h1>
            <p className="mt-2 max-w-3xl text-slate-300">
              舊版 Streamlit 的 盤中分析、0050 掃描、非期貨股、隔日上漲候選與照片群組，已集中到同一個 Next.js 網站。
            </p>
          </div>
          <Link href="/recommendations" className="rounded-2xl bg-blue-600 px-5 py-3 text-center font-black text-white hover:bg-blue-500">
            回全市場推薦
          </Link>
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        {MODES.map((item) => {
          const Icon = item.icon;
          const meta = RADAR_LABELS[item.id];
          const active = mode === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => void loadRadar(item.id)}
              className={`rounded-3xl border p-4 text-left transition ${
                active ? "border-blue-400 bg-blue-500/20" : "border-slate-700 bg-slate-950/35 hover:bg-slate-900"
              }`}
            >
              <Icon className="h-6 w-6 text-blue-300" />
              <h2 className="mt-3 font-black text-white">{meta.title}</h2>
              <p className="mt-2 text-xs leading-5 text-slate-400">{meta.description}</p>
            </button>
          );
        })}
      </section>

      <section className="glass rounded-3xl p-5">
        <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <h2 className="text-2xl font-black text-white">盤中現貨交易分析</h2>
            <p className="mt-2 text-sm leading-6 text-slate-300">
              這個區塊用目前可取得的即時/延遲報價與日線結構，輔助判斷今天是否買錯、是否該續抱、減碼或停損。
            </p>
          </div>
          <div className="grid gap-2 sm:grid-cols-[190px_160px_auto]">
            <input
              value={intradaySymbol}
              onChange={(event) => setIntradaySymbol(event.target.value)}
              className="rounded-2xl border border-slate-700 bg-slate-950/70 px-4 py-3 text-white outline-none focus:border-blue-400"
              placeholder="股名或股號"
            />
            <input
              value={entryPrice}
              onChange={(event) => setEntryPrice(event.target.value)}
              className="rounded-2xl border border-slate-700 bg-slate-950/70 px-4 py-3 text-white outline-none focus:border-blue-400"
              inputMode="decimal"
              placeholder="今日買進價"
            />
            <button type="button" onClick={loadIntraday} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 font-black text-white hover:bg-blue-500">
              <Activity className="h-4 w-4" />載入盤中
            </button>
          </div>
        </div>

        {intradayLoading ? <p className="mt-4 rounded-2xl bg-slate-900 p-4 text-slate-300">盤中分析中...</p> : null}
        {intradayError ? <p className="mt-4 rounded-2xl border border-rose-400/30 bg-rose-500/10 p-4 text-rose-100">{intradayError}</p> : null}
        {intraday && intradayDecision ? (
          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            <MetricCard label="盤中判斷" value={intradayDecision.label} sub={intradayDecision.detail} tone={intradayDecision.tone} />
            <MetricCard label="動作" value={intradayDecision.action} sub={intraday.action} tone={intradayDecision.tone} />
            <MetricCard label="現價" value={formatPrice(intraday.price)} sub={formatPct(intraday.changePct)} tone={intraday.changePct >= 0 ? "bull" : "bear"} />
            <MetricCard label="支撐 / 停損" value={`${intraday.supportPriceRange} / ${formatPrice(intraday.stopLossPrice)}`} tone="warn" />
            <MetricCard label="3-5 天上漲機率" value={`${intraday.postEntryForecast.probabilityUp3To5}%`} sub={`第 5 天 ${formatPct(intraday.postEntryForecast.day5Pct)}`} tone={intraday.postEntryForecast.probabilityUp3To5 >= 55 ? "bull" : "warn"} />
            <MetricCard label="AI 分數" value={intraday.finalScore} sub={`信心 ${intraday.confidence}%`} tone={scoreTone(intraday.finalScore)} />
            <MetricCard label="買點區" value={intraday.idealBuyPrice} sub={intraday.entrySignal.reason} />
            <MetricCard label="賣出目標" value={`${formatPrice(intraday.takeProfit1)} / ${formatPrice(intraday.takeProfit2)}`} tone="bull" />
            <MetricCard label="當沖 / 隔日沖" value={`${intraday.leverageRisk.dayTradeProbability}% / ${intraday.leverageRisk.overnightProbability}%`} sub={intraday.leverageRisk.summary} tone={leverageTone(intraday.leverageRisk.level)} />
            <Link href={`/dashboard?symbol=${encodeURIComponent(intraday.symbol)}`} className="rounded-2xl bg-blue-600 px-4 py-3 text-center font-black text-white transition hover:bg-blue-500">
              完整分析
            </Link>
          </div>
        ) : null}
      </section>

      <section className="glass rounded-3xl p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm text-blue-300">{activeMeta.source}</p>
            <h2 className="text-2xl font-black text-white">{activeMeta.title}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-300">{activeMeta.description}</p>
          </div>
          <button type="button" onClick={() => void loadRadar()} disabled={loading} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 font-black text-white hover:bg-blue-500 disabled:opacity-60">
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />重新掃描
          </button>
        </div>

        {loading ? <p className="mt-4 rounded-2xl bg-slate-900 p-4 text-slate-300">雷達掃描中，正在跑完整分析...</p> : null}
        {error ? <p className="mt-4 rounded-2xl border border-rose-400/30 bg-rose-500/10 p-4 text-rose-100">{error}</p> : null}
        {!report && !loading && !error ? (
          <p className="mt-4 rounded-2xl bg-slate-900/70 p-4 text-slate-300">選擇上方雷達或按「重新掃描」後開始分析。</p>
        ) : null}

        {report ? (
          <div className="mt-5 space-y-4">
            <div className="grid gap-3 md:grid-cols-4">
              <MetricCard label="分析完成" value={`${report.success}/${report.analysisTargets} 檔`} sub={report.failed ? `失敗 ${report.failed} 檔` : "全部完成"} tone={report.failed ? "warn" : "bull"} />
              <MetricCard label="可買/試單" value={`${report.buyCandidates} 檔`} sub="買入候選 + 可小量試單" tone={report.buyCandidates ? "bull" : "warn"} />
              <MetricCard label="候選來源" value={`${report.qualifiedCount}/${report.universeCount || report.qualifiedCount} 檔`} sub={report.source} />
              <MetricCard label="更新時間" value={new Date(report.updatedAt).toLocaleTimeString("zh-TW", { hour: "2-digit", minute: "2-digit" })} />
            </div>

            {report.recommendations.map((item, index) => (
              <article key={`${mode}-${item.symbol}`} className="rounded-3xl border border-slate-700/70 bg-slate-950/35 p-5">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <p className="text-xs font-bold text-slate-500">Rank #{index + 1}</p>
                    <h3 className="mt-1 text-2xl font-black text-white">{item.name} {item.symbol}</h3>
                    <p className="mt-1 text-sm text-slate-400">{item.trendStage} · {item.holdingPeriod}</p>
                  </div>
                  <div className={`rounded-2xl px-4 py-2 text-sm font-black ${
                    canBuy(item) ? "bg-emerald-500/15 text-emerald-200" : item.recommendation === "暫不買入" ? "bg-rose-500/15 text-rose-200" : "bg-amber-500/15 text-amber-200"
                  }`}>
                    {item.recommendation}
                  </div>
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-6">
                  <MetricCard label="現價" value={formatPrice(item.price)} sub={formatPct(item.changePct)} tone={item.changePct >= 0 ? "bull" : "bear"} />
                  <MetricCard label="AI 分數" value={item.finalScore} sub={`信心 ${item.confidence}%`} tone={scoreTone(item.finalScore)} />
                  <MetricCard label="進場建議" value={item.entryAdvice} sub={item.entryRule} tone={recommendationTone(item.recommendation)} />
                  <MetricCard label="上漲機率" value={`${item.probabilityUp3To5}%`} sub={`第 5 天 ${formatPct(item.forecastDay5Pct)}`} tone={item.probabilityUp3To5 >= 55 ? "bull" : "warn"} />
                  <MetricCard label="買入區間" value={item.idealBuyPrice} />
                  <MetricCard label="停損 / 目標" value={`${formatPrice(item.stopLossPrice)} / ${item.sellPrice}`} tone="warn" />
                  <MetricCard label="報酬風險比" value={`1 : ${item.riskReward.toFixed(2)}`} />
                  <MetricCard label="融資水位" value={item.marginSafetyLevel} sub={`融資 ${formatMoney(item.marginAmount)}，佔比 ${item.marginUtilizationPct.toFixed(2)}%`} tone={item.marginSafetyLevel === "危險" ? "bear" : item.marginSafetyLevel === "警戒" || item.marginSafetyLevel === "注意" ? "warn" : "neutral"} />
                  <MetricCard label="融資增減" value={`${item.marginChange >= 0 ? "+" : ""}${item.marginChange.toLocaleString()} 張`} sub={formatPct(item.marginChangePct)} tone={item.marginChange <= 0 ? "bull" : "warn"} />
                  <MetricCard label="槓桿風險" value={item.leverageRiskLevel} sub={`當沖 ${item.dayTradeProbability}% / 隔日 ${item.overnightProbability}%`} tone={leverageTone(item.leverageRiskLevel)} />
                  <MetricCard label="持股後建議" value={item.positionAdvice} />
                  <Link href={`/dashboard?symbol=${encodeURIComponent(item.symbol)}`} className="rounded-2xl bg-blue-600 px-4 py-3 text-center font-black text-white transition hover:bg-blue-500">
                    完整分析
                  </Link>
                </div>

                <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_240px]">
                  <div className="rounded-2xl border border-slate-700/70 bg-slate-900/45 p-4">
                    <p className="font-black text-white">分析理由</p>
                    <ul className="mt-2 space-y-1 text-sm leading-6 text-slate-300">
                      {item.reasons.slice(0, 5).map((reason) => <li key={reason}>• {reason}</li>)}
                    </ul>
                  </div>
                  <div className="space-y-2">
                    {canBuy(item) ? <BuyStockButton symbol={item.symbol} name={item.name} price={item.price} stopLossPrice={item.stopLossPrice} /> : null}
                    <Link href={`/watchlist?symbol=${encodeURIComponent(item.symbol)}`} className="block rounded-2xl border border-slate-700 px-4 py-3 text-center font-black text-slate-100 hover:bg-slate-800">
                      加到自選觀察
                    </Link>
                  </div>
                </div>
              </article>
            ))}

            {report.errors.length ? (
              <div className="rounded-2xl border border-rose-400/30 bg-rose-500/10 p-4 text-sm text-rose-100">
                {report.errors.map((item) => `${item.symbol}: ${item.message}`).join("；")}
              </div>
            ) : null}
          </div>
        ) : null}
      </section>
    </div>
  );
}
