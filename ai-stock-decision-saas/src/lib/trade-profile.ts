import type { Action, AnalysisResult, TrendStage } from "@/lib/types";

type TradeProfile = AnalysisResult["tradeProfile"];

type BuildTradeProfileInput = {
  price: number;
  support: number;
  stopLoss: number;
  takeProfit1: number;
  takeProfit2: number;
  atr: number;
  atrPct: number;
  ma20: number;
  ma60: number;
  volumeRatio: number;
  finalScore: number;
  technicalScore: number;
  chipScore: number;
  capitalScore: number;
  trendStage: TrendStage;
  action: Action;
  entryLabel: AnalysisResult["entrySignal"]["label"];
  forecast: AnalysisResult["postEntryForecast"];
  marginSafety: AnalysisResult["marginSafety"];
  leverageRisk: AnalysisResult["leverageRisk"];
};

function clamp(value: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

function formatPrice(value: number) {
  return `${value.toFixed(2)} 元`;
}

function formatPct(value: number) {
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
}

function riskRewardOf(input: BuildTradeProfileInput) {
  const risk = Math.max(input.price - input.stopLoss, input.price * 0.01);
  const reward = Math.max(0, input.takeProfit1 - input.price);
  return reward / risk;
}

function supportDistancePct(input: BuildTradeProfileInput) {
  if (!input.support || input.support <= 0) return 99;
  return ((input.price - input.support) / input.support) * 100;
}

function trailingStop(input: BuildTradeProfileInput, multiplier: number, floor?: number) {
  const atr = Math.max(input.atr, input.price * 0.01);
  return Number(Math.max(input.stopLoss, floor ?? 0, input.price - atr * multiplier).toFixed(2));
}

function profile(input: BuildTradeProfileInput, data: Omit<TradeProfile, "suitabilityScore" | "rationale"> & {
  suitabilityScore: number;
  rationale: string[];
}): TradeProfile {
  return {
    ...data,
    suitabilityScore: Math.round(clamp(data.suitabilityScore)),
    positionSizePct: Math.round(clamp(data.positionSizePct, 0, 100)),
    trailingStopPrice: Number(data.trailingStopPrice.toFixed(2))
  };
}

export function buildTradeProfile(input: BuildTradeProfileInput): TradeProfile {
  const rr = riskRewardOf(input);
  const supportDistance = supportDistancePct(input);
  const scoreBlend = input.finalScore * 0.45 + input.technicalScore * 0.25 + input.capitalScore * 0.18 + input.chipScore * 0.12;
  const momentumScore =
    scoreBlend +
    (input.forecast.probabilityUp3To5 - 50) * 0.65 +
    (input.volumeRatio >= 1.25 ? 5 : input.volumeRatio >= 1.05 ? 2 : -1) +
    Math.min(6, Math.max(-4, input.forecast.day5Pct));
  const isDefensiveAction = input.action === "SELL" || input.action === "STOP_LOSS";
  const weakTrend = input.trendStage === "破線" || input.trendStage === "轉弱";
  const leverageDanger = input.marginSafety.level === "危險" || input.leverageRisk.level === "極高";
  const leverageHot =
    input.leverageRisk.level === "高" ||
    input.leverageRisk.dayTradeProbability >= 68 ||
    input.leverageRisk.overnightProbability >= 68;
  const trendUp = input.trendStage === "初升段" || input.trendStage === "主升段" || input.trendStage === "末升段";
  const nearSupport = supportDistance <= 3.5;
  const reliableEntry = input.entryLabel === "應買" || input.entryLabel === "可買";

  if (isDefensiveAction || input.price <= input.stopLoss || input.trendStage === "破線") {
    return profile(input, {
      style: "暫不交易",
      mode: "防守出場",
      automationAction: input.price <= input.stopLoss || input.action === "STOP_LOSS" ? "停損" : "減碼",
      suitabilityScore: 18,
      positionSizePct: 0,
      holdingPeriod: "不開倉，先處理風險",
      entryPlan: "不新增部位，等重新站回 MA20 且量能轉強再評估。",
      exitPlan: `跌破 ${formatPrice(input.stopLoss)} 代表判斷錯誤；若已持有，優先降低風險。`,
      stopPolicy: `收盤跌破 ${formatPrice(input.stopLoss)} 應出場或至少大幅減碼。`,
      trailingStopPrice: Number(input.stopLoss.toFixed(2)),
      reviewFrequency: "盤中每 15 分鐘檢查是否續跌；收盤後重新評估。",
      rationale: [
        `趨勢狀態為 ${input.trendStage}，目前不適合用放寬條件去硬買。`,
        `AI 決策 ${input.action}，停損線 ${formatPrice(input.stopLoss)} 是主要防守線。`,
        `槓桿風險 ${input.leverageRisk.level}，融資安全 ${input.marginSafety.level}。`
      ]
    });
  }

  if (leverageDanger || (weakTrend && input.finalScore < 58)) {
    return profile(input, {
      style: "暫不交易",
      mode: "防守出場",
      automationAction: input.action === "REDUCE" ? "減碼" : "等待",
      suitabilityScore: Math.min(45, momentumScore),
      positionSizePct: input.action === "REDUCE" ? 0 : 10,
      holdingPeriod: "等待風險降溫",
      entryPlan: "融資或槓桿壓力偏高，不追價；只觀察支撐是否有效。",
      exitPlan: `若反彈量縮或跌破 ${formatPrice(input.stopLoss)}，應優先離場。`,
      stopPolicy: `停損線 ${formatPrice(input.stopLoss)} 不可下修。`,
      trailingStopPrice: trailingStop(input, 1.1),
      reviewFrequency: "盤中每 15-30 分鐘檢查去槓桿賣壓。",
      rationale: [
        `融資安全 ${input.marginSafety.level}、槓桿風險 ${input.leverageRisk.level}，不適合重倉。`,
        `當沖可能 ${input.leverageRisk.dayTradeProbability}%，隔日沖可能 ${input.leverageRisk.overnightProbability}%。`,
        `3-5 天上漲機率 ${input.forecast.probabilityUp3To5}%，需要等價格或籌碼重新穩定。`
      ]
    });
  }

  if (
    input.trendStage === "主升段" &&
    input.price > input.ma20 &&
    input.ma20 > input.ma60 &&
    momentumScore >= 68 &&
    input.technicalScore >= 64 &&
    input.chipScore >= 50 &&
    input.forecast.probabilityUp3To5 >= 55 &&
    input.atrPct <= 4.8 &&
    !leverageHot
  ) {
    return profile(input, {
      style: "中線常抱",
      mode: "趨勢續抱",
      automationAction: reliableEntry || input.action === "BUY" ? "可開倉" : "續抱",
      suitabilityScore: momentumScore + 7,
      positionSizePct: reliableEntry ? 55 : 40,
      holdingPeriod: "20-45 個交易日",
      entryPlan: nearSupport
        ? `可在 ${formatPrice(input.support)} 附近分批，或等回測 MA20 不破再加碼。`
        : "不追高滿倉，等回測 MA20、VWAP 或箱型支撐再分批。",
      exitPlan: `第一目標 ${formatPrice(input.takeProfit1)} 先檢查量價，第二目標 ${formatPrice(input.takeProfit2)} 分批獲利。`,
      stopPolicy: `以 MA20 下方與 ATR 防守，移動停利參考 ${formatPrice(trailingStop(input, 2.4, input.ma20 - input.atr * 0.8))}。`,
      trailingStopPrice: trailingStop(input, 2.4, input.ma20 - input.atr * 0.8),
      reviewFrequency: "每日收盤檢查即可；盤中只看跌破防守線或爆量轉弱。",
      rationale: [
        `趨勢為 ${input.trendStage}，價格在 MA20/MA60 之上，較適合趨勢持有。`,
        `AI 分數 ${Math.round(input.finalScore)}，3-5 天上漲機率 ${input.forecast.probabilityUp3To5}%。`,
        `ATR 波動 ${input.atrPct.toFixed(2)}%，目前沒有過熱到只能短打。`,
        `融資安全 ${input.marginSafety.level}、槓桿風險 ${input.leverageRisk.level}。`
      ]
    });
  }

  if (
    trendUp &&
    momentumScore >= 56 &&
    input.forecast.probabilityUp3To5 >= 51 &&
    rr >= 0.75 &&
    input.technicalScore >= 54 &&
    input.action !== "REDUCE"
  ) {
    const mode = nearSupport ? "支撐低接" : input.volumeRatio >= 1.2 || reliableEntry ? "突破追價" : "趨勢續抱";
    const automationAction =
      reliableEntry && rr >= 0.95
        ? "可開倉"
        : input.entryLabel === "小量試單" || nearSupport || input.forecast.probabilityUp3To5 >= 54
          ? "小量試單"
          : "等待";

    return profile(input, {
      style: "波段持有",
      mode,
      automationAction,
      suitabilityScore: momentumScore + (rr >= 1 ? 4 : 0),
      positionSizePct: automationAction === "可開倉" ? 35 : automationAction === "小量試單" ? 20 : 0,
      holdingPeriod: "5-20 個交易日",
      entryPlan:
        mode === "支撐低接"
          ? `靠近支撐 ${formatPrice(input.support)} 可分批，不追高。`
          : `突破量能需維持 1.2 倍以上；若無量，等回測 ${formatPrice(input.support)}。`,
      exitPlan: `第一目標 ${formatPrice(input.takeProfit1)} 先賣 1/3 到 1/2，第二目標 ${formatPrice(input.takeProfit2)} 再分批。`,
      stopPolicy: `收盤跌破 ${formatPrice(input.stopLoss)} 或跌破 MA20 後無法收回，應降低部位。`,
      trailingStopPrice: trailingStop(input, 1.8, input.ma20 - input.atr * 0.5),
      reviewFrequency: "每日收盤檢查；盤中留意爆量長黑、跌破支撐或量縮突破失敗。",
      rationale: [
        `較適合 ${mode} 的波段交易，不是無條件買進。`,
        `報酬風險比約 1 : ${rr.toFixed(2)}，3-5 天預估 ${formatPct(input.forecast.day5Pct)}。`,
        `量能為 20 日均量 ${input.volumeRatio.toFixed(2)} 倍，交易狀態比單純分數更重要。`,
        `當沖可能 ${input.leverageRisk.dayTradeProbability}%，隔日沖可能 ${input.leverageRisk.overnightProbability}%。`
      ]
    });
  }

  if (
    input.finalScore >= 48 &&
    input.forecast.probabilityUp3To5 >= 48 &&
    (input.atrPct >= 3.2 || input.volumeRatio >= 1.18 || leverageHot || input.trendStage === "末升段") &&
    !weakTrend
  ) {
    return profile(input, {
      style: "短進短出",
      mode: input.volumeRatio >= 1.25 ? "強勢動能" : "區間等待",
      automationAction: rr >= 0.7 && input.price > input.stopLoss ? "小量試單" : "等待",
      suitabilityScore: momentumScore,
      positionSizePct: rr >= 0.7 ? 12 : 0,
      holdingPeriod: "1-5 個交易日",
      entryPlan: "只適合小部位短打，買點要靠近支撐或突破當下，不適合追高長抱。",
      exitPlan: `短線目標先看 ${formatPrice(input.takeProfit1)}；若隔日開高無量，先減碼。`,
      stopPolicy: `短線停損要更緊，收盤或盤中跌破 ${formatPrice(input.stopLoss)} 就不戀戰。`,
      trailingStopPrice: trailingStop(input, 1.05),
      reviewFrequency: "盤中每 15-30 分鐘檢查量價，隔日一定重新判斷。",
      rationale: [
        `波動 ${input.atrPct.toFixed(2)}%、量能 ${input.volumeRatio.toFixed(2)} 倍，較像短線交易盤。`,
        `當沖可能 ${input.leverageRisk.dayTradeProbability}%，隔日沖可能 ${input.leverageRisk.overnightProbability}%，不適合放著不看。`,
        `AI 分數 ${Math.round(input.finalScore)}，只能小量試單或等待明確突破。`
      ]
    });
  }

  return profile(input, {
    style: "暫不交易",
    mode: "區間等待",
    automationAction: "等待",
    suitabilityScore: Math.min(52, momentumScore),
    positionSizePct: 0,
    holdingPeriod: "等待訊號",
    entryPlan: `等價格接近支撐 ${formatPrice(input.support)}、重新站回 MA20，或突破帶量再評估。`,
    exitPlan: `若已持有，第一壓力 ${formatPrice(input.takeProfit1)} 附近先檢查是否減碼。`,
    stopPolicy: `停損線 ${formatPrice(input.stopLoss)} 不下修，跌破代表交易假設失效。`,
    trailingStopPrice: trailingStop(input, 1.3),
    reviewFrequency: "每日收盤檢查即可，未觸發條件前不急著出手。",
    rationale: [
      `目前分數、量能、價格位置尚未形成足夠交易狀態。`,
      `不是永久不能買，而是等待支撐低接或突破追價其中一個條件成立。`,
      `3-5 天上漲機率 ${input.forecast.probabilityUp3To5}%，報酬風險比約 1 : ${rr.toFixed(2)}。`
    ]
  });
}
