const INITIAL_CAPITAL = 100_000;
const MAX_POSITIONS = 4;
const CASH_RESERVE = 5_000;
const STRATEGY_VERSION = "risk-guard-v2-2026-08-13";
const MAX_DAILY_NEW_BUYS = 2;
const MIN_POSITION_VALUE = 3_000;
const SYMBOL_COOLDOWN_DAYS = 3;
const MAX_LOSS_SHORT_PCT = 4.5;
const MAX_LOSS_SWING_PCT = 6.5;
const BASE_URL = process.env.AUTO_TRADER_BASE_URL || "https://ai-stock-decision-saas.vercel.app";
const STATE_BRANCH = process.env.AUTO_TRADER_STATE_BRANCH || "auto-trader-state";
const STATE_FILE = process.env.AUTO_TRADER_STATE_FILE || "auto-trader/state.json";
const REPOSITORY = process.env.GITHUB_REPOSITORY;
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_SHA = process.env.GITHUB_SHA;

function emptyState() {
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

function normalizeState(state) {
  const base = emptyState();
  const normalized = {
    ...base,
    ...(state || {}),
    positions: Array.isArray(state?.positions) ? state.positions : [],
    trades: Array.isArray(state?.trades) ? state.trades : [],
    decisions: Array.isArray(state?.decisions) ? state.decisions : [],
    equity: Array.isArray(state?.equity) ? state.equity : [],
    lastRunAt: typeof state?.lastRunAt === "string" ? state.lastRunAt : "",
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

function id(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function twd(value) {
  if (!Number.isFinite(value)) return "-";
  return `${Math.round(value).toLocaleString()} 元`;
}

function formatPrice(value) {
  if (!Number.isFinite(value)) return "-";
  return `${value.toFixed(2)} 元`;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function canSellToday(position, tradingDate) {
  return position.openedTradingDate !== tradingDate;
}

function tradedSymbolToday(state, symbol, tradingDate) {
  return state.trades.some(
    (trade) =>
      trade.symbol === symbol &&
      trade.tradingDate === tradingDate &&
      (trade.side === "BUY" || trade.side === "SELL" || trade.side === "PARTIAL_SELL")
  );
}

async function fetchJson(url, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.timeoutMs || 120_000);
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        "User-Agent": "ai-stock-auto-trader",
        ...(options.headers || {})
      }
    });
    const text = await response.text();
    const payload = text ? JSON.parse(text) : null;
    if (!response.ok) throw new Error(payload?.error || payload?.message || `${response.status} ${response.statusText}`);
    return payload;
  } finally {
    clearTimeout(timer);
  }
}

async function fetchAnalysis(symbol) {
  return fetchJson(`${BASE_URL}/api/analysis/${encodeURIComponent(symbol)}`, { timeoutMs: 90_000 });
}

async function fetchRecommendations() {
  return fetchJson(`${BASE_URL}/api/recommendations?scanLimit=48&limit=30`, { timeoutMs: 180_000 });
}

function markPosition(position, analysis) {
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

function positionPnlPct(position, price = position.lastPrice) {
  if (!position.entryPrice || position.entryPrice <= 0) return 0;
  return ((price - position.entryPrice) / position.entryPrice) * 100;
}

function hardStopPrice(position) {
  const maxLossPct = position.tradeStyle === "短進短出" ? MAX_LOSS_SHORT_PCT : MAX_LOSS_SWING_PCT;
  return position.entryPrice * (1 - maxLossPct / 100);
}

function tradeDateValue(date) {
  const parsed = Date.parse(`${date}T00:00:00+08:00`);
  return Number.isFinite(parsed) ? parsed : 0;
}

function daysBetween(laterDate, earlierDate) {
  const later = tradeDateValue(laterDate);
  const earlier = tradeDateValue(earlierDate);
  if (!later || !earlier) return 999;
  return Math.floor((later - earlier) / 86_400_000);
}

function tradedSymbolRecently(state, symbol, tradingDate, days = SYMBOL_COOLDOWN_DAYS) {
  return state.trades.some((trade) => {
    if (trade.symbol !== symbol) return false;
    if (!(trade.side === "SELL" || trade.side === "PARTIAL_SELL" || trade.side === "BLOCKED_SELL")) return false;
    const gap = daysBetween(tradingDate, trade.tradingDate);
    return gap >= 0 && gap <= days;
  });
}

function partialSoldToday(state, position, tradingDate) {
  return state.trades.some((trade) =>
    trade.positionId === position.id &&
    trade.tradingDate === tradingDate &&
    trade.side === "PARTIAL_SELL"
  );
}

function dailyBuyCount(state, tradingDate) {
  return state.trades.filter((trade) => trade.tradingDate === tradingDate && trade.side === "BUY").length;
}

function shouldSell(position, analysis, state, tradingDate) {
  const pnlPct = positionPnlPct(position, analysis.price);
  const stop = Math.max(position.stopLossPrice, analysis.stopLossPrice, hardStopPrice(position));

  if (analysis.price <= stop) {
    return { sell: true, partial: false, reason: `現價跌破停損線 ${formatPrice(stop)}` };
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
    return { sell: true, partial: false, reason: `已達第二目標 ${formatPrice(analysis.takeProfit2)}` };
  }
  if (analysis.tradeProfile.automationAction === "減碼" || analysis.postEntryForecast.positionAdvice === "減碼") {
    if (position.lastValue < MIN_POSITION_VALUE || position.shares <= 2) {
      return { sell: true, partial: false, reason: `剩餘部位低於 ${twd(MIN_POSITION_VALUE)}，不再零碎減碼，直接結束交易。` };
    }
    if (partialSoldToday(state, position, tradingDate)) {
      return { sell: false, partial: false, reason: "今日已執行過一次減碼，避免 GitHub Actions 盤中重複賣一半。" };
    }
    return { sell: true, partial: true, reason: `AI 顯示減碼訊號：${analysis.tradeProfile.exitPlan}` };
  }
  if (analysis.price >= analysis.takeProfit1 && analysis.tradeProfile.style === "短進短出") {
    if (partialSoldToday(state, position, tradingDate)) {
      return { sell: false, partial: false, reason: "今日已達短線目標並減碼過一次，剩餘部位留到下一輪交易日再判斷。" };
    }
    return { sell: true, partial: true, reason: `短線標的已達第一目標 ${formatPrice(analysis.takeProfit1)}，先鎖定部分獲利` };
  }
  return { sell: false, partial: false, reason: analysis.tradeProfile.stopPolicy };
}

function candidatePassesRiskGate(candidate, state, tradingDate) {
  const reasons = [];
  const isBuyCandidate = candidate.recommendation === "買入候選";
  const isTrial = candidate.recommendation === "可小量試單";

  if (!(isBuyCandidate || isTrial)) reasons.push(`推薦等級為 ${candidate.recommendation}`);
  if (!(candidate.automationAction === "可開倉" || candidate.automationAction === "小量試單")) reasons.push(`AI 動作為 ${candidate.automationAction}`);
  if (candidate.tradeMode === "區間等待") reasons.push("交易模式仍是區間等待，機器人不主動買入等待型訊號");
  if (candidate.tradeStyle === "短進短出" && candidate.tradeMode !== "強勢動能" && candidate.tradeMode !== "支撐低接") {
    reasons.push(`短線模式 ${candidate.tradeMode} 不夠明確`);
  }
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

function appendDecision(state, decision, tradingDate) {
  state.decisions = [
    { ...decision, id: id("decision"), createdAt: nowIso(), tradingDate },
    ...state.decisions
  ].slice(0, 500);
}

function appendTrade(state, trade, tradingDate) {
  const duplicateBlocked =
    trade.side === "BLOCKED_SELL" &&
    state.trades.some(
      (existing) =>
        existing.side === "BLOCKED_SELL" &&
        existing.symbol === trade.symbol &&
        existing.tradingDate === tradingDate &&
        existing.reason === trade.reason
    );
  if (duplicateBlocked) return;

  state.trades = [
    { ...trade, id: id("trade"), createdAt: nowIso(), tradingDate },
    ...state.trades
  ].slice(0, 500);
}

function snapshot(state, tradingDate) {
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
  ].slice(0, 260);
}

async function githubApi(path, options = {}) {
  if (!REPOSITORY || !GITHUB_TOKEN) throw new Error("Missing GitHub Actions repository/token context.");
  return fetchJson(`https://api.github.com/repos/${REPOSITORY}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      ...(options.headers || {})
    }
  });
}

function isGitHubNotFound(error) {
  const message = String(error?.message || "");
  return message.includes("404") || message.toLowerCase().includes("not found");
}

async function ensureStateBranch() {
  try {
    await githubApi(`/git/ref/heads/${STATE_BRANCH}`);
    return;
  } catch (error) {
    if (!isGitHubNotFound(error)) throw error;
  }

  if (!GITHUB_SHA) throw new Error("Missing GITHUB_SHA for creating state branch.");
  await githubApi("/git/refs", {
    method: "POST",
    body: JSON.stringify({
      ref: `refs/heads/${STATE_BRANCH}`,
      sha: GITHUB_SHA
    })
  });
}

async function loadStateFromGitHub() {
  await ensureStateBranch();
  try {
    const encodedPath = STATE_FILE.split("/").map(encodeURIComponent).join("/");
    const file = await githubApi(`/contents/${encodedPath}?ref=${encodeURIComponent(STATE_BRANCH)}`);
    const json = Buffer.from(file.content || "", "base64").toString("utf8");
    return {
      state: normalizeState(JSON.parse(json)),
      sha: file.sha
    };
  } catch (error) {
    if (!isGitHubNotFound(error)) throw error;
    return { state: emptyState(), sha: undefined };
  }
}

async function saveStateToGitHub(state, sha) {
  const encodedPath = STATE_FILE.split("/").map(encodeURIComponent).join("/");
  const content = Buffer.from(`${JSON.stringify(state, null, 2)}\n`, "utf8").toString("base64");
  const totalEquity = state.cash + state.positions.reduce((sum, position) => sum + position.lastValue, 0);
  const message = `chore(auto-trader): ${state.positions.length} positions, equity ${Math.round(totalEquity).toLocaleString()} TWD`;

  await githubApi(`/contents/${encodedPath}`, {
    method: "PUT",
    body: JSON.stringify({
      message,
      content,
      branch: STATE_BRANCH,
      sha
    })
  });
}

async function runCycle(state) {
  state = normalizeState(state);
  const tradingDate = tradingDateNow();
  state.lastRunAt = nowIso();
  state.strategyVersion = STRATEGY_VERSION;

  const markedPositions = [];
  for (const position of state.positions) {
    try {
      const analysis = await fetchAnalysis(position.symbol);
      const marked = markPosition(position, analysis);
      const signal = shouldSell(marked, analysis, state, tradingDate);

      if (signal.sell) {
        if (!canSellToday(position, tradingDate)) {
          markedPositions.push(marked);
          appendTrade(state, {
            side: "BLOCKED_SELL",
            symbol: position.symbol,
            name: position.name,
            price: analysis.price,
            shares: 0,
            amount: 0,
            cashAfter: state.cash,
            reason: `禁止當沖：${signal.reason}。今天買進的股票不可今天賣出，延到下一個交易日再檢查。`,
            source: "github-actions-real-time-analysis",
            positionId: position.id
          }, tradingDate);
          appendDecision(state, {
            symbol: position.symbol,
            name: position.name,
            decision: "禁止當沖，暫不賣",
            reason: signal.reason,
            finalScore: analysis.finalScore,
            tradeStyle: analysis.tradeProfile.style,
            automationAction: analysis.tradeProfile.automationAction
          }, tradingDate);
          continue;
        }

        const sellShares = signal.partial ? Math.max(1, Math.floor(marked.shares / 2)) : marked.shares;
        const sellAmount = sellShares * analysis.price;
        const costBasis = marked.entryPrice * sellShares;
        const realizedPnl = sellAmount - costBasis;
        const realizedPnlPct = costBasis > 0 ? (realizedPnl / costBasis) * 100 : 0;
        state.cash += sellAmount;
        state.realizedPnl += realizedPnl;

        appendTrade(state, {
          side: signal.partial ? "PARTIAL_SELL" : "SELL",
          symbol: position.symbol,
          name: position.name,
          price: analysis.price,
          shares: sellShares,
          amount: sellAmount,
          costBasis,
          realizedPnl,
          realizedPnlPct,
          cashAfter: state.cash,
          reason: signal.reason,
          source: "github-actions-real-time-analysis",
          positionId: position.id
        }, tradingDate);
        appendDecision(state, {
          symbol: position.symbol,
          name: position.name,
          decision: signal.partial ? "部分賣出" : "賣出",
          reason: signal.reason,
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
        appendDecision(state, {
          symbol: position.symbol,
          name: position.name,
          decision: "續抱",
          reason: signal.reason,
          finalScore: analysis.finalScore,
          tradeStyle: analysis.tradeProfile.style,
          automationAction: analysis.tradeProfile.automationAction
        }, tradingDate);
      }
    } catch (error) {
      markedPositions.push(position);
      appendDecision(state, {
        symbol: position.symbol,
        name: position.name,
        decision: "持股更新失敗",
        reason: error instanceof Error ? error.message : "持股分析失敗"
      }, tradingDate);
    }
  }

  state.positions = markedPositions;

  if (state.positions.length < MAX_POSITIONS && state.cash > CASH_RESERVE + 1_000) {
    let report = null;
    try {
      report = await fetchRecommendations();
    } catch (error) {
      appendDecision(state, {
        symbol: "MARKET",
        name: "全市場",
        decision: "推薦雷達失敗",
        reason: error instanceof Error ? error.message : "推薦清單取得失敗"
      }, tradingDate);
    }

    const rejectedCandidates = [];
    const candidates = (report?.recommendations || []).filter((item) => {
      if (item.price <= 0 || state.positions.some((position) => position.symbol === item.symbol) || tradedSymbolToday(state, item.symbol, tradingDate)) return false;
      const gate = candidatePassesRiskGate(item, state, tradingDate);
      if (!gate.ok) rejectedCandidates.push({ item, reason: gate.reason });
      return gate.ok;
    });

    if (rejectedCandidates.length) {
      appendDecision(state, {
        symbol: "RISK-GATE",
        name: "自動交易風控",
        decision: "過濾候選",
        reason: rejectedCandidates.slice(0, 5).map(({ item, reason }) => `${item.symbol} ${item.name}：${reason}`).join(" / ")
      }, tradingDate);
    }

    for (const candidate of candidates) {
      if (state.positions.length >= MAX_POSITIONS) break;
      if (dailyBuyCount(state, tradingDate) >= MAX_DAILY_NEW_BUYS) {
        appendDecision(state, {
          symbol: "RISK-GATE",
          name: "每日買進上限",
          decision: "暫停買入",
          reason: `今日已買進 ${MAX_DAILY_NEW_BUYS} 檔，避免同一天行情誤判時一起套住。`
        }, tradingDate);
        break;
      }

      const maxAmountByType = candidate.recommendation === "買入候選" ? 24_000 : 10_000;
      const targetPct = clamp(candidate.positionSizePct || 10, 6, candidate.recommendation === "買入候選" ? 24 : 10);
      const targetAmount = Math.min(state.cash - CASH_RESERVE, maxAmountByType, state.initialCapital * (targetPct / 100));
      const shares = Math.floor(targetAmount / candidate.price);

      if (shares < 1 || targetAmount <= 0) {
        appendDecision(state, {
          symbol: candidate.symbol,
          name: candidate.name,
          decision: "資金不足略過",
          reason: `可用現金 ${twd(state.cash)}，候選股現價 ${formatPrice(candidate.price)}。`
        }, tradingDate);
        continue;
      }

      const amount = shares * candidate.price;
      state.cash -= amount;
      const position = {
        id: id("position"),
        symbol: candidate.symbol,
        name: candidate.name,
        shares,
        entryPrice: candidate.price,
        entryAmount: amount,
        stopLossPrice: candidate.stopLossPrice,
        takeProfit1: candidate.takeProfit1,
        takeProfit2: candidate.takeProfit2,
        openedAt: nowIso(),
        openedTradingDate: tradingDate,
        tradeStyle: candidate.tradeStyle,
        automationAction: candidate.automationAction,
        positionSizePct: candidate.positionSizePct,
        lastPrice: candidate.price,
        lastValue: amount,
        unrealizedPnl: 0,
        unrealizedPnlPct: 0,
        lastAnalysisAt: nowIso()
      };

      state.positions.push(position);
      appendTrade(state, {
        side: "BUY",
        symbol: candidate.symbol,
        name: candidate.name,
        price: candidate.price,
        shares,
        amount,
        cashAfter: state.cash,
        reason: `${candidate.recommendation}，${candidate.tradeStyle}/${candidate.tradeMode}，AI 動作 ${candidate.automationAction}，3-5 天上漲機率 ${candidate.probabilityUp3To5}%，風控版 ${STRATEGY_VERSION}。`,
        source: report.source,
        positionId: position.id
      }, tradingDate);
      appendDecision(state, {
        symbol: candidate.symbol,
        name: candidate.name,
        decision: "買進",
        reason: candidate.entryPlan,
        finalScore: candidate.finalScore,
        tradeStyle: candidate.tradeStyle,
        automationAction: candidate.automationAction
      }, tradingDate);
    }

    if (!candidates.length && report) {
      appendDecision(state, {
        symbol: "MARKET",
        name: "全市場",
        decision: "沒有買入",
        reason: "全市場推薦清單沒有同時符合買入候選/可小量試單、AI 可開倉/小量試單與禁當沖限制。"
      }, tradingDate);
    }
  } else {
    appendDecision(state, {
      symbol: "CASH",
      name: "資金控管",
      decision: "暫停買入",
      reason: state.positions.length >= MAX_POSITIONS ? `已持有 ${MAX_POSITIONS} 檔，避免過度分散。` : `現金需保留至少 ${twd(CASH_RESERVE)}。`
    }, tradingDate);
  }

  snapshot(state, tradingDate);
  return state;
}

const { state, sha } = await loadStateFromGitHub();
const nextState = await runCycle(state);
await saveStateToGitHub(nextState, sha);

const positionValue = nextState.positions.reduce((sum, position) => sum + position.lastValue, 0);
console.log(JSON.stringify({
  ok: true,
  lastRunAt: nextState.lastRunAt,
  cash: nextState.cash,
  positions: nextState.positions.length,
  totalEquity: nextState.cash + positionValue,
  trades: nextState.trades.length,
  decisions: nextState.decisions.length
}, null, 2));
