"use client";

import {
  Activity,
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  Clock3,
  Database,
  Filter,
  Globe2,
  Layers3,
  MapPin,
  Radio,
  RefreshCw,
  Search,
  ShieldCheck,
  Signal,
  Target,
  TrendingUp
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import { cn } from "@/lib/utils";
import {
  fallbackQuotes,
  layerMeta,
  monitorEvents,
  monitorSources,
  regionMeta,
  type MonitorEvent,
  type MonitorLayer,
  type MonitorQuote,
  type MonitorRegion,
  type MonitorSeverity
} from "@/lib/global-monitor-data";

type ApiMarketQuote = {
  symbol: string;
  label: string;
  price: number;
  changePct: number;
  source: string;
};

type ViewMode = "map" | "wire" | "overview" | "sources";
type MarketFeedState = "loading" | "connected" | "fallback";

const allLayers = Object.keys(layerMeta) as MonitorLayer[];
const regions = Object.keys(regionMeta) as MonitorRegion[];
const trendRows = [
  { time: "00", risk: 48, market: 41 },
  { time: "04", risk: 51, market: 45 },
  { time: "08", risk: 58, market: 54 },
  { time: "12", risk: 63, market: 60 },
  { time: "16", risk: 69, market: 64 },
  { time: "20", risk: 66, market: 61 },
  { time: "24", risk: 72, market: 68 }
];

const severityWeight: Record<MonitorSeverity, number> = {
  critical: 95,
  high: 78,
  medium: 54,
  watch: 28
};

const severityLabel: Record<MonitorSeverity, string> = {
  critical: "極高",
  high: "高",
  medium: "中",
  watch: "觀察"
};

function severityBadge(severity: MonitorSeverity) {
  if (severity === "critical") return "border-red-300/60 bg-red-400/20 text-red-100";
  if (severity === "high") return "border-rose-300/55 bg-rose-400/[0.18] text-rose-100";
  if (severity === "medium") return "border-amber-300/55 bg-amber-400/[0.18] text-amber-100";
  return "border-emerald-300/45 bg-emerald-400/15 text-emerald-100";
}

function severityRing(severity: MonitorSeverity) {
  if (severity === "critical") return "border-red-200 bg-red-400 text-red-950 shadow-[0_0_0_7px_rgba(248,113,113,0.16)]";
  if (severity === "high") return "border-rose-200 bg-rose-400 text-rose-950 shadow-[0_0_0_7px_rgba(251,113,133,0.16)]";
  if (severity === "medium") return "border-amber-200 bg-amber-300 text-amber-950 shadow-[0_0_0_7px_rgba(251,191,36,0.16)]";
  return "border-emerald-200 bg-emerald-300 text-emerald-950 shadow-[0_0_0_7px_rgba(52,211,153,0.14)]";
}

function quoteTone(value: number) {
  if (value > 0) return "text-emerald-300";
  if (value < 0) return "text-rose-300";
  return "text-slate-200";
}

function formatPct(value: number) {
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
}

function formatPrice(value: number) {
  return value.toLocaleString("zh-TW", { maximumFractionDigits: value >= 100 ? 2 : 4 });
}

function quoteFromApi(row: ApiMarketQuote): MonitorQuote {
  return {
    symbol: row.symbol,
    label: row.label,
    price: Number.isFinite(row.price) && row.price > 0 ? formatPrice(row.price) : "-",
    changePct: Number.isFinite(row.changePct) ? row.changePct : 0,
    source: row.source || "市場 API"
  };
}

function WorldMap({
  events,
  selectedId,
  onSelect
}: {
  events: MonitorEvent[];
  selectedId?: string;
  onSelect: (event: MonitorEvent) => void;
}) {
  return (
    <div className="relative min-h-[430px] overflow-hidden rounded-lg border border-white/10 bg-[#0b1414]">
      <div className="absolute inset-0 opacity-70">
        <svg viewBox="0 0 1000 520" className="h-full w-full" role="img" aria-label="全球事件分布圖">
          <defs>
            <linearGradient id="sea" x1="0" x2="1">
              <stop offset="0%" stopColor="#102323" />
              <stop offset="52%" stopColor="#111827" />
              <stop offset="100%" stopColor="#182013" />
            </linearGradient>
            <filter id="softGlow">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          <rect width="1000" height="520" fill="url(#sea)" />
          {Array.from({ length: 9 }).map((_, index) => (
            <path
              key={`lat-${index}`}
              d={`M 0 ${60 + index * 50} H 1000`}
              stroke="rgba(148,163,184,0.12)"
              strokeWidth="1"
            />
          ))}
          {Array.from({ length: 12 }).map((_, index) => (
            <path
              key={`lon-${index}`}
              d={`M ${50 + index * 82} 0 V 520`}
              stroke="rgba(148,163,184,0.1)"
              strokeWidth="1"
            />
          ))}
          <path
            d="M140 176 L192 139 L274 147 L319 189 L292 236 L236 244 L210 294 L148 282 L105 224 Z"
            fill="#263b34"
            stroke="#6ee7b7"
            strokeOpacity=".28"
            strokeWidth="2"
          />
          <path
            d="M247 299 L301 329 L330 389 L306 466 L262 488 L231 431 L196 379 L210 329 Z"
            fill="#2b4637"
            stroke="#6ee7b7"
            strokeOpacity=".24"
            strokeWidth="2"
          />
          <path
            d="M440 144 L514 120 L604 135 L641 180 L620 220 L548 216 L508 248 L444 228 L403 181 Z"
            fill="#334137"
            stroke="#fcd34d"
            strokeOpacity=".28"
            strokeWidth="2"
          />
          <path
            d="M516 250 L590 244 L641 288 L632 366 L586 433 L525 424 L488 362 L472 295 Z"
            fill="#343d32"
            stroke="#fcd34d"
            strokeOpacity=".22"
            strokeWidth="2"
          />
          <path
            d="M624 156 L753 127 L882 169 L907 230 L847 279 L763 260 L721 314 L648 285 L622 222 Z"
            fill="#33414a"
            stroke="#93c5fd"
            strokeOpacity=".28"
            strokeWidth="2"
          />
          <path
            d="M762 348 L849 350 L905 394 L889 448 L804 464 L746 426 Z"
            fill="#3d3d31"
            stroke="#bef264"
            strokeOpacity=".24"
            strokeWidth="2"
          />
          <path
            d="M629 50 C690 36 744 47 785 71"
            fill="none"
            stroke="#94a3b8"
            strokeOpacity=".16"
            strokeWidth="26"
            strokeLinecap="round"
          />
          <circle cx="500" cy="260" r="185" fill="none" stroke="rgba(255,255,255,.08)" strokeWidth="1" />
          <circle cx="500" cy="260" r="248" fill="none" stroke="rgba(255,255,255,.06)" strokeWidth="1" />
          <path
            d="M120 420 C252 319 359 358 470 270 C604 164 748 176 908 105"
            fill="none"
            stroke="#38bdf8"
            strokeOpacity=".22"
            strokeWidth="3"
            strokeDasharray="8 12"
            filter="url(#softGlow)"
          />
          <path
            d="M186 124 C341 231 503 229 823 385"
            fill="none"
            stroke="#fbbf24"
            strokeOpacity=".18"
            strokeWidth="3"
            strokeDasharray="7 13"
          />
        </svg>
      </div>

      <div className="absolute left-4 top-4 z-10 flex items-center gap-2 rounded-md border border-white/10 bg-black/35 px-3 py-2 text-xs font-bold text-slate-200 backdrop-blur">
        <Radio className="h-4 w-4 text-emerald-300" />
        MARKET-AWARE RISK MAP
      </div>

      {events.map((event) => (
        <button
          key={event.id}
          type="button"
          onClick={() => onSelect(event)}
          className={cn(
            "absolute z-20 grid h-8 w-8 place-items-center rounded-full border-2 text-[11px] font-black transition hover:scale-110 focus:outline-none focus:ring-2 focus:ring-white",
            severityRing(event.severity),
            selectedId === event.id ? "scale-125" : ""
          )}
          style={{ left: `${event.x}%`, top: `${event.y}%`, transform: "translate(-50%, -50%)" }}
          aria-label={`${event.title}，${severityLabel[event.severity]}風險`}
        >
          {event.confidence}
        </button>
      ))}

      <div className="absolute bottom-0 left-0 right-0 z-10 border-t border-white/10 bg-black/45 px-4 py-3 backdrop-blur">
        <div className="grid gap-3 text-xs text-slate-300 sm:grid-cols-3">
          <div className="flex items-center gap-2">
            <Signal className="h-4 w-4 text-emerald-300" />
            <span>事件點以信心分數標示</span>
          </div>
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 text-amber-300" />
            <span>股票代號對應市場影響</span>
          </div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-cyan-300" />
            <span>來源與限制一併顯示</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function EventDetail({ event }: { event: MonitorEvent }) {
  return (
    <aside className="rounded-lg border border-white/10 bg-zinc-950/75 p-4 shadow-2xl">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 text-sm font-bold text-slate-400">
            <MapPin className="h-4 w-4" />
            {event.location}
          </p>
          <h2 className="mt-2 text-2xl font-black leading-tight text-white">{event.title}</h2>
        </div>
        <span className={cn("shrink-0 rounded-md border px-2.5 py-1 text-xs font-black", severityBadge(event.severity))}>
          {severityLabel[event.severity]}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-md border border-white/10 bg-white/[0.04] p-3">
          <p className="text-xs text-slate-500">信心分數</p>
          <p className="mt-1 text-3xl font-black text-white">{event.confidence}</p>
        </div>
        <div className="rounded-md border border-white/10 bg-white/[0.04] p-3">
          <p className="text-xs text-slate-500">更新</p>
          <p className="mt-2 text-lg font-black text-slate-100">{event.updatedAgo}</p>
        </div>
      </div>

      <div className="mt-4 space-y-4 text-sm leading-6">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">事件摘要</p>
          <p className="mt-1 text-slate-200">{event.summary}</p>
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">市場影響</p>
          <p className="mt-1 text-slate-200">{event.marketImpact}</p>
        </div>
      </div>

      <div className="mt-4">
        <p className="text-xs font-bold uppercase tracking-wide text-slate-500">追蹤標的</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {event.stockFocus.map((symbol) => (
            <span key={symbol} className="rounded-md border border-cyan-300/20 bg-cyan-300/10 px-2.5 py-1 text-xs font-bold text-cyan-100">
              {symbol}
            </span>
          ))}
        </div>
      </div>

      <div className="mt-4">
        <p className="text-xs font-bold uppercase tracking-wide text-slate-500">來源類型</p>
        <div className="mt-2 grid gap-2">
          {event.sources.map((source) => (
            <div key={source} className="flex items-center gap-2 rounded-md border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-slate-200">
              <CheckCircle2 className="h-4 w-4 text-emerald-300" />
              {source}
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
}

export function GlobalMarketMonitorClient() {
  const [query, setQuery] = useState("");
  const [region, setRegion] = useState<MonitorRegion>("global");
  const [activeLayers, setActiveLayers] = useState<MonitorLayer[]>(allLayers);
  const [view, setView] = useState<ViewMode>("map");
  const [quotes, setQuotes] = useState<MonitorQuote[]>(fallbackQuotes);
  const [feedState, setFeedState] = useState<MarketFeedState>("loading");
  const [lastUpdated, setLastUpdated] = useState("");
  const [selectedEventId, setSelectedEventId] = useState(monitorEvents[0].id);

  const loadQuotes = async () => {
    setFeedState((current) => (current === "connected" ? "connected" : "loading"));
    try {
      const response = await fetch("/api/market/overview", { cache: "no-store" });
      if (!response.ok) throw new Error("market feed failed");
      const payload = await response.json();
      if (!Array.isArray(payload)) throw new Error("invalid market feed");
      const liveQuotes = (payload as ApiMarketQuote[])
        .filter((row) => ["^TWII", "^IXIC", "^SOX", "^VIX", "CL=F", "GC=F", "BTC-USD", "DX-Y.NYB"].includes(row.symbol))
        .slice(0, 8)
        .map(quoteFromApi);
      if (!liveQuotes.length) throw new Error("empty market feed");
      setQuotes(liveQuotes);
      setFeedState("connected");
      setLastUpdated(new Date().toLocaleTimeString("zh-TW", { hour: "2-digit", minute: "2-digit" }));
    } catch {
      setQuotes(fallbackQuotes);
      setFeedState("fallback");
      setLastUpdated(new Date().toLocaleTimeString("zh-TW", { hour: "2-digit", minute: "2-digit" }));
    }
  };

  useEffect(() => {
    void loadQuotes();
    const timer = window.setInterval(() => void loadQuotes(), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  const filteredEvents = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return monitorEvents.filter((event) => {
      const matchesRegion = region === "global" || event.region === region;
      const matchesLayer = activeLayers.includes(event.layer);
      const haystack = `${event.title} ${event.location} ${event.marketImpact} ${event.stockFocus.join(" ")}`.toLowerCase();
      const matchesQuery = !needle || haystack.includes(needle);
      return matchesRegion && matchesLayer && matchesQuery;
    });
  }, [activeLayers, query, region]);

  const selectedEvent = filteredEvents.find((event) => event.id === selectedEventId) ?? filteredEvents[0] ?? monitorEvents[0];

  const riskScore = useMemo(() => {
    if (!filteredEvents.length) return 0;
    return Math.round(filteredEvents.reduce((sum, event) => sum + severityWeight[event.severity] * (event.confidence / 100), 0) / filteredEvents.length);
  }, [filteredEvents]);

  const regionCoverage = useMemo(() => {
    return regions
      .filter((item) => item !== "global")
      .map((item) => ({
        region: item,
        count: monitorEvents.filter((event) => event.region === item).length
      }));
  }, []);

  const pressure = useMemo(() => {
    if (!quotes.length) return 0;
    return quotes.reduce((sum, quote) => sum + Math.abs(quote.changePct), 0) / quotes.length;
  }, [quotes]);

  const toggleLayer = (layer: MonitorLayer) => {
    setActiveLayers((current) =>
      current.includes(layer) ? current.filter((item) => item !== layer) : [...current, layer]
    );
  };

  return (
    <div className="space-y-5">
      <section className="rounded-lg border border-white/10 bg-zinc-950/70 p-4 shadow-2xl">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="min-w-0">
            <p className="flex items-center gap-2 text-sm font-bold text-emerald-300">
              <Globe2 className="h-4 w-4" />
              Global Event Market Radar
            </p>
            <h1 className="mt-1 text-3xl font-black leading-tight text-white md:text-4xl">全球事件市場雷達</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">
              把地緣事件、供應鏈、能源、政策與市場報價放在同一張圖，直接轉成股票與指數需要關注的風險。
            </p>
            <p className="mt-2 max-w-3xl rounded-md border border-amber-300/25 bg-amber-300/10 px-3 py-2 text-xs font-bold leading-5 text-amber-100">
              目前狀態：市場行情會呼叫本系統 API 更新；全球事件層是內建示範資料，尚未接上即時新聞、災害或航運來源。
            </p>
          </div>
          <div className="grid gap-2 sm:grid-cols-3 xl:w-[520px]">
            <div className="rounded-md border border-white/10 bg-white/[0.04] p-3">
              <p className="text-xs text-slate-500">綜合風險</p>
              <p className={cn("mt-1 text-3xl font-black", riskScore >= 70 ? "text-rose-300" : riskScore >= 48 ? "text-amber-300" : "text-emerald-300")}>
                {riskScore}
              </p>
            </div>
            <div className="rounded-md border border-white/10 bg-white/[0.04] p-3">
              <p className="text-xs text-slate-500">符合事件</p>
              <p className="mt-1 text-3xl font-black text-white">{filteredEvents.length}</p>
            </div>
            <div className="rounded-md border border-white/10 bg-white/[0.04] p-3">
              <p className="text-xs text-slate-500">市場波動</p>
              <p className="mt-1 text-3xl font-black text-cyan-200">{pressure.toFixed(1)}%</p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-3 lg:grid-cols-[1fr_auto]">
        <div className="flex min-h-12 items-center gap-2 rounded-lg border border-white/10 bg-zinc-950/70 px-3">
          <Search className="h-5 w-5 shrink-0 text-slate-500" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="h-11 min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-slate-500"
            placeholder="搜尋事件、地區、股票代號"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => void loadQuotes()}
            className="inline-flex h-12 items-center gap-2 rounded-lg border border-white/10 bg-zinc-950/70 px-4 text-sm font-bold text-slate-100 hover:bg-white/10"
          >
            <RefreshCw className={cn("h-4 w-4", feedState === "loading" ? "animate-spin" : "")} />
            更新
          </button>
          <div className={cn(
            "inline-flex h-12 items-center gap-2 rounded-lg border px-4 text-sm font-black",
            feedState === "connected"
              ? "border-emerald-300/40 bg-emerald-400/10 text-emerald-100"
              : feedState === "loading"
                ? "border-cyan-300/30 bg-cyan-400/10 text-cyan-100"
                : "border-amber-300/35 bg-amber-400/10 text-amber-100"
          )}>
            <Radio className="h-4 w-4" />
            {feedState === "connected" ? "行情 API 已連線" : feedState === "loading" ? "行情同步中" : "行情備援資料"}
            {lastUpdated ? <span className="text-xs opacity-70">{lastUpdated}</span> : null}
          </div>
          <div className="inline-flex h-12 items-center gap-2 rounded-lg border border-amber-300/35 bg-amber-400/10 px-4 text-sm font-black text-amber-100">
            <Database className="h-4 w-4" />
            事件資料為內建示範
          </div>
        </div>
      </section>

      <section className="flex flex-wrap gap-2">
        {regions.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setRegion(item)}
            className={cn(
              "h-10 rounded-lg border px-3 text-sm font-bold transition",
              region === item
                ? "border-emerald-300/50 bg-emerald-300/15 text-emerald-100"
                : "border-white/10 bg-zinc-950/55 text-slate-300 hover:bg-white/10"
            )}
          >
            {regionMeta[item].short}
          </button>
        ))}
      </section>

      <section className="rounded-lg border border-white/10 bg-zinc-950/60 p-3">
        <div className="mb-3 flex flex-wrap items-center gap-2 text-sm font-bold text-slate-300">
          <Layers3 className="h-4 w-4 text-slate-500" />
          資料層
        </div>
        <div className="flex flex-wrap gap-2">
          {allLayers.map((layer) => {
            const active = activeLayers.includes(layer);
            return (
              <button
                key={layer}
                type="button"
                onClick={() => toggleLayer(layer)}
                className={cn(
                  "inline-flex h-10 items-center gap-2 rounded-lg border px-3 text-sm font-bold transition",
                  active ? "border-white/20 bg-white/[0.12] text-white" : "border-white/10 bg-transparent text-slate-500"
                )}
              >
                <span className={cn("h-2.5 w-2.5 rounded-full", layerMeta[layer].dot)} />
                {layerMeta[layer].label}
              </button>
            );
          })}
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {quotes.map((quote) => (
          <div key={quote.symbol} className="rounded-lg border border-white/10 bg-zinc-950/70 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm text-slate-400">{quote.label}</p>
                <p className="mt-1 text-xs text-slate-600">{quote.symbol}</p>
              </div>
              <TrendingUp className={cn("h-4 w-4", quoteTone(quote.changePct))} />
            </div>
            <p className="mt-3 text-2xl font-black text-white">{quote.price}</p>
            <p className={cn("mt-1 text-sm font-black", quoteTone(quote.changePct))}>{formatPct(quote.changePct)}</p>
            <p className="mt-2 truncate text-xs text-slate-500">{quote.source}</p>
          </div>
        ))}
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.55fr)_420px]">
        <div className="rounded-lg border border-white/10 bg-zinc-950/70 p-3">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2">
              {[
                { id: "map" as const, label: "地圖", icon: Globe2 },
                { id: "wire" as const, label: "快訊", icon: Activity },
                { id: "overview" as const, label: "總覽", icon: BarChart3 },
                { id: "sources" as const, label: "資料", icon: Database }
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setView(item.id)}
                    className={cn(
                      "inline-flex h-10 items-center gap-2 rounded-lg border px-3 text-sm font-bold",
                      view === item.id
                        ? "border-cyan-300/45 bg-cyan-300/15 text-cyan-100"
                        : "border-white/10 bg-transparent text-slate-400 hover:bg-white/10"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </button>
                );
              })}
            </div>
            <p className="flex items-center gap-2 text-xs font-bold text-slate-500">
              <Clock3 className="h-4 w-4" />
              示範事件視窗
            </p>
          </div>

          {view === "map" ? (
            <WorldMap events={filteredEvents} selectedId={selectedEvent.id} onSelect={(event) => setSelectedEventId(event.id)} />
          ) : null}

          {view === "wire" ? (
            <div className="grid max-h-[560px] gap-3 overflow-y-auto pr-1">
              {filteredEvents.map((event) => (
                <button
                  key={event.id}
                  type="button"
                  onClick={() => setSelectedEventId(event.id)}
                  className={cn(
                    "rounded-lg border p-4 text-left transition hover:bg-white/[0.06]",
                    selectedEvent.id === event.id ? "border-cyan-300/45 bg-cyan-300/10" : "border-white/10 bg-white/[0.03]"
                  )}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={cn("rounded-md border px-2 py-1 text-xs font-black", severityBadge(event.severity))}>
                      {severityLabel[event.severity]}
                    </span>
                    <span className={cn("text-xs font-bold", layerMeta[event.layer].text)}>{layerMeta[event.layer].label}</span>
                    <span className="text-xs text-slate-500">{event.updatedAgo}</span>
                  </div>
                  <h3 className="mt-2 text-lg font-black text-white">{event.title}</h3>
                  <p className="mt-1 text-sm leading-6 text-slate-300">{event.marketImpact}</p>
                </button>
              ))}
            </div>
          ) : null}

          {view === "overview" ? (
            <div className="grid gap-4 lg:grid-cols-[1.2fr_.8fr]">
              <div className="h-[360px] rounded-lg border border-white/10 bg-black/20 p-4">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-400">Risk Trend</p>
                    <h2 className="text-xl font-black text-white">事件風險與市場壓力</h2>
                  </div>
                  <AlertTriangle className="h-6 w-6 text-amber-300" />
                </div>
                <ResponsiveContainer width="100%" height="82%">
                  <AreaChart data={trendRows}>
                    <defs>
                      <linearGradient id="riskFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#fb7185" stopOpacity={0.45} />
                        <stop offset="95%" stopColor="#fb7185" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="marketFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="#22d3ee" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="time" stroke="#64748b" tickLine={false} axisLine={false} />
                    <Tooltip
                      contentStyle={{ background: "#09090b", border: "1px solid rgba(255,255,255,.12)", borderRadius: 8 }}
                      labelStyle={{ color: "#e2e8f0" }}
                    />
                    <Area type="monotone" dataKey="risk" stroke="#fb7185" fill="url(#riskFill)" strokeWidth={3} />
                    <Area type="monotone" dataKey="market" stroke="#22d3ee" fill="url(#marketFill)" strokeWidth={3} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <div className="rounded-lg border border-white/10 bg-black/20 p-4">
                <p className="text-sm text-slate-400">Coverage Balance</p>
                <h2 className="mt-1 text-xl font-black text-white">區域覆蓋</h2>
                <div className="mt-5 space-y-3">
                  {regionCoverage.map((row) => (
                    <div key={row.region}>
                      <div className="mb-1 flex justify-between text-sm">
                        <span className="font-bold text-slate-300">{regionMeta[row.region].label}</span>
                        <span className="text-slate-500">{row.count}</span>
                      </div>
                      <div className="h-2 rounded-full bg-white/10">
                        <div className="h-2 rounded-full bg-emerald-300" style={{ width: `${Math.max(12, row.count * 18)}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : null}

          {view === "sources" ? (
            <div className="grid gap-3">
              {monitorSources.map((source) => (
                <div key={source.name} className="rounded-lg border border-white/10 bg-white/[0.03] p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h3 className="text-lg font-black text-white">{source.name}</h3>
                      <p className="mt-1 text-sm text-slate-400">{source.coverage}</p>
                    </div>
                    <div className="text-left sm:text-right">
                      <p className="text-xs text-slate-500">{source.status}</p>
                      <p className="mt-1 text-2xl font-black text-emerald-300">{source.reliability}</p>
                    </div>
                  </div>
                  <div className="mt-3 h-2 rounded-full bg-white/10">
                    <div className="h-2 rounded-full bg-cyan-300" style={{ width: `${source.reliability}%` }} />
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </div>

        <EventDetail event={selectedEvent} />
      </section>

      <section className="grid gap-4 lg:grid-cols-4">
        {[
          { icon: Filter, title: "噪音控制", value: `${activeLayers.length}/7`, text: "只顯示打開的資料層與區域。" },
          { icon: ShieldCheck, title: "資料透明", value: "來源", text: "每個事件都有來源類型與信心分數。" },
          { icon: Signal, title: "故障備援", value: feedState === "connected" ? "API" : "SAFE", text: "市場行情失敗時仍保留可讀畫面。" },
          { icon: Target, title: "股票連結", value: "Impact", text: "事件直接映射到股票、指數或商品。" }
        ].map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.title} className="rounded-lg border border-white/10 bg-zinc-950/70 p-4">
              <div className="flex items-center justify-between gap-3">
                <Icon className="h-5 w-5 text-cyan-300" />
                <span className="text-sm font-black text-slate-500">{item.value}</span>
              </div>
              <h3 className="mt-3 text-lg font-black text-white">{item.title}</h3>
              <p className="mt-1 text-sm leading-6 text-slate-400">{item.text}</p>
            </div>
          );
        })}
      </section>
    </div>
  );
}
