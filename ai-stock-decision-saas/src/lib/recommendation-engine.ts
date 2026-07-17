import { runRealFullAnalysis } from "@/lib/real-analysis-engine";
import { loadWholeMarketRecommendationUniverse } from "@/lib/real-data";
import type { Action, AnalysisResult } from "@/lib/types";

export type StockRecommendation = {
  symbol: string;
  name: string;
  price: number;
  changePct: number;
  finalScore: number;
  action: Action;
  recommendation: "買入候選" | "可小量試單" | "接近買點" | "等待回檔" | "暫不買入";
  entryAdvice: AnalysisResult["entrySignal"]["label"];
  entryRule: string;
  marginAmount: number;
  marginUtilizationPct: number;
  marginChange: number;
  marginChangePct: number;
  marginAmountToTurnoverPct: number;
  marginSafetyLevel: AnalysisResult["marginSafety"]["level"];
  marginSafetyScore: number;
  marginSafetySummary: string;
  marginWarningsCount: number;
  leverageRiskLevel: AnalysisResult["leverageRisk"]["level"];
  leverageRiskScore: number;
  dayTradeRisk: AnalysisResult["leverageRisk"]["dayTradeRisk"];
  overnightRisk: AnalysisResult["leverageRisk"]["overnightRisk"];
  confidence: number;
  trendStage: string;
  buyPrice: string;
  idealBuyPrice: string;
  stopLossPrice: number;
  takeProfit1: number;
  takeProfit2: number;
  sellPrice: string;
  riskReward: number;
  holdingPeriod: string;
  probabilityUp3To5: number;
  forecastDay5Pct: number;
  positionAdvice: string;
  reasons: string[];
  rankScore: number;
  warning?: string;
};

export type RecommendationReport = {
  updatedAt: string;
  source: string;
  universeCount: number;
  qualifiedCount: number;
  analysisTargets: number;
  scanned: number;
  success: number;
  failed: number;
  buyCandidates: number;
  recommendations: StockRecommendation[];
  errors: { symbol: string; message: string }[];
};

export const DEFAULT_RECOMMENDATION_CANDIDATES = [
  "8071.TWO",
  "2484.TW",
  "1504.TW",
  "1710.TW",
  "2352.TW",
  "2324.TW",
  "3048.TW",
  "2409.TW",
  "2344.TW",
  "3481.TW",
  "2353.TW",
  "2356.TW",
  "3706.TW",
  "1303.TW",
  "8096.TWO",
  "5443.TWO",
  "2330.TW",
  "2317.TW",
  "2454.TW",
  "2308.TW",
  "2382.TW",
  "3711.TW",
  "2303.TW",
  "2379.TW",
  "3034.TW",
  "2357.TW",
  "3017.TW",
  "3661.TW",
  "6669.TW",
  "3231.TW",
  "3008.TW",
  "4976.TW",
  "5274.TWO",
  "2603.TW",
  "2618.TW",
  "1301.TW",
  "2002.TW",
  "1216.TW",
  "2881.TW",
  "2882.TW",
  "2891.TW"
];

function clamp(value: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

function riskRewardOf(analysis: AnalysisResult) {
  const rawRisk = analysis.price - analysis.stopLossPrice;
  if (rawRisk <= 0) return 0;
  const risk = Math.max(rawRisk, analysis.price * 0.01);
  const reward = Math.max(0, analysis.takeProfit1 - analysis.price);
  return Number((reward / risk).toFixed(2));
}

function buildReasons(analysis: AnalysisResult, riskReward: number) {
  const reasons = [
    ...analysis.explanation.technical.slice(0, 2),
    ...analysis.explanation.capital.slice(0, 1),
    ...analysis.explanation.news.slice(0, 1)
  ];

  reasons.push(
    `3-5 天上漲機率 ${analysis.postEntryForecast.probabilityUp3To5}%，預估第 5 天 ${analysis.postEntryForecast.day5Pct >= 0 ? "+" : ""}${analysis.postEntryForecast.day5Pct.toFixed(2)}%。`
  );
  reasons.push(
    riskReward > 0
      ? `目前報酬風險比約 1 : ${riskReward.toFixed(2)}，停損以 ${analysis.stopLossPrice.toFixed(2)} 元控管。`
      : `現價已低於或貼近停損線 ${analysis.stopLossPrice.toFixed(2)} 元，不列入買入候選。`
  );
  reasons.push(
    `模型校準：近 ${analysis.modelCalibration.sampleSize} 筆樣本 5 日方向正確率 ${analysis.modelCalibration.directionAccuracy5Day}%，平均誤差 ${analysis.modelCalibration.averageForecastErrorPct}%，可靠度 ${analysis.modelCalibration.reliability}。`
  );
  reasons.push(
    `進場建議：${analysis.entrySignal.label}。套用規則：${analysis.entrySignal.rule}，距核心支撐 ${analysis.entrySignal.supportDistancePct.toFixed(2)}%，風險報酬比 1 : ${analysis.entrySignal.riskReward.toFixed(2)}。`
  );
  reasons.push(
    analysis.margin.available
      ? `融資條件：融資餘額 ${analysis.margin.marginBalance.toLocaleString()} 張，估算金額 ${(analysis.margin.marginAmount / 100_000_000).toFixed(2)} 億元，使用率/佔比 ${analysis.margin.marginUtilizationPct.toFixed(2)}%，今日增減 ${analysis.margin.marginChange >= 0 ? "+" : ""}${analysis.margin.marginChange.toLocaleString()} 張。`
      : `融資條件：${analysis.margin.warning}`
  );
  reasons.push(
    `融資水位安全：${analysis.marginSafety.level}（${analysis.marginSafety.score} 分）。${analysis.marginSafety.summary}`
  );
  reasons.push(
    `槓桿與沖銷風險：槓桿 ${analysis.leverageRisk.level}（${analysis.leverageRisk.score} 分），當沖 ${analysis.leverageRisk.dayTradeRisk}，隔日沖 ${analysis.leverageRisk.overnightRisk}。${analysis.leverageRisk.summary}`
  );

  return reasons;
}

function recommendationOf(analysis: AnalysisResult, riskReward: number) {
  const upProbability = analysis.postEntryForecast.probabilityUp3To5;
  const action = analysis.action;
  const blocked = action === "SELL" || action === "STOP_LOSS" || riskReward <= 0 || analysis.price <= analysis.stopLossPrice;
  const weakTrend = analysis.trendStage === "破線" || analysis.trendStage === "轉弱";
  const forecastPositive = analysis.postEntryForecast.day5Pct >= 0;
  const entryLabel = analysis.entrySignal.label;
  const weakCalibration =
    analysis.modelCalibration.reliability === "低" ||
    analysis.modelCalibration.averageForecastErrorPct > 6 ||
    analysis.modelCalibration.directionAccuracy5Day < 52;

  if (blocked || entryLabel === "不買" || entryLabel === "觀察") return "暫不買入" as const;

  if (entryLabel === "應買" || entryLabel === "可買") {
    return "買入候選" as const;
  }

  if (entryLabel === "小量試單") {
    return "可小量試單" as const;
  }

  if (!weakCalibration && analysis.finalScore >= 62 && upProbability >= 55 && riskReward >= 1.15 && forecastPositive) {
    return "買入候選" as const;
  }

  if (!weakCalibration && analysis.finalScore >= 48 && upProbability >= 52 && riskReward >= 1.2 && forecastPositive && !weakTrend) {
    return "可小量試單" as const;
  }

  if (analysis.finalScore >= 45 && upProbability >= 48 && riskReward >= 1.5) {
    return "接近買點" as const;
  }

  if (analysis.finalScore >= 50 && upProbability >= 48) {
    return "等待回檔" as const;
  }

  return "暫不買入" as const;
}

function transform(analysis: AnalysisResult): StockRecommendation {
  const riskReward = riskRewardOf(analysis);
  const recommendation = recommendationOf(analysis, riskReward);
  const probability = analysis.postEntryForecast.probabilityUp3To5;
  const forecast = analysis.postEntryForecast.day5Pct;
  const actionPenalty =
    analysis.action === "SELL" || analysis.action === "STOP_LOSS" ? -35 : analysis.action === "REDUCE" ? -18 : 0;
  const calibrationPenalty =
    (analysis.modelCalibration.reliability === "低" ? 10 : analysis.modelCalibration.reliability === "中" ? 4 : 0) +
    Math.max(0, analysis.modelCalibration.averageForecastErrorPct - 3) * 1.8 +
    Math.max(0, analysis.modelCalibration.forecastBiasPct) * 1.2;
  const entryBonus =
    analysis.entrySignal.label === "應買"
      ? 10
      : analysis.entrySignal.label === "可買"
        ? 6
        : analysis.entrySignal.label === "小量試單"
          ? 3
          : analysis.entrySignal.label === "觀察" || analysis.entrySignal.label === "不買"
            ? -12
            : 0;
  const marginPenalty =
    (analysis.margin.marginUtilizationPct >= 30 ? 8 : analysis.margin.marginUtilizationPct >= 20 ? 4 : 0) +
    (analysis.margin.marginChangePct >= 5 ? 6 : analysis.margin.marginChange > 0 ? 2 : 0) +
    (analysis.margin.marginAmountToTurnoverPct >= 250 ? 5 : analysis.margin.marginAmountToTurnoverPct >= 120 ? 2 : 0) +
    (analysis.marginSafety.level === "危險" ? 8 : analysis.marginSafety.level === "警戒" ? 4 : analysis.marginSafety.level === "注意" ? 1 : 0);
  const leveragePenalty =
    (analysis.leverageRisk.level === "極高" ? 10 : analysis.leverageRisk.level === "高" ? 6 : analysis.leverageRisk.level === "中" ? 2 : 0) +
    (analysis.leverageRisk.overnightRisk === "極高" ? 8 : analysis.leverageRisk.overnightRisk === "高" ? 5 : analysis.leverageRisk.overnightRisk === "中" ? 2 : 0) +
    (analysis.leverageRisk.dayTradeRisk === "極高" ? 5 : analysis.leverageRisk.dayTradeRisk === "高" ? 3 : 0);
  const rankScore =
    analysis.finalScore +
    probability * 0.22 +
    clamp(riskReward, 0, 3) * 7 +
    Math.max(-8, Math.min(10, forecast * 1.3)) +
    actionPenalty -
    calibrationPenalty +
    entryBonus -
    marginPenalty -
    leveragePenalty;

  return {
    symbol: analysis.symbol,
    name: analysis.name,
    price: analysis.price,
    changePct: Number(analysis.changePct.toFixed(2)),
    finalScore: analysis.finalScore,
    action: analysis.action,
    recommendation,
    entryAdvice: analysis.entrySignal.label,
    entryRule: analysis.entrySignal.rule,
    marginAmount: analysis.margin.marginAmount,
    marginUtilizationPct: analysis.margin.marginUtilizationPct,
    marginChange: analysis.margin.marginChange,
    marginChangePct: analysis.margin.marginChangePct,
    marginAmountToTurnoverPct: analysis.margin.marginAmountToTurnoverPct,
    marginSafetyLevel: analysis.marginSafety.level,
    marginSafetyScore: analysis.marginSafety.score,
    marginSafetySummary: analysis.marginSafety.summary,
    marginWarningsCount: analysis.marginSafety.warnings.filter((item) => item.severity !== "info").length,
    leverageRiskLevel: analysis.leverageRisk.level,
    leverageRiskScore: analysis.leverageRisk.score,
    dayTradeRisk: analysis.leverageRisk.dayTradeRisk,
    overnightRisk: analysis.leverageRisk.overnightRisk,
    confidence: analysis.confidence,
    trendStage: analysis.trendStage,
    buyPrice: analysis.buyPrice,
    idealBuyPrice: analysis.idealBuyPrice,
    stopLossPrice: analysis.stopLossPrice,
    takeProfit1: analysis.takeProfit1,
    takeProfit2: analysis.takeProfit2,
    sellPrice: `${analysis.takeProfit1.toFixed(2)} / ${analysis.takeProfit2.toFixed(2)} 元`,
    riskReward,
    holdingPeriod: analysis.holdingPeriod,
    probabilityUp3To5: probability,
    forecastDay5Pct: forecast,
    positionAdvice: analysis.postEntryForecast.positionAdvice,
    reasons: buildReasons(analysis, riskReward),
    rankScore: Number(rankScore.toFixed(2)),
    warning:
      analysis.action === "STOP_LOSS" || analysis.action === "SELL"
        ? "系統判斷風險偏高，若已持有應優先檢查停損。"
        : undefined
  };
}

async function runLimited<T, R>(items: T[], limit: number, worker: (item: T) => Promise<R>) {
  const output: R[] = [];
  let cursor = 0;
  const size = Math.max(1, Math.min(limit, items.length));

  await Promise.all(
    Array.from({ length: size }, async () => {
      while (cursor < items.length) {
        const index = cursor;
        cursor += 1;
        output[index] = await worker(items[index]);
      }
    })
  );

  return output;
}

export async function runStockRecommendations(options?: {
  symbols?: string[];
  scanLimit?: number;
  outputLimit?: number;
  concurrency?: number;
}): Promise<RecommendationReport> {
  const customSymbols = options?.symbols
    ?.map((symbol) => symbol.trim())
    .filter(Boolean);
  const outputLimit = Math.max(1, Math.min(options?.outputLimit ?? 14, 30));
  const requestedScanLimit = Math.max(outputLimit, Math.min(options?.scanLimit ?? 28, 48));
  let source = "使用者指定清單";
  let universeCount = customSymbols?.length ?? 0;
  let qualifiedCount = customSymbols?.length ?? 0;
  let targets = customSymbols?.slice(0, requestedScanLimit) ?? [];
  const errors: { symbol: string; message: string }[] = [];

  if (!customSymbols?.length) {
    try {
      const universe = await loadWholeMarketRecommendationUniverse(Math.max(requestedScanLimit * 3, 72));
      source = `${universe.source}，先全市場初選，再完整分析前 ${requestedScanLimit} 檔`;
      universeCount = universe.universeCount;
      qualifiedCount = universe.qualifiedCount;
      targets = universe.candidates.slice(0, requestedScanLimit).map((stock) => stock.symbol);
    } catch (error) {
      source = "TWSE/TPEX 全市場資料暫時失敗，已改用備援候選池";
      universeCount = DEFAULT_RECOMMENDATION_CANDIDATES.length;
      qualifiedCount = DEFAULT_RECOMMENDATION_CANDIDATES.length;
      targets = DEFAULT_RECOMMENDATION_CANDIDATES.slice(0, requestedScanLimit);
      errors.push({ symbol: "MARKET", message: error instanceof Error ? error.message : "全市場初選失敗" });
    }
  }

  targets = Array.from(new Set(targets)).slice(0, requestedScanLimit);

  const rows = await runLimited(targets, options?.concurrency ?? 4, async (symbol) => {
    try {
      return transform(await runRealFullAnalysis(symbol));
    } catch (error) {
      errors.push({ symbol, message: error instanceof Error ? error.message : "分析失敗" });
      return null;
    }
  });

  const recommendations = rows
    .filter((row): row is StockRecommendation => Boolean(row))
    .sort((a, b) => b.rankScore - a.rankScore || b.finalScore - a.finalScore || b.probabilityUp3To5 - a.probabilityUp3To5)
    .slice(0, outputLimit);

  return {
    updatedAt: new Date().toISOString(),
    source,
    universeCount,
    qualifiedCount,
    analysisTargets: targets.length,
    scanned: targets.length,
    success: rows.filter(Boolean).length,
    failed: errors.length,
    buyCandidates: recommendations.filter((item) => item.recommendation === "買入候選" || item.recommendation === "可小量試單").length,
    recommendations,
    errors
  };
}
