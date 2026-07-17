"use client";

import Link from "next/link";
import { Plus, RefreshCw, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { MetricCard } from "@/components/MetricCard";
import type { AnalysisResult } from "@/lib/types";
import { pct, price } from "@/lib/utils";

type PortfolioItem = {
  id: string;
  symbol: string;
  shares: number;
  cost: number;
};

type PortfolioRow = {
  item: PortfolioItem;
  analysis?: AnalysisResult;
  error?: string;
};

const STORAGE_KEY = "ai-stock-portfolio-v2";

const DEFAULT_ITEMS: PortfolioItem[] = [
  { id: "2330.TW", symbol: "2330.TW", shares: 1000, cost: 900 },
  { id: "2317.TW", symbol: "2317.TW", shares: 1000, cost: 180 }
];

async function fetchAnalysis(symbol: string) {
  const response = await fetch(`/api/analysis/${encodeURIComponent(symbol)}`, { cache: "no-store" });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error || "分析失敗");
  return payload as AnalysisResult;
}

function numberValue(value: string, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

function money(value: number) {
  if (!Number.isFinite(value) || value <= 0) return "-";
  if (value >= 100_000_000) return `${(value / 100_000_000).toFixed(2)} 億元`;
  if (value >= 10_000) return `${(value / 10_000).toFixed(0)} 萬元`;
  return `${Math.round(value).toLocaleString()} 元`;
}

function personalizedAdvice(row: PortfolioRow) {
  const analysis = row.analysis;
  if (!analysis || row.item.cost <= 0) return { label: "待分析", detail: "請先輸入成本並完成分析。", tone: "neutral" as const };

  const pnl = ((analysis.price - row.item.cost) / row.item.cost) * 100;
  if (analysis.price <= analysis.stopLossPrice || analysis.action === "STOP_LOSS") {
    return { label: "停損/減碼", detail: `現價接近或跌破停損 ${price(analysis.stopLossPrice)}，先保護本金。`, tone: "bear" as const };
  }
  if (analysis.price >= analysis.takeProfit2) {
    return { label: "分批賣出", detail: `已達第二目標 ${price(analysis.takeProfit2)}，適合分批獲利。`, tone: "bull" as const };
  }
  if (analysis.price >= analysis.takeProfit1 || pnl >= 12) {
    return { label: "先賣一半", detail: `已接近第一目標 ${price(analysis.takeProfit1)}，可先鎖定部分獲利。`, tone: "bull" as const };
  }
  if (pnl <= -8) {
    return { label: "降低部位", detail: "帳面虧損已擴大，若反彈無量應降低風險。", tone: "bear" as const };
  }
  if (analysis.margin.marginUtilizationPct >= 30 && analysis.margin.marginChangePct >= 5) {
    return { label: "減碼觀察", detail: `融資使用率 ${analysis.margin.marginUtilizationPct.toFixed(2)}% 且今日增加 ${pct(analysis.margin.marginChangePct)}，籌碼偏熱。`, tone: "bear" as const };
  }
  if (analysis.margin.marginUtilizationPct >= 20 && analysis.margin.marginChange > 0) {
    return { label: "續抱但控風險", detail: `融資佔比 ${analysis.margin.marginUtilizationPct.toFixed(2)}%，且融資仍增加，避免加碼追高。`, tone: "warn" as const };
  }
  return { label: analysis.postEntryForecast.positionAdvice, detail: analysis.postEntryForecast.reason, tone: analysis.finalScore >= 60 ? "warn" as const : "neutral" as const };
}

function suggestedSellPrice(row: PortfolioRow) {
  const analysis = row.analysis;
  if (!analysis) return "-";
  if (analysis.price <= analysis.stopLossPrice || analysis.action === "STOP_LOSS") return price(analysis.stopLossPrice);
  return `${price(analysis.takeProfit1)} / ${price(analysis.takeProfit2)}`;
}

export function PortfolioClient() {
  const [items, setItems] = useState<PortfolioItem[]>(DEFAULT_ITEMS);
  const [rows, setRows] = useState<PortfolioRow[]>([]);
  const [symbol, setSymbol] = useState("");
  const [shares, setShares] = useState("1000");
  const [cost, setCost] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return;
    try {
      const parsed = JSON.parse(stored) as PortfolioItem[];
      if (Array.isArray(parsed) && parsed.length > 0) setItems(parsed);
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  const summary = useMemo(() => {
    return rows.reduce(
      (acc, row) => {
        if (!row.analysis) return acc;
        const marketValue = row.analysis.price * row.item.shares;
        const costValue = row.item.cost * row.item.shares;
        acc.marketValue += marketValue;
        acc.costValue += costValue;
        return acc;
      },
      { marketValue: 0, costValue: 0 }
    );
  }, [rows]);

  const totalPnl = summary.costValue ? ((summary.marketValue - summary.costValue) / summary.costValue) * 100 : 0;

  function loadRows(targets = items) {
    setLoading(true);
    Promise.all(
      targets.map(async (item) => {
        try {
          return { item, analysis: await fetchAnalysis(item.symbol) };
        } catch (error) {
          return { item, error: error instanceof Error ? error.message : "分析失敗" };
        }
      })
    )
      .then(setRows)
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadRows(items);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items]);

  function addItem() {
    const nextSymbol = symbol.trim();
    const nextShares = numberValue(shares, 0);
    const nextCost = numberValue(cost, 0);
    if (!nextSymbol || nextShares <= 0 || nextCost <= 0) return;
    setItems((current) => [
      { id: `${nextSymbol}-${Date.now()}`, symbol: nextSymbol, shares: nextShares, cost: nextCost },
      ...current
    ]);
    setSymbol("");
    setShares("1000");
    setCost("");
  }

  function removeItem(id: string) {
    setItems((current) => current.filter((item) => item.id !== id));
  }

  function updateItem(id: string, patch: Partial<PortfolioItem>) {
    setItems((current) => current.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-slate-400">Portfolio</p>
        <h1 className="text-3xl font-black text-white">持股管理</h1>
        <p className="mt-2 text-slate-300">可新增或刪除持股，輸入持有成本與股數後，系統會依照現價、停損與目標價給出個人化賣出參考。</p>
      </div>

      <section className="glass rounded-3xl p-5">
        <div className="grid gap-3 lg:grid-cols-[1fr_0.55fr_0.55fr_auto_auto]">
          <input
            value={symbol}
            onChange={(event) => setSymbol(event.target.value)}
            className="rounded-2xl border border-slate-700 bg-slate-950/70 px-4 py-3 text-white outline-none focus:border-blue-400"
            placeholder="股名或股號，例如 台積電、能率網通"
          />
          <input
            value={shares}
            onChange={(event) => setShares(event.target.value)}
            className="rounded-2xl border border-slate-700 bg-slate-950/70 px-4 py-3 text-white outline-none focus:border-blue-400"
            inputMode="numeric"
            placeholder="股數"
          />
          <input
            value={cost}
            onChange={(event) => setCost(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") addItem();
            }}
            className="rounded-2xl border border-slate-700 bg-slate-950/70 px-4 py-3 text-white outline-none focus:border-blue-400"
            inputMode="decimal"
            placeholder="持有成本"
          />
          <button
            type="button"
            onClick={addItem}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 font-black text-white transition hover:bg-blue-500"
          >
            <Plus className="h-4 w-4" />
            新增
          </button>
          <button
            type="button"
            onClick={() => loadRows()}
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-700 px-5 py-3 font-black text-slate-100 transition hover:bg-slate-800"
          >
            <RefreshCw className="h-4 w-4" />
            更新
          </button>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="持股檔數" value={`${items.length} 檔`} />
        <MetricCard label="總成本" value={summary.costValue ? `${Math.round(summary.costValue).toLocaleString()} 元` : "-"} />
        <MetricCard label="市值估算" value={summary.marketValue ? `${Math.round(summary.marketValue).toLocaleString()} 元` : "-"} />
        <MetricCard label="總損益率" value={summary.costValue ? pct(totalPnl) : "-"} tone={totalPnl >= 0 ? "bull" : "bear"} />
      </section>

      {loading ? <div className="glass rounded-3xl p-6 text-slate-300">持股分析中...</div> : null}

      <div className="grid gap-4">
        {rows.map((row) => {
          const analysis = row.analysis;
          const pnl = analysis && row.item.cost > 0 ? ((analysis.price - row.item.cost) / row.item.cost) * 100 : 0;
          const advice = personalizedAdvice(row);
          return (
            <article key={row.item.id} className="glass rounded-3xl p-5">
              <div className="grid gap-4 xl:grid-cols-[1fr_0.5fr_0.5fr_auto]">
                <div>
                  <h2 className="text-xl font-black text-white">{analysis?.name || row.item.symbol}</h2>
                  <p className="text-sm text-slate-400">{analysis?.symbol || row.item.symbol}</p>
                </div>
                <label className="text-sm text-slate-300">
                  股數
                  <input
                    value={row.item.shares}
                    onChange={(event) => updateItem(row.item.id, { shares: numberValue(event.target.value, row.item.shares) })}
                    className="mt-1 w-full rounded-2xl border border-slate-700 bg-slate-950/70 px-4 py-3 text-white outline-none focus:border-blue-400"
                    inputMode="numeric"
                  />
                </label>
                <label className="text-sm text-slate-300">
                  持有成本
                  <input
                    value={row.item.cost}
                    onChange={(event) => updateItem(row.item.id, { cost: numberValue(event.target.value, row.item.cost) })}
                    className="mt-1 w-full rounded-2xl border border-slate-700 bg-slate-950/70 px-4 py-3 text-white outline-none focus:border-blue-400"
                    inputMode="decimal"
                  />
                </label>
                <button
                  type="button"
                  onClick={() => removeItem(row.item.id)}
                  className="self-end rounded-2xl border border-rose-400/40 p-3 text-rose-200 transition hover:bg-rose-500/15"
                  aria-label="刪除持股"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>

              {row.error ? (
                <div className="mt-4 rounded-2xl border border-rose-400/30 bg-rose-500/10 p-4 text-rose-100">
                  {row.error}
                </div>
              ) : analysis ? (
                <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  <MetricCard label="現價" value={price(analysis.price)} sub={pct(analysis.changePct)} tone={analysis.changePct >= 0 ? "bull" : "bear"} />
                  <MetricCard label="成本 / 損益" value={`${price(row.item.cost)} / ${pct(pnl)}`} tone={pnl >= 0 ? "bull" : "bear"} />
                  <MetricCard label="個人化建議" value={advice.label} sub={advice.detail} tone={advice.tone} />
                  <MetricCard label="建議賣出價" value={suggestedSellPrice(row)} sub="依第一/第二目標或停損線" tone="warn" />
                  <MetricCard label="融資金額" value={money(analysis.margin.marginAmount)} sub={`佔比 ${analysis.margin.marginUtilizationPct.toFixed(2)}%`} tone={analysis.margin.marginUtilizationPct >= 30 || analysis.margin.marginChangePct >= 5 ? "bear" : analysis.margin.marginUtilizationPct >= 20 || analysis.margin.marginChange > 0 ? "warn" : "neutral"} />
                  <MetricCard label="融資增減" value={`${analysis.margin.marginChange >= 0 ? "+" : ""}${analysis.margin.marginChange.toLocaleString()} 張`} sub={pct(analysis.margin.marginChangePct)} tone={analysis.margin.marginChange <= 0 ? "bull" : analysis.margin.marginChangePct >= 5 ? "bear" : "warn"} />
                  <MetricCard label="停損價" value={price(analysis.stopLossPrice)} sub="跌破代表判斷錯誤" tone="bear" />
                  <MetricCard label="AI 分數" value={analysis.finalScore} sub={analysis.action} tone={analysis.finalScore >= 70 ? "bull" : analysis.finalScore < 45 ? "bear" : "warn"} />
                  <Link
                    href={`/dashboard?symbol=${encodeURIComponent(analysis.symbol)}`}
                    className="rounded-2xl bg-blue-600 px-4 py-3 text-center font-black text-white transition hover:bg-blue-500 md:col-span-2 xl:col-span-4"
                  >
                    查看完整分析
                  </Link>
                </div>
              ) : null}
            </article>
          );
        })}
      </div>
    </div>
  );
}
