"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { AnalysisResult } from "@/lib/types";
import { KLineChart } from "@/components/KLineChart";
import { MetricCard } from "@/components/MetricCard";
import { ScoreRing } from "@/components/ScoreRing";
import { SearchBox } from "@/components/SearchBox";
import { pct, price } from "@/lib/utils";

function money(value: number) {
  if (!Number.isFinite(value) || value <= 0) return "-";
  if (value >= 100_000_000) return `${(value / 100_000_000).toFixed(2)} 億元`;
  if (value >= 10_000) return `${(value / 10_000).toFixed(0)} 萬元`;
  return `${Math.round(value).toLocaleString()} 元`;
}

function leverageTone(level: AnalysisResult["leverageRisk"]["level"]) {
  if (level === "極高" || level === "高") return "bear" as const;
  if (level === "中") return "warn" as const;
  if (level === "資料不足") return "neutral" as const;
  return "bull" as const;
}

function leverageWarningClass(severity: "info" | "warn" | "danger") {
  if (severity === "danger") return "border-rose-400/40 bg-rose-500/10 text-rose-100";
  if (severity === "warn") return "border-amber-400/40 bg-amber-500/10 text-amber-100";
  return "border-emerald-400/30 bg-emerald-500/10 text-emerald-100";
}

export function DashboardClient() {
  const params = useSearchParams();
  const symbol = params.get("symbol") || "2330.TW";
  const [data, setData] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    setError("");
    setData(null);
    fetch(`/api/analysis/${encodeURIComponent(symbol)}`)
      .then(async (res) => {
        const payload = await res.json();
        if (!res.ok) throw new Error(payload.error || "真實資料取得失敗");
        return payload;
      })
      .then(setData)
      .catch((err) => setError(err instanceof Error ? err.message : "真實資料取得失敗"))
      .finally(() => setLoading(false));
  }, [symbol]);

  if (error) {
    return (
      <div className="space-y-4">
        <SearchBox initialSymbol={symbol} />
        <div className="glass rounded-3xl border border-rose-500/40 p-8 text-rose-100">
          <h2 className="text-xl font-black text-white">真實資料取得失敗</h2>
          <p className="mt-2">{error}</p>
          <p className="mt-4 text-sm text-slate-300">請改用完整 Yahoo Finance 代碼，例如 2330.TW、4976.TWO，或稍後重新查詢。</p>
        </div>
      </div>
    );
  }

  if (loading || !data) {
    return (
      <div className="space-y-4">
        <SearchBox initialSymbol={symbol} />
        <div className="glass rounded-3xl p-8 text-slate-300">分析中...</div>
      </div>
    );
  }

  const scoreRows = [
    data.scores.technical,
    data.scores.chip,
    data.scores.capital,
    data.scores.fundamental,
    data.scores.news,
    data.scores.macro
  ];
  const reliabilityTone =
    data.modelCalibration.reliability === "高"
      ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-100"
      : data.modelCalibration.reliability === "中"
        ? "border-amber-400/40 bg-amber-400/10 text-amber-100"
        : "border-rose-400/40 bg-rose-400/10 text-rose-100";
  const entryTone =
    data.entrySignal.label === "應買" || data.entrySignal.label === "可買"
      ? "bull"
      : data.entrySignal.label === "小量試單" || data.entrySignal.label === "等待" || data.entrySignal.label === "觀望"
        ? "warn"
        : data.entrySignal.label === "不買"
          ? "bear"
          : "neutral";
  const marginTone =
    !data.margin.available
      ? "neutral"
      : data.margin.marginUtilizationPct >= 30 || data.margin.marginChangePct >= 5
        ? "bear"
        : data.margin.marginUtilizationPct >= 20 || data.margin.marginChange > 0
          ? "warn"
          : "bull";
  const marginSafetyTone =
    data.marginSafety.level === "安全"
      ? "bull"
      : data.marginSafety.level === "危險"
        ? "bear"
        : data.marginSafety.level === "資料不足"
          ? "neutral"
          : "warn";

  return (
    <div className="space-y-6">
      <SearchBox initialSymbol={symbol} />

      <section className="glass rounded-3xl p-6">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm text-slate-400">即時分析 Dashboard</p>
            <h1 className="text-3xl font-black text-white">{data.name} {data.symbol}</h1>
            <p className="mt-2 text-slate-300">現價 {price(data.price)}，漲跌幅 {pct(data.changePct)}</p>
          </div>
          <div className="flex flex-col gap-3 lg:items-end">
            <ScoreRing score={data.finalScore} label="Final Score" />
            <div className={`w-full rounded-2xl border px-4 py-3 lg:w-64 ${reliabilityTone}`}>
              <p className="text-xs font-bold opacity-75">模型可靠度</p>
              <p className="mt-1 text-3xl font-black">{data.modelCalibration.reliability}</p>
              <p className="mt-1 text-xs leading-5">
                5 日方向正確率 {data.modelCalibration.directionAccuracy5Day}%，
                平均誤差 {pct(data.modelCalibration.averageForecastErrorPct)}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="進場建議" value={data.entrySignal.label} sub={data.entrySignal.reason} tone={entryTone} />
        <MetricCard label="今日 AI 決策" value={data.action} sub={`信心 ${data.confidence}%`} tone={data.finalScore >= 70 ? "bull" : data.finalScore < 45 ? "bear" : "warn"} />
        <MetricCard label="持股建議" value={data.postEntryForecast.positionAdvice} sub={data.postEntryForecast.reason} />
        <MetricCard label="趨勢階段" value={data.trendStage} sub={`風險 ${data.riskLevel}`} />
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="支撐價位" value={data.supportPriceRange} sub={`核心支撐 ${price(data.supportPrice)}`} tone="warn" />
        <MetricCard label="建議買點" value={data.buyPrice} sub="支撐、均線、VWAP、ATR 回檔區" />
        <MetricCard label="停損價" value={price(data.stopLossPrice)} sub="跌破代表判斷錯誤" tone="bear" />
        <MetricCard label="目標價" value={`${price(data.takeProfit1)} / ${price(data.takeProfit2)}`} sub={data.holdingPeriod} tone="bull" />
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <MetricCard
          label="融資水位安全"
          value={data.marginSafety.level}
          sub={`${data.marginSafety.score} 分，${data.marginSafety.summary}`}
          tone={marginSafetyTone}
        />
        <MetricCard
          label="融資金額"
          value={money(data.margin.marginAmount)}
          sub={`融資餘額 ${data.margin.marginBalance.toLocaleString()} 張`}
          tone={marginTone}
        />
        <MetricCard
          label="融資佔比"
          value={`${data.margin.marginUtilizationPct.toFixed(2)}%`}
          sub="融資餘額 / 融資限額"
          tone={marginTone}
        />
        <MetricCard
          label="融資增減"
          value={`${data.margin.marginChange >= 0 ? "+" : ""}${data.margin.marginChange.toLocaleString()} 張`}
          sub={pct(data.margin.marginChangePct)}
          tone={data.margin.marginChange <= 0 ? "bull" : data.margin.marginChangePct >= 5 ? "bear" : "warn"}
        />
        <MetricCard
          label="融資金額 / 均成交值"
          value={`${data.margin.marginAmountToTurnoverPct.toFixed(2)}%`}
          sub={`券資比 ${data.margin.shortToMarginPct.toFixed(2)}%`}
          tone={data.margin.marginAmountToTurnoverPct >= 250 ? "bear" : data.margin.marginAmountToTurnoverPct >= 120 ? "warn" : "neutral"}
        />
      </section>

      <section className="rounded-3xl border border-slate-700/70 bg-slate-950/35 p-4 text-sm leading-6 text-slate-300">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Leverage Risk</p>
            <h2 className="text-xl font-black text-white">槓桿是否過大危險</h2>
          </div>
          <p className="max-w-3xl text-slate-300">
            融資就是槓桿；當融資堆高又遇到放量急漲急跌，就可能吸引當沖或隔日沖套利，造成個股急漲後回吐，或急跌時被迫去槓桿。
          </p>
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            label="槓桿水位"
            value={data.leverageRisk.level}
            sub={`${data.leverageRisk.score} 分，${data.leverageRisk.action}`}
            tone={leverageTone(data.leverageRisk.level)}
          />
          <MetricCard
            label="當沖可能性"
            value={`${data.leverageRisk.dayTradeProbability}%`}
            sub={`風險 ${data.leverageRisk.dayTradeRisk}，量能/漲跌/融資推估`}
            tone={leverageTone(data.leverageRisk.dayTradeRisk)}
          />
          <MetricCard
            label="隔日沖可能性"
            value={`${data.leverageRisk.overnightProbability}%`}
            sub={`風險 ${data.leverageRisk.overnightRisk}，追融資/去槓桿推估`}
            tone={leverageTone(data.leverageRisk.overnightRisk)}
          />
          <MetricCard
            label="急漲急跌風險"
            value={data.leverageRisk.sharpMoveRisk}
            sub={data.leverageRisk.directionBias}
            tone={leverageTone(data.leverageRisk.sharpMoveRisk)}
          />
        </div>
        <div className="mt-4 rounded-2xl border border-slate-700/70 bg-slate-900/45 p-4">
          <p className="font-bold text-white">結論：{data.leverageRisk.summary}</p>
          <div className="mt-3 grid gap-2 lg:grid-cols-2">
            {data.leverageRisk.warnings.map((item) => (
              <div key={item.id} className={`rounded-2xl border px-3 py-2 ${leverageWarningClass(item.severity)}`}>
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                  <p className="font-bold">{item.label}</p>
                  <p className="text-xs font-bold opacity-80">{item.triggeredValue}</p>
                </div>
                <p className="text-xs opacity-90">{item.message}</p>
              </div>
            ))}
          </div>
          <div className="mt-3 grid gap-2 text-xs text-slate-400 md:grid-cols-2">
            {data.leverageRisk.explanation.map((item) => (
              <p key={item}>{item}</p>
            ))}
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-700/70 bg-slate-950/35 p-4 text-sm leading-6 text-slate-300">
        <p className="font-bold text-white">融資水位警示</p>
        <div className="mt-3 grid gap-3 lg:grid-cols-2">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">目前觸發</p>
            <div className="mt-2 space-y-2">
              {data.marginSafety.warnings.map((item) => (
                <div
                  key={item.id}
                  className={`rounded-2xl border px-3 py-2 ${
                    item.severity === "danger"
                      ? "border-rose-400/40 bg-rose-500/10 text-rose-100"
                      : item.severity === "warn"
                        ? "border-amber-400/40 bg-amber-500/10 text-amber-100"
                        : "border-emerald-400/30 bg-emerald-500/10 text-emerald-100"
                  }`}
                >
                  <p className="font-bold">{item.label}：{item.triggeredValue}</p>
                  <p className="text-xs opacity-90">{item.message}</p>
                </div>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">警示選項</p>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {data.marginSafety.alertOptions.map((option) => (
                <div key={option.id} className="rounded-2xl border border-slate-700/70 bg-slate-900/45 p-3">
                  <p className="font-bold text-white">{option.label}</p>
                  <p className="mt-1 text-xs text-slate-300">{option.threshold}</p>
                  <p className="mt-1 text-xs text-slate-500">{option.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {data.margin.available ? (
        <section className="rounded-3xl border border-slate-700/70 bg-slate-950/35 p-4 text-sm leading-6 text-slate-300">
          <p className="font-bold text-white">融資資料來源</p>
          <p className="mt-1">
            {data.margin.source}{data.margin.date ? `，資料日 ${data.margin.date}` : ""}。資買 {data.margin.marginBuy.toLocaleString()} 張、
            資賣 {data.margin.marginSell.toLocaleString()} 張、現償 {data.margin.marginCashRepayment.toLocaleString()} 張。
            {data.margin.note ? ` 註記：${data.margin.note}` : ""}
          </p>
        </section>
      ) : (
        <section className="rounded-3xl border border-amber-400/20 bg-amber-400/10 p-4 text-sm leading-6 text-amber-100">
          <p className="font-bold text-white">融資資料暫缺</p>
          <p className="mt-1">{data.margin.warning}</p>
        </section>
      )}

      <section className="rounded-3xl border border-amber-400/20 bg-amber-400/10 p-4 text-sm leading-6 text-amber-50">
        <p className="font-bold text-white">進場建議規則</p>
        <p className="mt-1 text-amber-100">
          目前套用：{data.entrySignal.rule}；風險報酬比約 1 : {data.entrySignal.riskReward.toFixed(2)}；
          現價距核心支撐 {pct(data.entrySignal.supportDistancePct)}。
        </p>
        <div className="mt-3 grid gap-2 text-slate-200 md:grid-cols-2">
          <p>可靠度低：不買，最多觀察。</p>
          <p>可靠度中 + 條件普通：觀望。</p>
          <p>可靠度中 + 價格接近支撐 + 風險報酬比好：小量試單。</p>
          <p>可靠度高 + 技術面 / 量能 / 風險報酬比都好：才考慮買入。</p>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        <MetricCard label="預估 3 日漲跌" value={pct(data.postEntryForecast.day3Pct)} />
        <MetricCard label="預估 4 日漲跌" value={pct(data.postEntryForecast.day4Pct)} />
        <MetricCard label="預估 5 日漲跌" value={pct(data.postEntryForecast.day5Pct)} />
        <MetricCard label="3-5 天上漲機率" value={`${data.postEntryForecast.probabilityUp3To5}%`} sub={`下跌機率 ${data.postEntryForecast.probabilityDown3To5}%`} />
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="模型校準樣本"
          value={`${data.modelCalibration.sampleSize} 筆`}
          sub="歷史真實走勢回測"
          tone={data.modelCalibration.reliability === "高" ? "bull" : data.modelCalibration.reliability === "中" ? "warn" : "bear"}
        />
        <MetricCard
          label="3 / 5 日方向正確率"
          value={`${data.modelCalibration.directionAccuracy3Day}% / ${data.modelCalibration.directionAccuracy5Day}%`}
          sub="用歷史真實走勢滾動驗證"
          tone={data.modelCalibration.directionAccuracy5Day >= 57 ? "bull" : data.modelCalibration.directionAccuracy5Day >= 52 ? "warn" : "bear"}
        />
        <MetricCard
          label="第 5 日平均誤差"
          value={pct(data.modelCalibration.averageForecastErrorPct)}
          sub={`偏差 ${pct(data.modelCalibration.forecastBiasPct)}`}
          tone={data.modelCalibration.averageForecastErrorPct <= 3.2 ? "bull" : data.modelCalibration.averageForecastErrorPct <= 4.6 ? "warn" : "bear"}
        />
        <MetricCard
          label="資料品質"
          value={data.dataQuality.latestPriceDate || "-"}
          sub={`${data.dataQuality.priceBars} 根 K 線`}
          tone={data.dataQuality.warning.includes("降低") ? "warn" : "neutral"}
        />
      </section>

      <section className="rounded-3xl border border-blue-400/20 bg-blue-500/10 p-4 text-sm leading-6 text-blue-100">
        <p className="font-bold text-white">模型自我修正</p>
        <p className="mt-1">{data.modelCalibration.correction}</p>
        <p className="mt-1">資料來源：{data.dataQuality.priceSource}。{data.dataQuality.warning}</p>
      </section>

      <KLineChart data={data.prices} supportPrice={data.supportPrice} />

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="glass rounded-3xl p-5">
          <h2 className="text-xl font-black text-white">多因子分數</h2>
          <div className="mt-4 space-y-3">
            {scoreRows.map((row) => (
              <div key={row.label}>
                <div className="mb-1 flex justify-between text-sm">
                  <span className="text-slate-300">{row.label} / 權重 {(row.weight * 100).toFixed(0)}%</span>
                  <span className="font-bold text-white">{row.score}</span>
                </div>
                <div className="h-2 rounded-full bg-slate-800">
                  <div className="h-2 rounded-full bg-blue-500" style={{ width: `${row.score}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="glass rounded-3xl p-5">
          <h2 className="text-xl font-black text-white">歷史回測勝率</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <MetricCard label="近 1 年勝率" value={`${data.backtest.oneYearWinRate}%`} />
            <MetricCard label="近 3 年勝率" value={`${data.backtest.threeYearWinRate}%`} />
            <MetricCard label="相似型態次數" value={data.backtest.similarPatternCount} />
            <MetricCard label="平均報酬 / 最大回撤" value={`${pct(data.backtest.avgReturn)} / ${pct(data.backtest.maxDrawdown)}`} />
          </div>
        </div>
      </section>

      <section className="glass rounded-3xl p-5">
        <h2 className="text-xl font-black text-white">AI 解釋文字</h2>
        <p className="mt-2 text-slate-300">{data.explanation.summary}</p>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          {Object.entries(data.explanation).filter(([key]) => key !== "summary").map(([key, rows]) => (
            <div key={key} className="rounded-2xl border border-slate-700 p-4">
              <h3 className="font-bold text-white">{key}</h3>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-300">
                {(rows as string[]).map((row) => <li key={row}>{row}</li>)}
              </ul>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
