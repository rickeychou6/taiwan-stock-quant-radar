import { runRealFullAnalysis } from "@/lib/real-analysis-engine";
import type { Action, AnalysisResult } from "@/lib/types";

export type StockRecommendation = {
  symbol: string;
  name: string;
  price: number;
  changePct: number;
  finalScore: number;
  action: Action;
  recommendation: "買入候選" | "等待回檔" | "暫不買入";
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
  scanned: number;
  success: number;
  failed: number;
  buyCandidates: number;
  recommendations: StockRecommendation[];
  errors: { symbol: string; message: string }[];
};

export const DEFAULT_RECOMMENDATION_CANDIDATES = [
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
  "1303.TW",
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
  const risk = Math.max(0.01, analysis.price - analysis.stopLossPrice);
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
  reasons.push(`目前報酬風險比約 1 : ${riskReward.toFixed(2)}，停損以 ${analysis.stopLossPrice.toFixed(2)} 元控管。`);

  return reasons;
}

function recommendationOf(analysis: AnalysisResult, riskReward: number) {
  const upProbability = analysis.postEntryForecast.probabilityUp3To5;
  const action = analysis.action;
  const positiveAction = action === "BUY" || action === "HOLD" || action === "WATCH";

  if (analysis.finalScore >= 66 && upProbability >= 56 && riskReward >= 1.05 && positiveAction) {
    return "買入候選" as const;
  }

  if (analysis.finalScore >= 55 && upProbability >= 50 && action !== "SELL" && action !== "STOP_LOSS") {
    return "等待回檔" as const;
  }

  return "暫不買入" as const;
}

function transform(analysis: AnalysisResult): StockRecommendation {
  const riskReward = riskRewardOf(analysis);
  const recommendation = recommendationOf(analysis, riskReward);
  const probability = analysis.postEntryForecast.probabilityUp3To5;
  const forecast = analysis.postEntryForecast.day5Pct;
  const rankScore =
    analysis.finalScore +
    probability * 0.22 +
    clamp(riskReward, 0, 3) * 7 +
    Math.max(-8, Math.min(10, forecast * 1.3));

  return {
    symbol: analysis.symbol,
    name: analysis.name,
    price: analysis.price,
    changePct: Number(analysis.changePct.toFixed(2)),
    finalScore: analysis.finalScore,
    action: analysis.action,
    recommendation,
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
  const symbols = (options?.symbols?.length ? options.symbols : DEFAULT_RECOMMENDATION_CANDIDATES)
    .map((symbol) => symbol.trim())
    .filter(Boolean);
  const scanLimit = Math.max(1, Math.min(options?.scanLimit ?? 16, symbols.length));
  const outputLimit = Math.max(1, Math.min(options?.outputLimit ?? 12, scanLimit));
  const targets = symbols.slice(0, scanLimit);
  const errors: { symbol: string; message: string }[] = [];

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
    .sort((a, b) => {
      if (a.recommendation !== b.recommendation) {
        const weight = { 買入候選: 3, 等待回檔: 2, 暫不買入: 1 };
        return weight[b.recommendation] - weight[a.recommendation];
      }
      return b.rankScore - a.rankScore;
    })
    .slice(0, outputLimit);

  return {
    updatedAt: new Date().toISOString(),
    scanned: targets.length,
    success: rows.filter(Boolean).length,
    failed: errors.length,
    buyCandidates: recommendations.filter((item) => item.recommendation === "買入候選").length,
    recommendations,
    errors
  };
}
