"use client";

import Link from "next/link";
import { Plus, RefreshCw, ShieldAlert, Trash2, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { MetricCard } from "@/components/MetricCard";
import {
  PORTFOLIO_STORAGE_KEY,
  PORTFOLIO_UPDATED_EVENT,
  portfolioCostValue,
  readClientPortfolio,
  type ClientPortfolioItem,
  writeClientPortfolio
} from "@/lib/client-portfolio";
import type { AnalysisResult } from "@/lib/types";
import { pct, price } from "@/lib/utils";

type PortfolioItem = ClientPortfolioItem;

type PortfolioRow = {
  item: PortfolioItem;
  analysis?: AnalysisResult;
  error?: string;
};

const DEFAULT_ITEMS: PortfolioItem[] = [
  { id: "2330.TW", symbol: "2330.TW", shares: 1000, cost: 900 },
  { id: "2317.TW", symbol: "2317.TW", shares: 1000, cost: 180 }
];

type SellAlert = {
  key: string;
  row: PortfolioRow;
  type: "停損" | "第一目標" | "第二目標" | "系統賣出" | "減碼";
  suggestedPrice: number;
  reason: string;
};

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

function marginSafetyTone(level: AnalysisResult["marginSafety"]["level"]) {
  if (level === "安全") return "bull" as const;
  if (level === "危險") return "bear" as const;
  if (level === "資料不足") return "neutral" as const;
  return "warn" as const;
}

function personalizedAdvice(row: PortfolioRow) {
  const analysis = row.analysis;
  if (!analysis || row.item.cost <= 0) return { label: "待分析", detail: "請先輸入成本並完成分析。", tone: "neutral" as const };

  const pnl = ((analysis.price - row.item.cost) / row.item.cost) * 100;
  const activeStopLoss = row.item.stopLossPrice || analysis.stopLossPrice;
  if (analysis.price <= activeStopLoss || analysis.action === "STOP_LOSS") {
    return { label: "停損/減碼", detail: `現價接近或跌破買入時停損 ${price(activeStopLoss)}，先保護本金。`, tone: "bear" as const };
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
  if (analysis.marginSafety.level === "危險") {
    return { label: "減碼觀察", detail: `融資水位危險：${analysis.marginSafety.summary}`, tone: "bear" as const };
  }
  if (analysis.marginSafety.level === "警戒") {
    return { label: "續抱但控風險", detail: `融資水位警戒：${analysis.marginSafety.summary}`, tone: "warn" as const };
  }
  return { label: analysis.postEntryForecast.positionAdvice, detail: analysis.postEntryForecast.reason, tone: analysis.finalScore >= 60 ? "warn" as const : "neutral" as const };
}

function suggestedSellPrice(row: PortfolioRow) {
  const analysis = row.analysis;
  if (!analysis) return "-";
  if (analysis.price <= analysis.stopLossPrice || analysis.action === "STOP_LOSS") return price(analysis.stopLossPrice);
  return `${price(analysis.takeProfit1)} / ${price(analysis.takeProfit2)}`;
}

function sellAlertFor(row: PortfolioRow): SellAlert | null {
  const analysis = row.analysis;
  if (!analysis) return null;
  const activeStopLoss = row.item.stopLossPrice || analysis.stopLossPrice;
  const baseKey = `${row.item.id}-${analysis.symbol}`;

  if (analysis.price <= activeStopLoss || analysis.action === "STOP_LOSS") {
    return {
      key: `${baseKey}-stop`,
      row,
      type: "停損",
      suggestedPrice: activeStopLoss,
      reason: `現價 ${price(analysis.price)} 已跌破買入時停損 ${price(activeStopLoss)}，應優先保護本金。`
    };
  }
  if (analysis.price >= analysis.takeProfit2) {
    return {
      key: `${baseKey}-target2`,
      row,
      type: "第二目標",
      suggestedPrice: analysis.takeProfit2,
      reason: `現價已達第二目標 ${price(analysis.takeProfit2)}，適合分批賣出或至少鎖定主要利潤。`
    };
  }
  if (analysis.price >= analysis.takeProfit1) {
    return {
      key: `${baseKey}-target1`,
      row,
      type: "第一目標",
      suggestedPrice: analysis.takeProfit1,
      reason: `現價已達第一目標 ${price(analysis.takeProfit1)}，可先賣一部分，把獲利放入口袋。`
    };
  }
  if (analysis.action === "SELL" || analysis.postEntryForecast.positionAdvice === "賣出") {
    return {
      key: `${baseKey}-sell`,
      row,
      type: "系統賣出",
      suggestedPrice: analysis.price,
      reason: analysis.postEntryForecast.reason || "AI 決策轉弱，系統建議賣出。"
    };
  }
  if (analysis.action === "REDUCE" || analysis.postEntryForecast.positionAdvice === "減碼") {
    return {
      key: `${baseKey}-reduce`,
      row,
      type: "減碼",
      suggestedPrice: analysis.price,
      reason: analysis.postEntryForecast.reason || "短線風險升高，系統建議降低部位。"
    };
  }
  return null;
}

export function PortfolioClient() {
  const [items, setItems] = useState<PortfolioItem[]>(DEFAULT_ITEMS);
  const [rows, setRows] = useState<PortfolioRow[]>([]);
  const [symbol, setSymbol] = useState("");
  const [shares, setShares] = useState("1000");
  const [cost, setCost] = useState("");
  const [loading, setLoading] = useState(false);
  const [sellDialog, setSellDialog] = useState<SellAlert | null>(null);
  const [dismissedSellKeys, setDismissedSellKeys] = useState<string[]>([]);

  useEffect(() => {
    function syncPortfolio() {
      const stored = readClientPortfolio();
      const hasStoredPortfolio = window.localStorage.getItem(PORTFOLIO_STORAGE_KEY) !== null;
      setItems(hasStoredPortfolio ? stored : DEFAULT_ITEMS);
    }

    syncPortfolio();
    window.addEventListener(PORTFOLIO_UPDATED_EVENT, syncPortfolio);
    return () => window.removeEventListener(PORTFOLIO_UPDATED_EVENT, syncPortfolio);
  }, []);

  const summary = useMemo(() => {
    return rows.reduce(
      (acc, row) => {
        if (!row.analysis) return acc;
        const marketValue = row.analysis.price * row.item.shares;
        const costValue = portfolioCostValue(row.item);
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

  useEffect(() => {
    if (loading || sellDialog) return;
    const nextAlert = rows
      .map(sellAlertFor)
      .find((alert): alert is SellAlert => alert !== null && !dismissedSellKeys.includes(alert.key));
    if (nextAlert) setSellDialog(nextAlert);
  }, [dismissedSellKeys, loading, rows, sellDialog]);

  function setAndStore(updater: (current: PortfolioItem[]) => PortfolioItem[]) {
    setItems((current) => {
      const next = updater(current);
      writeClientPortfolio(next, { notify: false });
      window.queueMicrotask(() => window.dispatchEvent(new Event(PORTFOLIO_UPDATED_EVENT)));
      return next;
    });
  }

  function addItem() {
    const nextSymbol = symbol.trim();
    const nextShares = numberValue(shares, 0);
    const nextCost = numberValue(cost, 0);
    if (!nextSymbol || nextShares <= 0 || nextCost <= 0) return;
    setAndStore((current) => [
      { id: `${nextSymbol}-${Date.now()}`, symbol: nextSymbol, shares: nextShares, cost: nextCost },
      ...current
    ]);
    setSymbol("");
    setShares("1000");
    setCost("");
  }

  function removeItem(id: string) {
    setAndStore((current) => current.filter((item) => item.id !== id));
  }

  function updateItem(id: string, patch: Partial<PortfolioItem>) {
    setAndStore((current) => current.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  }

  function dismissSellDialog() {
    if (sellDialog) setDismissedSellKeys((current) => [...current, sellDialog.key]);
    setSellDialog(null);
  }

  function confirmSellDialog() {
    if (!sellDialog) return;
    removeItem(sellDialog.row.item.id);
    setDismissedSellKeys((current) => [...current, sellDialog.key]);
    setSellDialog(null);
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
          const sellAlert = sellAlertFor(row);
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
                  <MetricCard label="成本 / 損益" value={`${price(row.item.cost)} / ${pct(pnl)}`} sub={row.item.buyAmount ? `投入 ${Math.round(row.item.buyAmount).toLocaleString()} 元` : undefined} tone={pnl >= 0 ? "bull" : "bear"} />
                  <MetricCard label="個人化建議" value={advice.label} sub={advice.detail} tone={advice.tone} />
                  <MetricCard label="建議賣出價" value={suggestedSellPrice(row)} sub="依第一/第二目標或停損線" tone="warn" />
                  <MetricCard label="融資水位" value={analysis.marginSafety.level} sub={`${analysis.marginSafety.score} 分，警示 ${analysis.marginSafety.warnings.filter((item) => item.severity !== "info").length} 項`} tone={marginSafetyTone(analysis.marginSafety.level)} />
                  <MetricCard label="融資金額" value={money(analysis.margin.marginAmount)} sub={`佔比 ${analysis.margin.marginUtilizationPct.toFixed(2)}%`} tone={analysis.margin.marginUtilizationPct >= 30 || analysis.margin.marginChangePct >= 5 ? "bear" : analysis.margin.marginUtilizationPct >= 20 || analysis.margin.marginChange > 0 ? "warn" : "neutral"} />
                  <MetricCard label="融資增減" value={`${analysis.margin.marginChange >= 0 ? "+" : ""}${analysis.margin.marginChange.toLocaleString()} 張`} sub={pct(analysis.margin.marginChangePct)} tone={analysis.margin.marginChange <= 0 ? "bull" : analysis.margin.marginChangePct >= 5 ? "bear" : "warn"} />
                  <MetricCard label="停損價" value={price(row.item.stopLossPrice || analysis.stopLossPrice)} sub={row.item.stopLossPrice ? "買入時固定停損，系統持續監看" : "跌破代表判斷錯誤"} tone="bear" />
                  <MetricCard label="AI 分數" value={analysis.finalScore} sub={analysis.action} tone={analysis.finalScore >= 70 ? "bull" : analysis.finalScore < 45 ? "bear" : "warn"} />
                  {sellAlert ? (
                    <button
                      type="button"
                      onClick={() => setSellDialog(sellAlert)}
                      className="inline-flex items-center justify-center gap-2 rounded-2xl bg-rose-500 px-4 py-3 text-center font-black text-white transition hover:bg-rose-400 md:col-span-2 xl:col-span-4"
                    >
                      <ShieldAlert className="h-4 w-4" />
                      賣出警訊：{sellAlert.type}，參考 {price(sellAlert.suggestedPrice)}
                    </button>
                  ) : null}
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

      {sellDialog ? (
        <div className="fixed inset-0 z-[95] grid place-items-center bg-slate-950/85 p-4" role="dialog" aria-modal="true" aria-labelledby="portfolio-sell-title">
          <section className="w-full max-w-lg rounded-3xl border border-rose-400/35 bg-slate-900 p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-bold text-rose-300">賣出警訊</p>
                <h2 id="portfolio-sell-title" className="mt-1 text-2xl font-black text-white">
                  {sellDialog.row.analysis?.name || sellDialog.row.item.symbol}
                </h2>
                <p className="mt-1 text-sm text-slate-400">{sellDialog.row.analysis?.symbol || sellDialog.row.item.symbol}</p>
              </div>
              <button type="button" onClick={dismissSellDialog} className="rounded-xl border border-slate-600 p-2 text-slate-200" aria-label="關閉賣出警訊">
                <X className="h-5 w-5" />
              </button>
            </div>

            {sellDialog.row.analysis ? (
              <>
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl bg-slate-800 p-4">
                    <p className="text-xs font-bold text-slate-400">買入金額</p>
                    <p className="mt-1 text-2xl font-black text-white">{Math.round(portfolioCostValue(sellDialog.row.item)).toLocaleString()} 元</p>
                    <p className="mt-1 text-xs text-slate-400">
                      成本 {price(sellDialog.row.item.cost)}，{sellDialog.row.item.shares.toLocaleString()} 股
                    </p>
                  </div>
                  <div className="rounded-2xl bg-slate-800 p-4">
                    <p className="text-xs font-bold text-slate-400">目前市值 / 損益</p>
                    <p className={`mt-1 text-2xl font-black ${sellDialog.row.analysis.price >= sellDialog.row.item.cost ? "text-emerald-300" : "text-rose-300"}`}>
                      {Math.round(sellDialog.row.analysis.price * sellDialog.row.item.shares).toLocaleString()} 元
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      {pct(((sellDialog.row.analysis.price - sellDialog.row.item.cost) / sellDialog.row.item.cost) * 100)}
                    </p>
                  </div>
                </div>

                <div className="mt-4 rounded-2xl border border-rose-400/25 bg-rose-500/10 p-4 text-sm leading-6 text-rose-100">
                  <p className="font-black text-white">{sellDialog.type}：建議賣出參考 {price(sellDialog.suggestedPrice)}</p>
                  <p className="mt-1">{sellDialog.reason}</p>
                </div>

                <div className="mt-5 grid gap-2 sm:grid-cols-3">
                  <button type="button" onClick={confirmSellDialog} className="rounded-2xl bg-rose-500 px-4 py-3 font-black text-white hover:bg-rose-400">
                    同意賣出
                  </button>
                  <button type="button" onClick={dismissSellDialog} className="rounded-2xl border border-slate-600 px-4 py-3 font-black text-slate-100 hover:bg-slate-800">
                    先續抱
                  </button>
                  <Link href={`/dashboard?symbol=${encodeURIComponent(sellDialog.row.analysis.symbol)}`} className="rounded-2xl bg-blue-600 px-4 py-3 text-center font-black text-white hover:bg-blue-500">
                    完整分析
                  </Link>
                </div>
                <p className="mt-3 text-xs leading-5 text-slate-400">
                  同意賣出只會更新本系統持股紀錄，不會自動送出券商委託單。實際買賣請到券商 App 操作。
                </p>
              </>
            ) : null}
          </section>
        </div>
      ) : null}
    </div>
  );
}
