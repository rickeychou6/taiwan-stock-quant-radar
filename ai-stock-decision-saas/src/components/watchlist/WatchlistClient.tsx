"use client";

import Link from "next/link";
import { Bell, Plus, RefreshCw, Trash2, Volume2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
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

type AlertEvent = {
  key: string;
  symbol: string;
  name: string;
  type: "買點" | "第一目標" | "第二目標" | "停損";
  message: string;
  tone: "bull" | "bear" | "warn";
  createdAt: string;
};

const STORAGE_KEY = "ai-stock-watchlist-v2";
const ALERT_SOUND_KEY = "ai-stock-watchlist-alert-sound";

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
  if (row.analysis.entrySignal.label === "應買" || row.analysis.entrySignal.label === "可買") return "bull" as const;
  if (row.analysis.entrySignal.label === "小量試單" || row.analysis.entrySignal.label === "等待" || row.analysis.entrySignal.label === "觀望") return "warn" as const;
  if (row.analysis.entrySignal.label === "不買" || row.analysis.entrySignal.label === "觀察") return "bear" as const;
  if (row.analysis.action === "SELL" || row.analysis.action === "STOP_LOSS" || row.analysis.finalScore < 45) return "bear" as const;
  return "warn" as const;
}

function isBuyableEntry(analysis: AnalysisResult) {
  return analysis.entrySignal.label === "應買" || analysis.entrySignal.label === "可買" || analysis.entrySignal.label === "小量試單";
}

function parseBuyRange(value: string) {
  const numbers = value.match(/\d+(?:\.\d+)?/g)?.map(Number).filter(Number.isFinite) ?? [];
  if (numbers.length >= 2) return { low: Math.min(numbers[0], numbers[1]), high: Math.max(numbers[0], numbers[1]) };
  if (numbers.length === 1) return { low: numbers[0], high: numbers[0] };
  return null;
}

function alertEventsFor(row: WatchRow): AlertEvent[] {
  if (!row.analysis) return [];
  const analysis = row.analysis;
  const now = new Date().toISOString();
  const rows: AlertEvent[] = [];
  const buyRange = parseBuyRange(analysis.buyPrice);
  const inBuyRange = buyRange ? analysis.price >= buyRange.low && analysis.price <= buyRange.high : false;

  if (isBuyableEntry(analysis) && (analysis.action === "BUY" || inBuyRange)) {
    rows.push({
      key: `${analysis.symbol}-BUY-${analysis.price.toFixed(2)}`,
      symbol: analysis.symbol,
      name: analysis.name,
      type: "買點",
      message: `${analysis.name} 觸發${analysis.entrySignal.label}，現價 ${price(analysis.price)}，建議買點 ${analysis.buyPrice}`,
      tone: "bull",
      createdAt: now
    });
  }

  if (analysis.price <= analysis.stopLossPrice || analysis.action === "STOP_LOSS" || analysis.action === "SELL") {
    rows.push({
      key: `${analysis.symbol}-STOP-${analysis.stopLossPrice.toFixed(2)}`,
      symbol: analysis.symbol,
      name: analysis.name,
      type: "停損",
      message: `${analysis.name} 觸發停損/賣出警示，現價 ${price(analysis.price)}，停損價 ${price(analysis.stopLossPrice)}`,
      tone: "bear",
      createdAt: now
    });
  } else if (analysis.price >= analysis.takeProfit2) {
    rows.push({
      key: `${analysis.symbol}-TP2-${analysis.takeProfit2.toFixed(2)}`,
      symbol: analysis.symbol,
      name: analysis.name,
      type: "第二目標",
      message: `${analysis.name} 已達第二目標，現價 ${price(analysis.price)}，建議分批獲利。`,
      tone: "warn",
      createdAt: now
    });
  } else if (analysis.price >= analysis.takeProfit1) {
    rows.push({
      key: `${analysis.symbol}-TP1-${analysis.takeProfit1.toFixed(2)}`,
      symbol: analysis.symbol,
      name: analysis.name,
      type: "第一目標",
      message: `${analysis.name} 已達第一目標，現價 ${price(analysis.price)}，第一目標 ${price(analysis.takeProfit1)}`,
      tone: "warn",
      createdAt: now
    });
  }

  return rows;
}

function playAlarm() {
  const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextClass) return;
  const context = new AudioContextClass();
  const gain = context.createGain();
  gain.gain.value = 0.05;
  gain.connect(context.destination);

  [0, 0.18, 0.36].forEach((offset) => {
    const oscillator = context.createOscillator();
    oscillator.type = "sine";
    oscillator.frequency.value = 880;
    oscillator.connect(gain);
    oscillator.start(context.currentTime + offset);
    oscillator.stop(context.currentTime + offset + 0.12);
  });

  window.setTimeout(() => void context.close(), 900);
}

export function WatchlistClient() {
  const [items, setItems] = useState<WatchItem[]>(DEFAULT_ITEMS);
  const [rows, setRows] = useState<WatchRow[]>([]);
  const [symbol, setSymbol] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [alertsEnabled, setAlertsEnabled] = useState(false);
  const [autoCheck, setAutoCheck] = useState(true);
  const [alertEvents, setAlertEvents] = useState<AlertEvent[]>([]);
  const alertedKeysRef = useRef<Record<string, number>>({});
  const rowsRef = useRef<WatchRow[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return;
    try {
      const parsed = JSON.parse(stored) as WatchItem[];
      if (Array.isArray(parsed) && parsed.length > 0) setItems(parsed);
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
    setAlertsEnabled(localStorage.getItem(ALERT_SOUND_KEY) === "enabled");
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  useEffect(() => {
    rowsRef.current = rows;
  }, [rows]);

  const totalScore = useMemo(() => {
    const valid = rows.filter((row) => row.analysis);
    if (!valid.length) return 0;
    return Math.round(valid.reduce((sum, row) => sum + (row.analysis?.finalScore ?? 0), 0) / valid.length);
  }, [rows]);
  const buyableCount = useMemo(() => rows.filter((row) => row.analysis && isBuyableEntry(row.analysis)).length, [rows]);
  const avoidCount = useMemo(
    () =>
      rows.filter(
        (row) =>
          row.analysis &&
          (row.analysis.entrySignal.label === "不買" ||
            row.analysis.entrySignal.label === "觀察" ||
            row.analysis.action === "STOP_LOSS" ||
            row.analysis.action === "SELL")
      ).length,
    [rows]
  );

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
      .then((nextRows) => {
        setRows(nextRows);
        inspectAlerts(nextRows);
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadRows(items);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items]);

  useEffect(() => {
    if (!alertsEnabled || !autoCheck) return;
    const timer = window.setInterval(() => loadRows(items), 60_000);
    return () => window.clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [alertsEnabled, autoCheck, items]);

  async function enableAlerts() {
    playAlarm();
    if ("Notification" in window && Notification.permission === "default") {
      await Notification.requestPermission();
    }
    if ("vibrate" in navigator) navigator.vibrate([120, 80, 120]);
    localStorage.setItem(ALERT_SOUND_KEY, "enabled");
    setAlertsEnabled(true);
    inspectAlerts(rowsRef.current);
  }

  function inspectAlerts(nextRows: WatchRow[]) {
    if (!alertsEnabled && localStorage.getItem(ALERT_SOUND_KEY) !== "enabled") return;
    const now = Date.now();
    const freshEvents = nextRows.flatMap(alertEventsFor).filter((event) => {
      const lastTime = alertedKeysRef.current[event.key] ?? 0;
      return now - lastTime > 10 * 60_000;
    });
    if (!freshEvents.length) return;

    for (const event of freshEvents) {
      alertedKeysRef.current[event.key] = now;
      if ("Notification" in window && Notification.permission === "granted") {
        new Notification(`台股警示：${event.type}`, {
          body: event.message,
          tag: event.key
        });
      }
    }

    playAlarm();
    if ("vibrate" in navigator) navigator.vibrate([250, 120, 250, 120, 250]);
    setAlertEvents((current) => [...freshEvents, ...current].slice(0, 12));
  }

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

      <section className="glass rounded-3xl p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="flex items-center gap-2 text-xl font-black text-white">
              <Bell className="h-5 w-5 text-amber-300" />
              買賣點警示
            </h2>
            <p className="mt-2 text-sm text-slate-300">
              頁面開著時會每 60 秒檢查自選股；觸發買點、停損或目標賣出價時，手機可跳通知、震動並播放警示音。
            </p>
            <p className="mt-1 text-xs text-slate-400">SMS 簡訊需串接簡訊商，通常會收費；目前先使用免費瀏覽器通知與聲音。</p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={enableAlerts}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-amber-500 px-5 py-3 font-black text-slate-950 transition hover:bg-amber-400"
            >
              <Volume2 className="h-4 w-4" />
              {alertsEnabled ? "警示音已啟用" : "啟用手機警示音"}
            </button>
            <button
              type="button"
              onClick={() => setAutoCheck((value) => !value)}
              className="rounded-2xl border border-slate-700 px-5 py-3 font-black text-slate-100 transition hover:bg-slate-800"
            >
              自動檢查：{autoCheck ? "開" : "關"}
            </button>
          </div>
        </div>
        {alertEvents.length ? (
          <div className="mt-4 space-y-2">
            {alertEvents.map((event) => (
              <div
                key={`${event.key}-${event.createdAt}`}
                className={`rounded-2xl border px-4 py-3 text-sm ${
                  event.tone === "bull"
                    ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-100"
                    : event.tone === "bear"
                      ? "border-rose-400/40 bg-rose-400/10 text-rose-100"
                      : "border-amber-400/40 bg-amber-400/10 text-amber-100"
                }`}
              >
                <span className="font-black">{event.type}</span> · {event.message}
              </div>
            ))}
          </div>
        ) : null}
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="自選股數" value={`${items.length} 檔`} />
        <MetricCard label="平均 AI 分數" value={totalScore || "-"} tone={totalScore >= 70 ? "bull" : totalScore >= 55 ? "warn" : "neutral"} />
        <MetricCard label="可買 / 試單" value={`${buyableCount} 檔`} sub="依分析頁進場建議" tone={buyableCount ? "bull" : "warn"} />
        <MetricCard label="需避開 / 觀察" value={`${avoidCount} 檔`} sub="不買、觀察、停損或賣出" tone={avoidCount ? "bear" : "neutral"} />
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
                <MetricCard label="進場建議" value={row.analysis.entrySignal.label} sub={row.analysis.entrySignal.reason} tone={watchTone(row)} />
                <MetricCard label="今日 AI 決策" value={row.analysis.action} sub={`分數 ${row.analysis.finalScore} / 信心 ${row.analysis.confidence}%`} tone={watchTone(row)} />
                <MetricCard label="模型可靠度" value={row.analysis.modelCalibration.reliability} sub={`5 日正確率 ${row.analysis.modelCalibration.directionAccuracy5Day}%`} tone={row.analysis.modelCalibration.reliability === "高" ? "bull" : row.analysis.modelCalibration.reliability === "中" ? "warn" : "bear"} />
                <MetricCard label="警示狀態" value={alertEventsFor(row).map((event) => event.type).join("、") || "未觸發"} sub="買點 / 停損 / 目標價" tone={alertEventsFor(row).some((event) => event.tone === "bear") ? "bear" : alertEventsFor(row).length ? "warn" : "neutral"} />
                <MetricCard label="支撐價位" value={row.analysis.supportPriceRange} sub={`核心支撐 ${price(row.analysis.supportPrice)}`} tone="warn" />
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
