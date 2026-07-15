"use client";

import Link from "next/link";
import { Plus, RefreshCw, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { MetricCard } from "@/components/MetricCard";
import type { AnalysisResult } from "@/lib/types";
import { pct, price } from "@/lib/utils";

type WatchItem = {
  id: string;
  symbol: string;
  note: string;
};

type WatchRow = {
  item: WatchItem;
  analysis?: AnalysisResult;
  error?: string;
};

const STORAGE_KEY = "ai-stock-watchlist-v2";

const DEFAULT_ITEMS: WatchItem[] = [
  { id: "2330.TW", symbol: "2330.TW", note: "權值股觀察" },
  { id: "2317.TW", symbol: "2317.TW", note: "量能突破觀察" },
  { id: "4976.TW", symbol: "4976.TW", note: "佳凌，留意停損線" }
];

function normalizeSymbol(value: string) {
  return value.trim();
}

async function fetchAnalysis(symbol: string) {
  const response = await fetch(`/api/analysis/${encodeURIComponent(symbol)}`, { cache: "no-store" });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error || "分析失敗");
  return payload as AnalysisResult;
}

function watchTone(row: WatchRow) {
  if (!row.analysis) return "neutral" as const;
  if (row.analysis.action === "BUY" || row.analysis.finalScore >= 70) return "bull" as const;
  if (row.analysis.action === "SELL" || row.analysis.action === "STOP_LOSS" || row.analysis.finalScore < 45) return "bear" as const;
  return "warn" as const;
}

export function WatchlistClient() {
  const [items, setItems] = useState<WatchItem[]>(DEFAULT_ITEMS);
  const [rows, setRows] = useState<WatchRow[]>([]);
  const [symbol, setSymbol] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return;
    try {
      const parsed = JSON.parse(stored) as WatchItem[];
      if (Array.isArray(parsed) && parsed.length > 0) setItems(parsed);
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  const totalScore = useMemo(() => {
    const valid = rows.filter((row) => row.analysis);
    if (!valid.length) return 0;
    return Math.round(valid.reduce((sum, row) => sum + (row.analysis?.finalScore ?? 0), 0) / valid.length);
  }, [rows]);

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
    const nextSymbol = normalizeSymbol(symbol);
    if (!nextSymbol) return;
    if (items.some((item) => item.symbol.toUpperCase() === nextSymbol.toUpperCase())) {
      setSymbol("");
      setNote("");
      return;
    }
    setItems((current) => [
      { id: `${nextSymbol}-${Date.now()}`, symbol: nextSymbol, note: note.trim() || "自行觀察" },
      ...current
    ]);
    setSymbol("");
    setNote("");
  }

  function removeItem(id: string) {
    setItems((current) => current.filter((item) => item.id !== id));
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-slate-400">Watchlist</p>
        <h1 className="text-3xl font-black text-white">自選股清單</h1>
        <p className="mt-2 text-slate-300">可新增或刪除自選股，系統會逐檔分析，單一股票資料錯誤不會拖垮整頁。</p>
      </div>

      <section className="glass rounded-3xl p-5">
        <div className="grid gap-3 lg:grid-cols-[1fr_1fr_auto_auto]">
          <input
            value={symbol}
            onChange={(event) => setSymbol(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") addItem();
            }}
            className="rounded-2xl border border-slate-700 bg-slate-950/70 px-4 py-3 text-white outline-none focus:border-blue-400"
            placeholder="輸入股名或股號，例如 能率網通、8071.TWO"
          />
          <input
            value={note}
            onChange={(event) => setNote(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") addItem();
            }}
            className="rounded-2xl border border-slate-700 bg-slate-950/70 px-4 py-3 text-white outline-none focus:border-blue-400"
            placeholder="備註，例如 等回檔、觀察量能"
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
        <MetricCard label="自選股數" value={`${items.length} 檔`} />
        <MetricCard label="平均 AI 分數" value={totalScore || "-"} tone={totalScore >= 70 ? "bull" : totalScore >= 55 ? "warn" : "neutral"} />
        <MetricCard label="可研究買進" value={`${rows.filter((row) => row.analysis?.action === "BUY").length} 檔`} tone="bull" />
        <MetricCard label="需停損/避開" value={`${rows.filter((row) => row.analysis?.action === "STOP_LOSS" || row.analysis?.action === "SELL").length} 檔`} tone="bear" />
      </section>

      {loading ? <div className="glass rounded-3xl p-6 text-slate-300">自選股分析中...</div> : null}

      <div className="grid gap-4 lg:grid-cols-2">
        {rows.map((row) => (
          <article key={row.item.id} className="glass rounded-3xl p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-black text-white">{row.analysis?.name || row.item.symbol}</h2>
                <p className="text-sm text-slate-400">{row.analysis?.symbol || row.item.symbol} · {row.item.note}</p>
              </div>
              <button
                type="button"
                onClick={() => removeItem(row.item.id)}
                className="rounded-2xl border border-rose-400/40 p-3 text-rose-200 transition hover:bg-rose-500/15"
                aria-label="刪除自選股"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>

            {row.error ? (
              <div className="mt-4 rounded-2xl border border-rose-400/30 bg-rose-500/10 p-4 text-rose-100">
                {row.error}
              </div>
            ) : row.analysis ? (
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <MetricCard label="現價 / 漲跌" value={price(row.analysis.price)} sub={pct(row.analysis.changePct)} tone={row.analysis.changePct >= 0 ? "bull" : "bear"} />
                <MetricCard label="AI 決策" value={row.analysis.action} sub={`分數 ${row.analysis.finalScore}`} tone={watchTone(row)} />
                <MetricCard label="建議買點" value={row.analysis.buyPrice} sub={row.analysis.trendStage} />
                <MetricCard label="賣出目標" value={`${price(row.analysis.takeProfit1)} / ${price(row.analysis.takeProfit2)}`} tone="bull" />
                <MetricCard label="停損價" value={price(row.analysis.stopLossPrice)} sub="跌破應降低風險" tone="bear" />
                <MetricCard label="持股建議" value={row.analysis.postEntryForecast.positionAdvice} sub={row.analysis.postEntryForecast.reason} />
                <Link
                  href={`/dashboard?symbol=${encodeURIComponent(row.analysis.symbol)}`}
                  className="rounded-2xl bg-blue-600 px-4 py-3 text-center font-black text-white transition hover:bg-blue-500 sm:col-span-2"
                >
                  查看完整分析
                </Link>
              </div>
            ) : null}
          </article>
        ))}
      </div>
    </div>
  );
}
