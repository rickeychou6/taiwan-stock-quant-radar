"use client";

import Link from "next/link";
import { BellRing, RefreshCw, ShieldAlert, ShoppingCart, Sparkles, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import {
  addClientPortfolioItem,
  portfolioCostValue,
  readClientPortfolio,
  removeClientPortfolioItem,
  type ClientPortfolioItem
} from "@/lib/client-portfolio";

type Recommendation = {
  symbol: string;
  name: string;
  price: number;
  recommendation: string;
  action: string;
  idealBuyPrice: string;
  stopLossPrice: number;
  takeProfit1: number;
  probabilityUp3To5: number;
  reasons: string[];
};

type WatchItem = { symbol: string };
type WatchAnalysis = {
  symbol: string;
  name: string;
  price: number;
  action: string;
  stopLossPrice: number;
  takeProfit1?: number;
  takeProfit2?: number;
  entrySignal: { label: string; reason: string };
  postEntryForecast?: { positionAdvice: string; reason: string };
};

type HoldingAlert = WatchAnalysis & {
  holdingId: string;
  savedStopLossPrice: number;
  buyAmount: number;
  shares: number;
  cost: number;
  suggestedSellPrice: number;
  sellType: "停損" | "第一目標" | "第二目標" | "系統賣出" | "減碼";
  sellReason: string;
};

const WATCHLIST_KEY = "ai-stock-watchlist-v2";
const LAST_POPUP_KEY = "ai-stock-signal-popup-at";
const POPUP_COOLDOWN = 10 * 60_000;

function money(value: number) {
  return `${value.toFixed(value >= 100 ? 2 : 2)} 元`;
}

function holdingAlertFor(holding: ClientPortfolioItem, analysis: WatchAnalysis): HoldingAlert | null {
  const savedStopLossPrice = holding.stopLossPrice || analysis.stopLossPrice;
  const takeProfit1 = analysis.takeProfit1 || 0;
  const takeProfit2 = analysis.takeProfit2 || 0;
  const buyAmount = portfolioCostValue(holding);
  const base = {
    ...analysis,
    holdingId: holding.id,
    savedStopLossPrice,
    buyAmount,
    shares: holding.shares,
    cost: holding.cost
  };

  if (analysis.price <= savedStopLossPrice || analysis.action === "STOP_LOSS") {
    return {
      ...base,
      suggestedSellPrice: savedStopLossPrice,
      sellType: "停損",
      sellReason: `現價已跌破買入時停損線 ${money(savedStopLossPrice)}，系統建議優先保護本金。`
    };
  }
  if (takeProfit2 > 0 && analysis.price >= takeProfit2) {
    return {
      ...base,
      suggestedSellPrice: takeProfit2,
      sellType: "第二目標",
      sellReason: `現價已達第二目標 ${money(takeProfit2)}，可考慮分批獲利了結。`
    };
  }
  if (takeProfit1 > 0 && analysis.price >= takeProfit1) {
    return {
      ...base,
      suggestedSellPrice: takeProfit1,
      sellType: "第一目標",
      sellReason: `現價已達第一目標 ${money(takeProfit1)}，可考慮先賣一部分鎖定利潤。`
    };
  }
  if (analysis.action === "SELL" || analysis.postEntryForecast?.positionAdvice === "賣出") {
    return {
      ...base,
      suggestedSellPrice: analysis.price,
      sellType: "系統賣出",
      sellReason: analysis.postEntryForecast?.reason || analysis.entrySignal.reason || "系統偵測到賣出訊號。"
    };
  }
  if (analysis.action === "REDUCE" || analysis.postEntryForecast?.positionAdvice === "減碼") {
    return {
      ...base,
      suggestedSellPrice: analysis.price,
      sellType: "減碼",
      sellReason: analysis.postEntryForecast?.reason || "系統偵測到風險升高，建議降低持股部位。"
    };
  }
  return null;
}

export function GlobalSignalAlerts() {
  const [buySignals, setBuySignals] = useState<Recommendation[]>([]);
  const [sellSignals, setSellSignals] = useState<Array<WatchAnalysis | HoldingAlert>>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [updatedAt, setUpdatedAt] = useState("");
  const [selectedBuy, setSelectedBuy] = useState<Recommendation | null>(null);
  const [selectedSell, setSelectedSell] = useState<HoldingAlert | null>(null);
  const [buyAmount, setBuyAmount] = useState("10000");
  const [savedMessage, setSavedMessage] = useState("");

  const monitorPortfolio = useCallback(async () => {
    const portfolio = readClientPortfolio();
    if (!portfolio.length) return [] as HoldingAlert[];
    const results = await Promise.all(portfolio.slice(0, 30).map(async (holding) => {
      try {
        const response = await fetch(`/api/analysis/${encodeURIComponent(holding.symbol)}`, { cache: "no-store" });
        if (!response.ok) return null;
        const analysis = await response.json() as WatchAnalysis;
        return holdingAlertFor(holding, analysis);
      } catch {
        return null;
      }
    }));
    const triggered = results.filter((item): item is HoldingAlert => Boolean(item));
    if (triggered.length) {
      setSellSignals((current) => {
        const watchOnly = current.filter((item) => !("savedStopLossPrice" in item));
        return [...triggered, ...watchOnly];
      });
      setOpen(true);
    }
    return triggered;
  }, []);

  const scan = useCallback(async (forcePopup = false) => {
    setLoading(true);
    try {
      const recommendationRequest = fetch("/api/recommendations?scanLimit=48&limit=30", { cache: "no-store" })
        .then((response) => response.ok ? response.json() : Promise.reject(new Error("推薦掃描失敗")));

      let watchItems: WatchItem[] = [];
      try {
        watchItems = JSON.parse(localStorage.getItem(WATCHLIST_KEY) || "[]") as WatchItem[];
      } catch {
        watchItems = [];
      }
      const watchRequests = watchItems.slice(0, 20).map((item) =>
        fetch(`/api/analysis/${encodeURIComponent(item.symbol)}`, { cache: "no-store" })
          .then((response) => response.ok ? response.json() as Promise<WatchAnalysis> : null)
          .catch(() => null)
      );

      const [report, ...watchRows] = await Promise.all([recommendationRequest, ...watchRequests]);
      const buys = (report.recommendations as Recommendation[]).filter((item) =>
        item.recommendation === "買入候選" || item.recommendation === "可小量試單"
      );
      const sells = watchRows.filter((item): item is WatchAnalysis => Boolean(item)).filter((item) =>
        item.action === "SELL" || item.action === "STOP_LOSS" || item.action === "REDUCE" || item.entrySignal.label === "不買"
      );

      setBuySignals(buys);
      const holdingStops = await monitorPortfolio();
      setSellSignals([...holdingStops, ...sells.filter((item) => !holdingStops.some((holding) => holding.symbol === item.symbol))]);
      setUpdatedAt(new Date().toLocaleTimeString("zh-TW", { hour: "2-digit", minute: "2-digit" }));

      const lastPopup = Number(sessionStorage.getItem(LAST_POPUP_KEY) || 0);
      if ((buys.length || sells.length) && (forcePopup || Date.now() - lastPopup > POPUP_COOLDOWN)) {
        setOpen(true);
        sessionStorage.setItem(LAST_POPUP_KEY, String(Date.now()));
      }
    } catch (error) {
      console.warn(error);
    } finally {
      setLoading(false);
    }
  }, [monitorPortfolio]);

  useEffect(() => {
    void scan(false);
    const marketTimer = window.setInterval(() => void scan(false), 5 * 60_000);
    const stopTimer = window.setInterval(() => void monitorPortfolio(), 60_000);
    const portfolioListener = () => void monitorPortfolio();
    window.addEventListener("portfolio-updated", portfolioListener);
    return () => {
      window.clearInterval(marketTimer);
      window.clearInterval(stopTimer);
      window.removeEventListener("portfolio-updated", portfolioListener);
    };
  }, [monitorPortfolio, scan]);

  function savePurchase() {
    if (!selectedBuy) return;
    const requestedAmount = Number(buyAmount);
    const shares = Math.floor(requestedAmount / selectedBuy.price);
    if (!Number.isFinite(requestedAmount) || requestedAmount <= 0 || shares < 1) {
      setSavedMessage(`投入金額至少需要 ${money(selectedBuy.price)}`);
      return;
    }
    addClientPortfolioItem({
      symbol: selectedBuy.symbol,
      name: selectedBuy.name,
      shares,
      cost: selectedBuy.price,
      buyAmount: requestedAmount,
      stopLossPrice: selectedBuy.stopLossPrice,
      boughtAt: new Date().toISOString()
    });
    setSavedMessage(`已記錄 ${selectedBuy.name}：${shares.toLocaleString()} 股，買入金額 ${requestedAmount.toLocaleString()} 元`);
    setSelectedBuy(null);
  }

  function confirmSell() {
    if (!selectedSell) return;
    removeClientPortfolioItem(selectedSell.holdingId);
    setSellSignals((current) => current.filter((item) => !("holdingId" in item) || item.holdingId !== selectedSell.holdingId));
    setSavedMessage(`已記錄賣出 ${selectedSell.name}，並從持股管理移除。`);
    setSelectedSell(null);
  }

  const total = buySignals.length + sellSignals.length;

  return (
    <>
      <button
        type="button"
        onClick={() => total ? setOpen(true) : void scan(true)}
        className="fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-full border border-blue-300/30 bg-blue-600 px-4 py-3 font-black text-white shadow-2xl transition hover:bg-blue-500"
        aria-label="開啟買賣訊號中心"
      >
        <BellRing className={`h-5 w-5 ${loading ? "animate-pulse" : ""}`} />
        <span>買賣訊號</span>
        {total > 0 ? <span className="rounded-full bg-white px-2 py-0.5 text-xs text-blue-700">{total}</span> : null}
      </button>

      {open ? (
        <div className="fixed inset-0 z-[70] grid place-items-center bg-slate-950/80 p-3 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="signal-title">
          <section className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-3xl border border-slate-600 bg-slate-900 p-5 shadow-2xl sm:p-7">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-bold text-blue-300">自動掃描完成 {updatedAt ? `· ${updatedAt}` : ""}</p>
                <h2 id="signal-title" className="mt-1 text-2xl font-black text-white">買入與賣出訊號</h2>
                <p className="mt-2 text-sm text-slate-300">推薦買入來自全市場掃描；賣出與停損優先依你的自選股判斷。</p>
              </div>
              <button type="button" onClick={() => setOpen(false)} className="rounded-2xl border border-slate-600 p-2 text-slate-200 hover:bg-slate-800" aria-label="關閉訊號視窗"><X className="h-5 w-5" /></button>
            </div>

            <div className="mt-6 space-y-5">
              <div>
                <h3 className="flex items-center gap-2 font-black text-emerald-300"><Sparkles className="h-5 w-5" />推薦買入（{buySignals.length}）</h3>
                <div className="mt-3 space-y-3">
                  {buySignals.length ? buySignals.map((item) => (
                    <div key={item.symbol} className="rounded-2xl border border-emerald-400/30 bg-emerald-400/10 p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2"><strong className="text-lg text-white">{item.name} <span className="text-sm text-slate-400">{item.symbol}</span></strong><span className="rounded-full bg-emerald-400/20 px-3 py-1 text-sm font-black text-emerald-200">{item.recommendation}</span></div>
                      <p className="mt-2 text-sm text-slate-200">現價 {money(item.price)} · 理想區 {item.idealBuyPrice} · 上漲機率 {item.probabilityUp3To5}%</p>
                      <p className="mt-1 text-sm text-slate-400">停損 {money(item.stopLossPrice)} · 第一目標 {money(item.takeProfit1)}</p>
                      <div className="mt-3 flex gap-2">
                        <button type="button" onClick={() => { setSelectedBuy(item); setSavedMessage(""); }} className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-500 px-3 py-2 text-sm font-black text-slate-950 hover:bg-emerald-400"><ShoppingCart className="h-4 w-4" />買入並監看</button>
                        <Link href={`/dashboard?symbol=${encodeURIComponent(item.symbol)}`} onClick={() => setOpen(false)} className="rounded-xl border border-emerald-400/30 px-3 py-2 text-sm font-bold text-emerald-100">完整分析</Link>
                      </div>
                    </div>
                  )) : <p className="rounded-2xl bg-slate-800 p-4 text-sm text-slate-300">目前沒有通過全部風控條件的買入標的。</p>}
                </div>
              </div>

              <div>
                <h3 className="flex items-center gap-2 font-black text-rose-300"><ShieldAlert className="h-5 w-5" />賣出／停損（{sellSignals.length}）</h3>
                <div className="mt-3 space-y-3">
                  {sellSignals.length ? sellSignals.map((item) => {
                    if ("holdingId" in item) {
                      return (
                        <button key={item.holdingId} type="button" onClick={() => setSelectedSell(item)} className="block w-full rounded-2xl border border-rose-400/30 bg-rose-400/10 p-4 text-left transition hover:bg-rose-400/15">
                          <div className="flex flex-wrap items-center justify-between gap-2"><strong className="text-lg text-white">{item.name} <span className="text-sm text-slate-400">{item.symbol}</span></strong><span className="rounded-full bg-rose-400/20 px-3 py-1 text-sm font-black text-rose-200">{item.sellType}</span></div>
                          <p className="mt-2 text-sm text-slate-200">現價 {money(item.price)} · 建議賣出參考 {money(item.suggestedSellPrice)}</p>
                          <p className="mt-1 text-sm font-bold text-rose-200">持有 {item.shares.toLocaleString()} 股，買入金額 {item.buyAmount.toLocaleString()} 元</p>
                          <p className="mt-1 text-sm text-slate-400">{item.sellReason}</p>
                        </button>
                      );
                    }
                    return (
                      <Link key={item.symbol} href={`/dashboard?symbol=${encodeURIComponent(item.symbol)}`} onClick={() => setOpen(false)} className="block rounded-2xl border border-rose-400/30 bg-rose-400/10 p-4 transition hover:bg-rose-400/15">
                        <div className="flex items-center justify-between gap-2"><strong className="text-lg text-white">{item.name} <span className="text-sm text-slate-400">{item.symbol}</span></strong><span className="rounded-full bg-rose-400/20 px-3 py-1 text-sm font-black text-rose-200">{item.action === "WATCH" ? "轉弱警示" : item.action}</span></div>
                        <p className="mt-2 text-sm text-slate-200">現價 {money(item.price)} · 停損 {money(item.stopLossPrice)}</p>
                        <p className="mt-1 text-sm text-slate-400">{item.entrySignal.reason}</p>
                      </Link>
                    );
                  }) : <p className="rounded-2xl bg-slate-800 p-4 text-sm text-slate-300">目前自選股沒有觸發賣出或停損訊號。</p>}
                </div>
              </div>
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <button type="button" onClick={() => void scan(true)} disabled={loading} className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 py-3 font-black text-white hover:bg-blue-500 disabled:opacity-60"><RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />立即重新掃描</button>
              <button type="button" onClick={() => setOpen(false)} className="rounded-2xl border border-slate-600 px-5 py-3 font-black text-slate-200 hover:bg-slate-800">稍後處理</button>
            </div>
            {savedMessage ? <p className="mt-3 rounded-2xl bg-blue-500/10 p-3 text-center text-sm font-bold text-blue-200">{savedMessage}</p> : null}
          </section>
        </div>
      ) : null}

      {selectedBuy ? (
        <div className="fixed inset-0 z-[90] grid place-items-center bg-slate-950/85 p-4" role="dialog" aria-modal="true" aria-labelledby="buy-title">
          <section className="w-full max-w-md rounded-3xl border border-emerald-400/30 bg-slate-900 p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-3"><div><p className="text-sm font-bold text-emerald-300">記錄買入並啟動停損監看</p><h2 id="buy-title" className="mt-1 text-2xl font-black text-white">{selectedBuy.name} {selectedBuy.symbol}</h2></div><button type="button" onClick={() => setSelectedBuy(null)} className="rounded-xl border border-slate-600 p-2 text-slate-200" aria-label="取消買入"><X className="h-5 w-5" /></button></div>
            <div className="mt-5 rounded-2xl bg-slate-800 p-4 text-sm text-slate-200"><p>目前買入價：<strong className="text-white">{money(selectedBuy.price)}</strong></p><p className="mt-1">固定停損點：<strong className="text-rose-300">{money(selectedBuy.stopLossPrice)}</strong></p></div>
            <label className="mt-5 block text-sm font-bold text-slate-200">買入投入金額（元）<input autoFocus value={buyAmount} onChange={(event) => { setBuyAmount(event.target.value); setSavedMessage(""); }} onKeyDown={(event) => { if (event.key === "Enter") savePurchase(); }} inputMode="numeric" className="mt-2 w-full rounded-2xl border border-slate-600 bg-slate-950 px-4 py-3 text-lg text-white outline-none focus:border-emerald-400" /></label>
            <p className="mt-2 text-sm text-slate-400">依現價推算可買 {Math.max(0, Math.floor(Number(buyAmount || 0) / selectedBuy.price)).toLocaleString()} 股；未使用餘額仍保留。</p>
            {savedMessage ? <p className="mt-3 text-sm font-bold text-rose-300">{savedMessage}</p> : null}
            <button type="button" onClick={savePurchase} className="mt-5 w-full rounded-2xl bg-emerald-500 px-4 py-3 font-black text-slate-950 hover:bg-emerald-400">確認買入並開始監看</button>
          </section>
        </div>
      ) : null}

      {selectedSell ? (
        <div className="fixed inset-0 z-[95] grid place-items-center bg-slate-950/85 p-4" role="dialog" aria-modal="true" aria-labelledby="sell-title">
          <section className="w-full max-w-lg rounded-3xl border border-rose-400/35 bg-slate-900 p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-bold text-rose-300">賣出警訊，需要你確認</p>
                <h2 id="sell-title" className="mt-1 text-2xl font-black text-white">{selectedSell.name} {selectedSell.symbol}</h2>
              </div>
              <button type="button" onClick={() => setSelectedSell(null)} className="rounded-xl border border-slate-600 p-2 text-slate-200" aria-label="關閉賣出警訊"><X className="h-5 w-5" /></button>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl bg-slate-800 p-4">
                <p className="text-xs font-bold text-slate-400">買入金額</p>
                <p className="mt-1 text-2xl font-black text-white">{Math.round(selectedSell.buyAmount).toLocaleString()} 元</p>
                <p className="mt-1 text-xs text-slate-400">成本 {money(selectedSell.cost)}，{selectedSell.shares.toLocaleString()} 股</p>
              </div>
              <div className="rounded-2xl bg-slate-800 p-4">
                <p className="text-xs font-bold text-slate-400">目前市值 / 損益</p>
                <p className={`mt-1 text-2xl font-black ${selectedSell.price >= selectedSell.cost ? "text-emerald-300" : "text-rose-300"}`}>
                  {Math.round(selectedSell.price * selectedSell.shares).toLocaleString()} 元
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  {(((selectedSell.price - selectedSell.cost) / selectedSell.cost) * 100).toFixed(2)}%
                </p>
              </div>
            </div>

            <div className="mt-4 rounded-2xl border border-rose-400/25 bg-rose-500/10 p-4 text-sm leading-6 text-rose-100">
              <p className="font-black text-white">{selectedSell.sellType}：建議賣出參考 {money(selectedSell.suggestedSellPrice)}</p>
              <p className="mt-1">{selectedSell.sellReason}</p>
            </div>

            <div className="mt-5 grid gap-2 sm:grid-cols-3">
              <button type="button" onClick={confirmSell} className="rounded-2xl bg-rose-500 px-4 py-3 font-black text-white hover:bg-rose-400">同意賣出</button>
              <button type="button" onClick={() => setSelectedSell(null)} className="rounded-2xl border border-slate-600 px-4 py-3 font-black text-slate-100 hover:bg-slate-800">先續抱</button>
              <Link href={`/dashboard?symbol=${encodeURIComponent(selectedSell.symbol)}`} onClick={() => setSelectedSell(null)} className="rounded-2xl bg-blue-600 px-4 py-3 text-center font-black text-white hover:bg-blue-500">完整分析</Link>
            </div>
            <p className="mt-3 text-xs leading-5 text-slate-400">
              按下同意賣出只會更新本系統持股紀錄，不會送出券商委託單；實際交易仍需你到券商 App 下單。
            </p>
          </section>
        </div>
      ) : null}
    </>
  );
}
