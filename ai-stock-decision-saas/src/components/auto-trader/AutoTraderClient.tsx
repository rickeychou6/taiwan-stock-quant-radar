"use client";

import Link from "next/link";
import { Bot, Download, RefreshCw, RotateCcw, Shield, WalletCards } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { MetricCard } from "@/components/MetricCard";
import type { StockRecommendation } from "@/lib/recommendation-engine";
import type { AnalysisResult } from "@/lib/types";
import { pct, price } from "@/lib/utils";

type AutoPosition = {
  id: string;
  symbol: string;
  name: string;
  shares: number;
  entryPrice: number;
  entryAmount: number;
  stopLossPrice: number;
  takeProfit1: number;
  takeProfit2: number;
  openedAt: string;
  openedTradingDate: string;
  tradeStyle: string;
  automationAction: string;
  positionSizePct: number;
  lastPrice: number;
  lastValue: number;
  unrealizedPnl: number;
  unrealizedPnlPct: number;
  lastAnalysisAt: string;
};

type TradeRecord = {
  id: string;
  side: "BUY" | "SELL" | "PARTIAL_SELL" | "BLOCKED_SELL" | "SKIP";
  symbol: string;
  name: string;
  price: number;
  shares: number;
  amount: number;
  costBasis?: number;
  realizedPnl?: number;
  realizedPnlPct?: number;
  cashAfter: number;
  reason: string;
  createdAt: string;
  tradingDate: string;
  source: string;
  positionId?: string;
};

type DecisionRecord = {
  id: string;
  symbol: string;
  name: string;
  decision: string;
  reason: string;
  finalScore?: number;
  tradeStyle?: string;
  automationAction?: string;
  createdAt: string;
  tradingDate: string;
};

type EquitySnapshot = {
  id: string;
  createdAt: string;
  tradingDate: string;
  cash: number;
  positionValue: number;
  totalEquity: number;
  realizedPnl: number;
};

type AutoTraderState = {
  initialCapital: number;
  cash: number;
  realizedPnl: number;
  positions: AutoPosition[];
  trades: TradeRecord[];
  decisions: DecisionRecord[];
  equity: EquitySnapshot[];
  lastRunAt: string;
  strategyVersion?: string;
};

type RecommendationReport = {
  recommendations: StockRecommendation[];
  source: string;
  updatedAt: string;
  errors?: { symbol: string; message: string }[];
};

type CloudStateResponse = {
  state: AutoTraderState;
  source: "github-actions" | "not_started" | "error";
  message: string;
  stateUrl?: string;
};

const STORAGE_KEY = "ai-auto-trader-v1";
const INITIAL_CAPITAL = 100_000;
const MAX_POSITIONS = 4;
const CASH_RESERVE = 5_000;
const STRATEGY_VERSION = "risk-guard-v2-2026-08-13";
const MAX_DAILY_NEW_BUYS = 2;
const MIN_POSITION_VALUE = 3_000;
const SYMBOL_COOLDOWN_DAYS = 3;
const MAX_LOSS_SHORT_PCT = 4.5;
const MAX_LOSS_SWING_PCT = 6.5;
const PAGE_REFRESH_INTERVAL_MS = 60_000;

function emptyState(): AutoTraderState {
  return {
    initialCapital: INITIAL_CAPITAL,
    cash: INITIAL_CAPITAL,
    realizedPnl: 0,
    positions: [],
    trades: [],
    decisions: [],
    equity: [],
    lastRunAt: "",
    strategyVersion: STRATEGY_VERSION
  };
}

function normalizeState(input: (Partial<AutoTraderState> & { settings?: unknown }) | null | undefined): AutoTraderState {
  const normalized: AutoTraderState & { settings?: unknown } = {
    ...emptyState(),
    ...(input || {}),
    positions: Array.isArray(input?.positions) ? input.positions : [],
    trades: Array.isArray(input?.trades) ? input.trades : [],
    decisions: Array.isArray(input?.decisions) ? input.decisions : [],
    equity: Array.isArray(input?.equity) ? input.equity : [],
    lastRunAt: typeof input?.lastRunAt === "string" ? input.lastRunAt : "",
    strategyVersion: STRATEGY_VERSION
  };

  delete normalized.settings;
  return normalized;
}

function nowIso() {
  return new Date().toISOString();
}

function tradingDateNow() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Taipei" });
}

function id(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function twd(value: number) {
  if (!Number.isFinite(value)) return "-";
  return `${Math.round(value).toLocaleString()} 元`;
}

function signedTwd(value: number) {
  if (!Number.isFinite(value)) return "-";
  return `${value > 0 ? "+" : ""}${twd(value)}`;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function canSellToday(position: AutoPosition, tradingDate: string) {
  return position.openedTradingDate !== tradingDate;
}

function tradedSymbolToday(state: AutoTraderState, symbol: string, tradingDate: string) {
  return state.trades.some((trade) => trade.symbol === symbol && trade.tradingDate === tradingDate && (trade.side === "BUY" || trade.side === "SELL" || trade.side === "PARTIAL_SELL"));
}

function actionTone(action: string) {
  if (action === "可開倉" || action === "續抱" || action === "BUY") return "bull" as const;
  if (action === "小量試單" || action === "等待" || action === "WATCH") return "warn" as const;
  return "bear" as const;
}

function tradeSideLabel(side: TradeRecord["side"]) {
  if (side === "BUY") return "買進";
  if (side === "SELL") return "賣出";
  if (side === "PARTIAL_SELL") return "部分賣出";
  if (side === "BLOCKED_SELL") return "禁止當沖";
  return "略過";
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function findPositionBuyTrade(state: AutoTraderState, trade: TradeRecord) {
  if (!trade.positionId) return null;
  return state.trades.find((item) => item.side === "BUY" && item.positionId === trade.positionId) || null;
}

function sellTradePnl(trade: TradeRecord, state: AutoTraderState) {
  if (!(trade.side === "SELL" || trade.side === "PARTIAL_SELL") || !trade.shares) return null;
  const buyTrade = findPositionBuyTrade(state, trade);
  const costBasis = isFiniteNumber(trade.costBasis)
    ? trade.costBasis
    : buyTrade
      ? buyTrade.price * trade.shares
      : undefined;
  const pnl = isFiniteNumber(trade.realizedPnl)
    ? trade.realizedPnl
    : isFiniteNumber(costBasis)
      ? trade.amount - costBasis
      : undefined;
  const pnlPct = isFiniteNumber(trade.realizedPnlPct)
    ? trade.realizedPnlPct
    : isFiniteNumber(costBasis) && costBasis > 0 && isFiniteNumber(pnl)
      ? (pnl / costBasis) * 100
      : undefined;
  if (!isFiniteNumber(pnl)) return null;
  return { pnl, pnlPct, costBasis };
}

function tradePnlInfo(trade: TradeRecord, state: AutoTraderState) {
  if (trade.side === "SELL" || trade.side === "PARTIAL_SELL") {
    const realized = sellTradePnl(trade, state);
    if (!realized) return null;
    return {
      label: "本筆損益",
      value: signedTwd(realized.pnl),
      percent: isFiniteNumber(realized.pnlPct) ? pct(realized.pnlPct) : "",
      hint: isFiniteNumber(realized.costBasis) ? `成本 ${twd(realized.costBasis)}` : "",
      pnl: realized.pnl
    };
  }

  if (trade.side === "BUY" && trade.positionId) {
    const openPosition = state.positions.find((position) => position.id === trade.positionId);
    if (openPosition) {
      return {
        label: "持有中損益",
        value: signedTwd(openPosition.unrealizedPnl),
        percent: pct(openPosition.unrealizedPnlPct),
        hint: `現價 ${price(openPosition.lastPrice)}`,
        pnl: openPosition.unrealizedPnl
      };
    }

    const relatedSells = state.trades.filter((item) => item.positionId === trade.positionId && (item.side === "SELL" || item.side === "PARTIAL_SELL"));
    if (relatedSells.length) {
      const realizedPnl = relatedSells.reduce((sum, item) => sum + (sellTradePnl(item, state)?.pnl || 0), 0);
      return {
        label: "已結清損益",
        value: signedTwd(realizedPnl),
        percent: trade.amount > 0 ? pct((realizedPnl / trade.amount) * 100) : "",
        hint: `買進成本 ${twd(trade.amount)}`,
        pnl: realizedPnl
      };
    }
  }

  return null;
}

function tradePnlClass(pnl: number) {
  if (pnl > 0) return "border-emerald-400/30 bg-emerald-400/10 text-emerald-200";
  if (pnl < 0) return "border-rose-400/30 bg-rose-400/10 text-rose-200";
  return "border-slate-500/30 bg-slate-500/10 text-slate-200";
}

async function fetchAnalysis(symbol: string) {
  const response = await fetch(`/api/analysis/${encodeURIComponent(symbol)}`, { cache: "no-store" });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error || "分析失敗");
  return payload as AnalysisResult;
}

async function fetchRecommendations() {
  const response = await fetch("/api/recommendations?scanLimit=48&limit=30", { cache: "no-store" });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error || "推薦清單失敗");
  return payload as RecommendationReport;
}

function markPosition(position: AutoPosition, analysis: AnalysisResult): AutoPosition {
  const lastValue = analysis.price * position.shares;
  const unrealizedPnl = lastValue - position.entryAmount;
  return {
    ...position,
    stopLossPrice: analysis.stopLossPrice,
    takeProfit1: analysis.takeProfit1,
    takeProfit2: analysis.takeProfit2,
    tradeStyle: analysis.tradeProfile.style,
    automationAction: analysis.tradeProfile.automationAction,
    positionSizePct: analysis.tradeProfile.positionSizePct,
    lastPrice: analysis.price,
    lastValue,
    unrealizedPnl,
    unrealizedPnlPct: position.entryAmount ? (unrealizedPnl / position.entryAmount) * 100 : 0,
    lastAnalysisAt: nowIso()
  };
}

function positionPnlPct(position: AutoPosition, currentPrice = position.lastPrice) {
  if (!position.entryPrice || position.entryPrice <= 0) return 0;
  return ((currentPrice - position.entryPrice) / position.entryPrice) * 100;
}

function hardStopPrice(position: AutoPosition) {
  const maxLossPct = position.tradeStyle === "短進短出" ? MAX_LOSS_SHORT_PCT : MAX_LOSS_SWING_PCT;
  return position.entryPrice * (1 - maxLossPct / 100);
}

function tradeDateValue(date: string) {
  const parsed = Date.parse(`${date}T00:00:00+08:00`);
  return Number.isFinite(parsed) ? parsed : 0;
}

function daysBetween(laterDate: string, earlierDate: string) {
  const later = tradeDateValue(laterDate);
  const earlier = tradeDateValue(earlierDate);
  if (!later || !earlier) return 999;
  return Math.floor((later - earlier) / 86_400_000);
}

function tradedSymbolRecently(state: AutoTraderState, symbol: string, tradingDate: string, days = SYMBOL_COOLDOWN_DAYS) {
  return state.trades.some((trade) => {
    if (trade.symbol !== symbol) return false;
    if (!(trade.side === "SELL" || trade.side === "PARTIAL_SELL" || trade.side === "BLOCKED_SELL")) return false;
    const gap = daysBetween(tradingDate, trade.tradingDate);
    return gap >= 0 && gap <= days;
  });
}

function partialSoldToday(state: AutoTraderState, position: AutoPosition, tradingDate: string) {
  return state.trades.some((trade) =>
    trade.positionId === position.id &&
    trade.tradingDate === tradingDate &&
    trade.side === "PARTIAL_SELL"
  );
}

function dailyBuyCount(state: AutoTraderState, tradingDate: string) {
  return state.trades.filter((trade) => trade.tradingDate === tradingDate && trade.side === "BUY").length;
}

function shouldSell(position: AutoPosition, analysis: AnalysisResult, state: AutoTraderState, tradingDate: string) {
  const pnlPct = positionPnlPct(position, analysis.price);
  const stop = Math.max(position.stopLossPrice, analysis.stopLossPrice, hardStopPrice(position));

  if (analysis.price <= stop) {
    return { sell: true, partial: false, reason: `現價跌破停損線 ${price(stop)}` };
  }
  if (pnlPct <= -MAX_LOSS_SHORT_PCT && position.tradeStyle === "短進短出") {
    return { sell: true, partial: false, reason: `短線部位虧損 ${pnlPct.toFixed(2)}%，觸發 ${MAX_LOSS_SHORT_PCT}% 硬停損。` };
  }
  if (pnlPct <= -MAX_LOSS_SWING_PCT) {
    return { sell: true, partial: false, reason: `部位虧損 ${pnlPct.toFixed(2)}%，觸發 ${MAX_LOSS_SWING_PCT}% 風控停損。` };
  }
  if (analysis.tradeProfile.automationAction === "停損" || analysis.action === "STOP_LOSS" || analysis.action === "SELL") {
    return { sell: true, partial: false, reason: `AI 轉為 ${analysis.tradeProfile.automationAction} / ${analysis.action}` };
  }
  if (analysis.price >= analysis.takeProfit2) {
    return { sell: true, partial: false, reason: `已達第二目標 ${price(analysis.takeProfit2)}` };
  }
  if (analysis.tradeProfile.automationAction === "減碼" || analysis.postEntryForecast.positionAdvice === "減碼") {
    if (position.lastValue < MIN_POSITION_VALUE || position.shares <= 2) {
      return { sell: true, partial: false, reason: `剩餘部位低於 ${twd(MIN_POSITION_VALUE)}，不再零碎減碼，直接結束交易。` };
    }
    if (partialSoldToday(state, position, tradingDate)) {
      return { sell: false, partial: false, reason: "今日已執行過一次減碼，避免排程盤中重複賣一半。" };
    }
    return { sell: true, partial: true, reason: `AI 顯示減碼訊號：${analysis.tradeProfile.exitPlan}` };
  }
  if (analysis.price >= analysis.takeProfit1 && analysis.tradeProfile.style === "短進短出") {
    if (partialSoldToday(state, position, tradingDate)) {
      return { sell: false, partial: false, reason: "今日已達短線目標並減碼過一次，剩餘部位留到下一輪交易日再判斷。" };
    }
    return { sell: true, partial: true, reason: `短線標的已達第一目標 ${price(analysis.takeProfit1)}，先鎖定部分獲利` };
  }
  return { sell: false, partial: false, reason: analysis.tradeProfile.stopPolicy };
}

function candidatePassesRiskGate(candidate: StockRecommendation, state: AutoTraderState, tradingDate: string) {
  const reasons: string[] = [];
  const isBuyCandidate = candidate.recommendation === "買入候選";
  const isTrial = candidate.recommendation === "可小量試單";

  if (!(isBuyCandidate || isTrial)) reasons.push(`推薦等級為 ${candidate.recommendation}`);
  if (!(candidate.automationAction === "可開倉" || candidate.automationAction === "小量試單")) reasons.push(`AI 動作為 ${candidate.automationAction}`);
  if (candidate.tradeMode === "區間等待") reasons.push("交易模式仍是區間等待，機器人不主動買入等待型訊號");
  if (candidate.tradeStyle === "短進短出" && candidate.tradeMode !== "強勢動能" && candidate.tradeMode !== "支撐低接") reasons.push(`短線模式 ${candidate.tradeMode} 不夠明確`);
  if (candidate.finalScore < 58) reasons.push(`AI 分數 ${candidate.finalScore} 低於 58`);
  if (candidate.probabilityUp3To5 < 56) reasons.push(`3-5 天上漲機率 ${candidate.probabilityUp3To5}% 低於 56%`);
  if (candidate.forecastDay5Pct < 0.3) reasons.push(`第 5 天預估 ${candidate.forecastDay5Pct}% 不足`);
  if (candidate.riskReward < 0.9) reasons.push(`風險報酬比 1:${candidate.riskReward} 低於 0.9`);
  if (candidate.changePct >= 7) reasons.push(`今日漲幅 ${candidate.changePct}% 過熱，避免追高`);
  if (candidate.changePct <= -4) reasons.push(`今日跌幅 ${candidate.changePct}% 偏弱，避免接刀`);
  if (candidate.marginSafetyLevel === "危險" || candidate.leverageRiskLevel === "極高") reasons.push("融資或槓桿風險過高");
  if (candidate.overnightProbability >= 68) reasons.push(`隔日沖可能 ${candidate.overnightProbability}% 過高`);
  if (tradedSymbolRecently(state, candidate.symbol, tradingDate)) reasons.push(`近 ${SYMBOL_COOLDOWN_DAYS} 天已賣出或禁止賣出過，先冷卻`);

  return {
    ok: reasons.length === 0,
    reason: reasons.join("；") || "通過自動交易風控閘門"
  };
}

function appendDecision(state: AutoTraderState, decision: Omit<DecisionRecord, "id" | "createdAt" | "tradingDate">, tradingDate: string) {
  state.decisions = [
    { ...decision, id: id("decision"), createdAt: nowIso(), tradingDate },
    ...state.decisions
  ].slice(0, 240);
}

function appendTrade(state: AutoTraderState, trade: Omit<TradeRecord, "id" | "createdAt" | "tradingDate">, tradingDate: string) {
  state.trades = [
    { ...trade, id: id("trade"), createdAt: nowIso(), tradingDate },
    ...state.trades
  ].slice(0, 240);
}

function snapshot(state: AutoTraderState, tradingDate: string) {
  const positionValue = state.positions.reduce((sum, position) => sum + position.lastValue, 0);
  state.equity = [
    {
      id: id("equity"),
      createdAt: nowIso(),
      tradingDate,
      cash: state.cash,
      positionValue,
      totalEquity: state.cash + positionValue,
      realizedPnl: state.realizedPnl
    },
    ...state.equity
  ].slice(0, 120);
}

export function AutoTraderClient() {
  const [state, setState] = useState<AutoTraderState>(emptyState());
  const [loading, setLoading] = useState(false);
  const [autoRun, setAutoRun] = useState(false);
  const [status, setStatus] = useState("背景 AI 機器人已設定為 GitHub Actions 自動排程，正在等待讀取雲端紀錄。");
  const [error, setError] = useState("");
  const [cloudSource, setCloudSource] = useState<CloudStateResponse["source"]>("not_started");
  const [lastCloudLoadAt, setLastCloudLoadAt] = useState("");

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    try {
      if (stored) {
        const parsed = JSON.parse(stored) as AutoTraderState;
        if (parsed.initialCapital === INITIAL_CAPITAL && typeof parsed.cash === "number") setState(normalizeState(parsed));
      }
    } catch {
      window.localStorage.removeItem(STORAGE_KEY);
    }
    void loadCloudState();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  useEffect(() => {
    if (!autoRun) return;
    const timer = window.setInterval(() => void loadCloudState(), PAGE_REFRESH_INTERVAL_MS);
    return () => window.clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoRun]);

  const summary = useMemo(() => {
    const positionValue = state.positions.reduce((sum, position) => sum + position.lastValue, 0);
    const totalEquity = state.cash + positionValue;
    const totalPnl = totalEquity - state.initialCapital;
    const totalPnlPct = (totalPnl / state.initialCapital) * 100;
    return { positionValue, totalEquity, totalPnl, totalPnlPct };
  }, [state]);

  async function loadCloudState() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/auto-trader/state", { cache: "no-store" });
      const payload = (await response.json()) as CloudStateResponse;
      if (!response.ok) throw new Error(payload.message || "雲端紀錄讀取失敗");
      setCloudSource(payload.source);
      setLastCloudLoadAt(nowIso());
      const nextState = normalizeState(payload.state);
      setState(nextState);
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextState));
      setStatus(payload.message);
    } catch (cloudError) {
      const message = cloudError instanceof Error ? cloudError.message : "雲端紀錄讀取失敗";
      setError(message);
      setStatus("雲端紀錄讀取失敗，暫時顯示本機快取。");
    } finally {
      setLoading(false);
    }
  }

  async function runAiCycle(source: "manual" | "auto" = "manual") {
    if (loading) return;
    setLoading(true);
    setError("");
    setStatus(source === "auto" ? "AI 自動檢查中：更新持股與尋找新標的。" : "AI 執行中：使用真實行情分析持股與全市場候選。");
    const tradingDate = tradingDateNow();

    try {
      const next = normalizeState(JSON.parse(JSON.stringify(state)) as AutoTraderState);
      next.lastRunAt = nowIso();
      next.strategyVersion = STRATEGY_VERSION;

      const markedPositions: AutoPosition[] = [];
      for (const position of next.positions) {
        try {
          const analysis = await fetchAnalysis(position.symbol);
          const marked = markPosition(position, analysis);
          const sellSignal = shouldSell(marked, analysis, next, tradingDate);

          if (sellSignal.sell) {
            if (!canSellToday(position, tradingDate)) {
              markedPositions.push(marked);
              appendTrade(next, {
                side: "BLOCKED_SELL",
                symbol: position.symbol,
                name: position.name,
                price: analysis.price,
                shares: 0,
                amount: 0,
                cashAfter: next.cash,
                reason: `禁止當沖：${sellSignal.reason}。今天買進的股票不可今天賣出，延到下一個交易日再檢查。`,
                source: "real-time-analysis",
                positionId: position.id
              }, tradingDate);
              appendDecision(next, {
                symbol: position.symbol,
                name: position.name,
                decision: "禁止當沖，暫不賣",
                reason: sellSignal.reason,
                finalScore: analysis.finalScore,
                tradeStyle: analysis.tradeProfile.style,
                automationAction: analysis.tradeProfile.automationAction
              }, tradingDate);
              continue;
            }

            const sellShares = sellSignal.partial ? Math.max(1, Math.floor(marked.shares / 2)) : marked.shares;
            const sellAmount = sellShares * analysis.price;
            next.cash += sellAmount;
            const costBasis = marked.entryPrice * sellShares;
            const realizedPnl = sellAmount - costBasis;
            const realizedPnlPct = costBasis > 0 ? (realizedPnl / costBasis) * 100 : 0;
            next.realizedPnl += realizedPnl;

            appendTrade(next, {
              side: sellSignal.partial ? "PARTIAL_SELL" : "SELL",
              symbol: position.symbol,
              name: position.name,
              price: analysis.price,
              shares: sellShares,
              amount: sellAmount,
              costBasis,
              realizedPnl,
              realizedPnlPct,
              cashAfter: next.cash,
              reason: sellSignal.reason,
              source: "real-time-analysis",
              positionId: position.id
            }, tradingDate);
            appendDecision(next, {
              symbol: position.symbol,
              name: position.name,
              decision: sellSignal.partial ? "部分賣出" : "賣出",
              reason: sellSignal.reason,
              finalScore: analysis.finalScore,
              tradeStyle: analysis.tradeProfile.style,
              automationAction: analysis.tradeProfile.automationAction
            }, tradingDate);

            if (sellShares < marked.shares) {
              const remainingShares = marked.shares - sellShares;
              markedPositions.push({
                ...marked,
                shares: remainingShares,
                entryAmount: remainingShares * marked.entryPrice,
                lastValue: remainingShares * analysis.price,
                unrealizedPnl: remainingShares * (analysis.price - marked.entryPrice),
                unrealizedPnlPct: ((analysis.price - marked.entryPrice) / marked.entryPrice) * 100
              });
            }
          } else {
            markedPositions.push(marked);
            appendDecision(next, {
              symbol: position.symbol,
              name: position.name,
              decision: "續抱",
              reason: sellSignal.reason,
              finalScore: analysis.finalScore,
              tradeStyle: analysis.tradeProfile.style,
              automationAction: analysis.tradeProfile.automationAction
            }, tradingDate);
          }
        } catch (positionError) {
          markedPositions.push(position);
          appendDecision(next, {
            symbol: position.symbol,
            name: position.name,
            decision: "持股更新失敗",
            reason: positionError instanceof Error ? positionError.message : "持股分析失敗"
          }, tradingDate);
        }
      }

      next.positions = markedPositions;

      if (next.positions.length < MAX_POSITIONS && next.cash > CASH_RESERVE + 1_000) {
        const report = await fetchRecommendations();
        const rejectedCandidates: Array<{ item: StockRecommendation; reason: string }> = [];
        const candidates = report.recommendations.filter((item) => {
          if (item.price <= 0 || next.positions.some((position) => position.symbol === item.symbol) || tradedSymbolToday(next, item.symbol, tradingDate)) return false;
          const gate = candidatePassesRiskGate(item, next, tradingDate);
          if (!gate.ok) rejectedCandidates.push({ item, reason: gate.reason });
          return gate.ok;
        });

        if (rejectedCandidates.length) {
          appendDecision(next, {
            symbol: "RISK-GATE",
            name: "自動交易風控",
            decision: "過濾候選",
            reason: rejectedCandidates.slice(0, 5).map(({ item, reason }) => `${item.symbol} ${item.name}：${reason}`).join(" / ")
          }, tradingDate);
        }

        for (const candidate of candidates) {
          if (next.positions.length >= MAX_POSITIONS) break;
          if (dailyBuyCount(next, tradingDate) >= MAX_DAILY_NEW_BUYS) {
            appendDecision(next, {
              symbol: "RISK-GATE",
              name: "每日買進上限",
              decision: "暫停買入",
              reason: `今日已買進 ${MAX_DAILY_NEW_BUYS} 檔，避免同一天行情誤判時一起套住。`
            }, tradingDate);
            break;
          }

          const maxAmountByType = candidate.recommendation === "買入候選" ? 24_000 : 10_000;
          const targetPct = clamp(candidate.positionSizePct || 10, 6, candidate.recommendation === "買入候選" ? 24 : 10);
          const targetAmount = Math.min(next.cash - CASH_RESERVE, maxAmountByType, next.initialCapital * (targetPct / 100));
          const shares = Math.floor(targetAmount / candidate.price);

          if (shares < 1 || targetAmount <= 0) {
            appendDecision(next, {
              symbol: candidate.symbol,
              name: candidate.name,
              decision: "資金不足略過",
              reason: `可用現金 ${twd(next.cash)}，候選股現價 ${price(candidate.price)}。`
            }, tradingDate);
            continue;
          }

          const buyAmount = shares * candidate.price;
          next.cash -= buyAmount;
          const position: AutoPosition = {
            id: id("position"),
            symbol: candidate.symbol,
            name: candidate.name,
            shares,
            entryPrice: candidate.price,
            entryAmount: buyAmount,
            stopLossPrice: candidate.stopLossPrice,
            takeProfit1: candidate.takeProfit1,
            takeProfit2: candidate.takeProfit2,
            openedAt: nowIso(),
            openedTradingDate: tradingDate,
            tradeStyle: candidate.tradeStyle,
            automationAction: candidate.automationAction,
            positionSizePct: candidate.positionSizePct,
            lastPrice: candidate.price,
            lastValue: buyAmount,
            unrealizedPnl: 0,
            unrealizedPnlPct: 0,
            lastAnalysisAt: nowIso()
          };

          next.positions.push(position);
          appendTrade(next, {
            side: "BUY",
            symbol: candidate.symbol,
            name: candidate.name,
            price: candidate.price,
            shares,
            amount: buyAmount,
            cashAfter: next.cash,
            reason: `${candidate.recommendation}，${candidate.tradeStyle}/${candidate.tradeMode}，AI 動作 ${candidate.automationAction}，3-5 天上漲機率 ${candidate.probabilityUp3To5}%，風控版 ${STRATEGY_VERSION}。`,
            source: report.source,
            positionId: position.id
          }, tradingDate);
          appendDecision(next, {
            symbol: candidate.symbol,
            name: candidate.name,
            decision: "買進",
            reason: candidate.entryPlan,
            finalScore: candidate.finalScore,
            tradeStyle: candidate.tradeStyle,
            automationAction: candidate.automationAction
          }, tradingDate);
        }

        if (!candidates.length) {
          appendDecision(next, {
            symbol: "MARKET",
            name: "全市場",
            decision: "沒有買入",
            reason: "全市場推薦清單沒有同時符合買入候選/可小量試單、AI 可開倉/小量試單與禁當沖限制。"
          }, tradingDate);
        }
      } else {
        appendDecision(next, {
          symbol: "CASH",
          name: "資金控管",
          decision: "暫停買入",
          reason: next.positions.length >= MAX_POSITIONS ? `已持有 ${MAX_POSITIONS} 檔，避免過度分散。` : `現金需保留至少 ${twd(CASH_RESERVE)}。`
        }, tradingDate);
      }

      snapshot(next, tradingDate);
      setState(next);
      setStatus(`AI 已完成一輪：持股 ${next.positions.length} 檔，現金 ${twd(next.cash)}，總資產 ${twd(next.cash + next.positions.reduce((sum, position) => sum + position.lastValue, 0))}。`);
    } catch (cycleError) {
      const message = cycleError instanceof Error ? cycleError.message : "AI 模擬交易執行失敗";
      setError(message);
      setStatus("AI 執行失敗，請稍後重試。");
    } finally {
      setLoading(false);
    }
  }

  function resetTrader() {
    const next = emptyState();
    setState(next);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    setStatus("已清除本機快取；下一次重新讀取會抓回 GitHub Actions 雲端交易紀錄。");
  }

  function exportRecords() {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `ai-auto-trader-${tradingDateNow()}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <section className="glass rounded-3xl p-5">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm text-blue-300">AI Paper Trading</p>
            <h1 className="mt-1 flex items-center gap-3 text-3xl font-black text-white">
              <Bot className="h-8 w-8 text-blue-300" />
              AI 全自動模擬交易
            </h1>
            <p className="mt-3 max-w-4xl text-sm leading-6 text-slate-300">
              初始虛擬資金 100,000 元。AI 會用真實台股行情、推薦雷達與單股分析 API 自動找股、買進、續抱、減碼或賣出；
              只有買賣進出是模擬，不會送出券商委託。系統嚴格禁止當沖，同一天買進的股票不可同一天賣出，但可隔日沖。
              目前已啟用風控版 {state.strategyVersion || STRATEGY_VERSION}：限制重複減碼、加入硬停損、候選冷卻期與每日買進上限。
            </p>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:w-[420px]">
            <button
              type="button"
              onClick={() => void loadCloudState()}
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 font-black text-white transition hover:bg-blue-500 disabled:opacity-60"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              重新讀取雲端
            </button>
            <button
              type="button"
              onClick={() => setAutoRun((value) => !value)}
              className={`inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3 font-black transition ${
                autoRun ? "bg-emerald-500 text-slate-950 hover:bg-emerald-400" : "border border-slate-700 text-slate-100 hover:bg-slate-800"
              }`}
            >
              <RefreshCw className="h-4 w-4" />
              畫面每 60 秒刷新：{autoRun ? "開" : "關"}
            </button>
            <button
              type="button"
              onClick={exportRecords}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-700 px-5 py-3 font-black text-slate-100 transition hover:bg-slate-800"
            >
              <Download className="h-4 w-4" />
              匯出紀錄
            </button>
            <button
              type="button"
              onClick={resetTrader}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-rose-400/40 px-5 py-3 font-black text-rose-200 transition hover:bg-rose-500/15"
            >
              <RotateCcw className="h-4 w-4" />
              清除本機快取
            </button>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-amber-400/25 bg-amber-400/10 p-4 text-sm leading-6 text-amber-100">
        <p className="font-black text-white">交易規則</p>
        <p className="mt-1">
          背景機器人由 GitHub Actions 在台股盤中自動執行，不需要你停在這個頁面。資料來源必須是真實行情 API；本頁不使用假行情。
          AI 可自行買賣，但同一交易日買進的部位只會記錄「禁止當沖」警示，不會賣出。交易紀錄保存在 GitHub 的
          <span className="font-black text-white"> auto-trader-state </span>資料分支，本頁會讀取那份雲端 JSON。
        </p>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-7">
        <MetricCard label="總資產" value={twd(summary.totalEquity)} sub={`損益 ${pct(summary.totalPnlPct)}`} tone={summary.totalPnl >= 0 ? "bull" : "bear"} />
        <MetricCard label="現金" value={twd(state.cash)} sub={`保留 ${twd(CASH_RESERVE)}`} />
        <MetricCard label="持股市值" value={twd(summary.positionValue)} sub={`${state.positions.length}/${MAX_POSITIONS} 檔`} />
        <MetricCard label="已實現損益" value={twd(state.realizedPnl)} tone={state.realizedPnl >= 0 ? "bull" : "bear"} />
        <MetricCard label="風控版本" value="Risk Guard v2" sub={`${state.strategyVersion || STRATEGY_VERSION}，每日最多買 ${MAX_DAILY_NEW_BUYS} 檔`} tone="warn" />
        <MetricCard label="最後執行" value={state.lastRunAt ? new Date(state.lastRunAt).toLocaleTimeString("zh-TW", { hour: "2-digit", minute: "2-digit" }) : "-"} sub={tradingDateNow()} />
        <MetricCard
          label="雲端狀態"
          value={cloudSource === "github-actions" ? "已啟動" : cloudSource === "not_started" ? "等待首跑" : "讀取錯誤"}
          sub={lastCloudLoadAt ? `讀取 ${new Date(lastCloudLoadAt).toLocaleTimeString("zh-TW", { hour: "2-digit", minute: "2-digit" })}` : "尚未讀取"}
          tone={cloudSource === "github-actions" ? "bull" : cloudSource === "not_started" ? "warn" : "bear"}
        />
      </section>

      <section className="rounded-3xl border border-blue-400/20 bg-blue-500/10 p-4 text-sm leading-6 text-blue-100">
        <p className="font-black text-white">狀態</p>
        <p className="mt-1">{status}</p>
        {error ? <p className="mt-2 rounded-2xl bg-rose-500/15 p-3 text-rose-100">{error}</p> : null}
      </section>

      <section className="glass rounded-3xl p-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm text-slate-400">Open Positions</p>
            <h2 className="text-2xl font-black text-white">目前持股</h2>
          </div>
          <Link href="/recommendations" className="text-sm font-bold text-blue-300 hover:text-blue-200">
            查看推薦雷達
          </Link>
        </div>

        {state.positions.length ? (
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            {state.positions.map((position) => (
              <article key={position.id} className="rounded-3xl border border-slate-700/70 bg-slate-950/35 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="text-xl font-black text-white">{position.name}</h3>
                    <p className="text-sm text-slate-400">{position.symbol} · {position.openedTradingDate} 買進</p>
                  </div>
                  <span className={`rounded-2xl px-3 py-1 text-sm font-black ${position.unrealizedPnl >= 0 ? "bg-emerald-400/15 text-emerald-200" : "bg-rose-400/15 text-rose-200"}`}>
                    {pct(position.unrealizedPnlPct)}
                  </span>
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <MetricCard label="股數 / 成本" value={`${position.shares.toLocaleString()} 股`} sub={`${price(position.entryPrice)}，投入 ${twd(position.entryAmount)}`} />
                  <MetricCard label="現價 / 市值" value={price(position.lastPrice)} sub={twd(position.lastValue)} tone={position.unrealizedPnl >= 0 ? "bull" : "bear"} />
                  <MetricCard label="未實現損益" value={twd(position.unrealizedPnl)} sub={pct(position.unrealizedPnlPct)} tone={position.unrealizedPnl >= 0 ? "bull" : "bear"} />
                  <MetricCard label="AI 動作" value={position.automationAction} sub={`${position.tradeStyle}，部位 ${position.positionSizePct}%`} tone={actionTone(position.automationAction)} />
                  <MetricCard label="停損" value={price(position.stopLossPrice)} sub="跌破才可隔日出場" tone="bear" />
                  <MetricCard label="目標" value={`${price(position.takeProfit1)} / ${price(position.takeProfit2)}`} tone="bull" />
                </div>
                <Link href={`/dashboard?symbol=${encodeURIComponent(position.symbol)}`} className="mt-4 block rounded-2xl bg-blue-600 px-4 py-3 text-center font-black text-white transition hover:bg-blue-500">
                  查看完整分析
                </Link>
              </article>
            ))}
          </div>
        ) : (
          <div className="mt-4 rounded-3xl border border-slate-700/70 bg-slate-950/35 p-6 text-slate-300">
            目前雲端機器人沒有持股。GitHub Actions 下一次盤中排程會自動用真實推薦雷達尋找可買或小量試單標的。
          </div>
        )}
      </section>

      <section className="grid gap-4 xl:grid-cols-[1fr_1fr]">
        <div className="glass rounded-3xl p-5">
          <div className="flex items-center gap-2">
            <WalletCards className="h-5 w-5 text-blue-300" />
            <h2 className="text-xl font-black text-white">交易紀錄</h2>
          </div>
          <div className="mt-4 max-h-[520px] space-y-3 overflow-auto pr-1">
            {state.trades.length ? state.trades.map((trade) => {
              const pnlInfo = tradePnlInfo(trade, state);
              return (
                <div key={trade.id} className="rounded-2xl border border-slate-700/70 bg-slate-950/35 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-black text-white">{tradeSideLabel(trade.side)} · {trade.name} <span className="text-sm text-slate-400">{trade.symbol}</span></p>
                    <span className={`rounded-full px-3 py-1 text-xs font-black ${trade.side === "BUY" ? "bg-emerald-400/15 text-emerald-200" : trade.side === "BLOCKED_SELL" ? "bg-amber-400/15 text-amber-200" : "bg-rose-400/15 text-rose-200"}`}>
                      {trade.tradingDate}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-slate-300">
                    {trade.shares ? `${trade.shares.toLocaleString()} 股 × ${price(trade.price)} = ${twd(trade.amount)}` : "無成交"}
                  </p>
                  {pnlInfo ? (
                    <div className={`mt-2 flex flex-wrap items-center gap-2 rounded-2xl border px-3 py-2 text-xs font-black ${tradePnlClass(pnlInfo.pnl)}`}>
                      <span>{pnlInfo.label}</span>
                      <span className="text-sm">{pnlInfo.value}</span>
                      {pnlInfo.percent ? <span>{pnlInfo.percent}</span> : null}
                      {pnlInfo.hint ? <span className="font-medium opacity-75">{pnlInfo.hint}</span> : null}
                    </div>
                  ) : null}
                  <p className="mt-1 text-xs leading-5 text-slate-400">{trade.reason}</p>
                </div>
              );
            }) : <p className="rounded-2xl bg-slate-950/35 p-4 text-slate-400">尚無交易紀錄。</p>}
          </div>
        </div>

        <div className="glass rounded-3xl p-5">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-amber-300" />
            <h2 className="text-xl font-black text-white">AI 決策紀錄</h2>
          </div>
          <div className="mt-4 max-h-[520px] space-y-3 overflow-auto pr-1">
            {state.decisions.length ? state.decisions.map((decision) => (
              <div key={decision.id} className="rounded-2xl border border-slate-700/70 bg-slate-950/35 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-black text-white">{decision.decision} · {decision.name}</p>
                  <span className="text-xs text-slate-500">{decision.tradingDate}</span>
                </div>
                <p className="mt-1 text-sm text-slate-300">{decision.symbol} {decision.finalScore ? `· AI ${decision.finalScore}` : ""} {decision.tradeStyle ? `· ${decision.tradeStyle}` : ""} {decision.automationAction ? `· ${decision.automationAction}` : ""}</p>
                <p className="mt-1 text-xs leading-5 text-slate-400">{decision.reason}</p>
              </div>
            )) : <p className="rounded-2xl bg-slate-950/35 p-4 text-slate-400">尚無決策紀錄。</p>}
          </div>
        </div>
      </section>
    </div>
  );
}
