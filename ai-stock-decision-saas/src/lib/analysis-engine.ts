import { atr, bollinger, ema, macd, obv, rsi, sma, stochastic } from "@/lib/indicators";
import { generatePrices, getStock, mockChipData, mockFundamental, mockMacro, mockNews } from "@/lib/mock-data";
import { buildEntrySignal } from "@/lib/entry-advice";
import type { Action, AnalysisResult, PriceBar, RiskLevel, ScoreBlock, TrendStage } from "@/lib/types";

type PositionAdvice = AnalysisResult["postEntryForecast"]["positionAdvice"];

function last(values: number[]) {
  return values[values.length - 1];
}

function clamp(value: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

function rangeText(low: number, high: number) {
  return `${low.toFixed(2)} ~ ${high.toFixed(2)} 元`;
}

function scoreBlock(label: string, score: number, weight: number, explanation: string[]): ScoreBlock {
  return { label, score: Math.round(clamp(score)), weight, explanation };
}

function detectStage(close: number, ma20: number, ma60: number, ma120: number, rsiValue: number): TrendStage {
  if (close < ma60 && close < ma120) return "破線";
  if (close < ma20 && close > ma60) return "轉弱";
  if (close > ma20 && ma20 > ma60 && ma60 > ma120 && rsiValue < 70) return "主升段";
  if (close > ma20 && ma20 > ma60 && rsiValue >= 70) return "末升段";
  if (close > ma20 && ma20 >= ma60) return "初升段";
  return "盤整";
}

function decisionFromScore(score: number, price: number, stop: number): { action: Action; riskLevel: RiskLevel; confidence: number } {
  if (price <= stop) return { action: "STOP_LOSS", riskLevel: "HIGH", confidence: 92 };
  if (score >= 85) return { action: "BUY", riskLevel: "LOW", confidence: score };
  if (score >= 70) return { action: "HOLD", riskLevel: "LOW", confidence: score };
  if (score >= 55) return { action: "WATCH", riskLevel: "MEDIUM", confidence: score };
  if (score >= 45) return { action: "WATCH", riskLevel: "MEDIUM", confidence: 100 - score };
  if (score >= 30) return { action: "REDUCE", riskLevel: "HIGH", confidence: 100 - score };
  return { action: "SELL", riskLevel: "HIGH", confidence: 100 - score };
}

function postEntryForecast(score: number, stage: TrendStage, atrPct: number, backtestBias: number) {
  const stageBonus: Record<TrendStage, number> = {
    初升段: 0.8,
    主升段: 1.4,
    末升段: -0.4,
    盤整: 0.1,
    轉弱: -1.1,
    破線: -2.2
  };
  const base = (score - 50) / 18 + stageBonus[stage] + backtestBias;
  const volatility = Math.max(0.45, Math.min(2.4, atrPct / 2.2));
  const day3Pct = base * 0.82 + volatility * 0.25;
  const day4Pct = base * 1.03 + volatility * 0.32;
  const day5Pct = base * 1.18 + volatility * 0.42;
  const probabilityUp3To5 = clamp(48 + (score - 50) * 0.72 + backtestBias * 7, 8, 92);
  const probabilityDown3To5 = 100 - probabilityUp3To5;
  const positionAdvice: PositionAdvice =
    score >= 70 && probabilityUp3To5 >= 58
      ? "續抱"
      : score <= 44 || probabilityDown3To5 >= 58
        ? "賣出"
        : score < 55
          ? "減碼"
          : "觀望";
  const reason =
    positionAdvice === "續抱"
      ? "3-5 天模型偏多，若未跌破停損與 VWAP，可續抱到第一目標區。"
      : positionAdvice === "賣出"
        ? "3-5 天模型偏弱，若已持股應優先降低隔日與短線回撤風險。"
        : positionAdvice === "減碼"
          ? "多空分歧且下跌機率偏高，建議減碼等待下一個確認點。"
          : "3-5 天沒有明顯優勢，等待回測支撐或突破確認。";
  return {
    day3Pct: Number(day3Pct.toFixed(2)),
    day4Pct: Number(day4Pct.toFixed(2)),
    day5Pct: Number(day5Pct.toFixed(2)),
    probabilityUp3To5: Math.round(probabilityUp3To5),
    probabilityDown3To5: Math.round(probabilityDown3To5),
    positionAdvice,
    reason
  };
}

function similarPatternBacktest(prices: PriceBar[], score: number) {
  const closes = prices.map((p) => p.close);
  const ma20 = sma(closes, 20);
  const ma60 = sma(closes, 60);
  const rows: number[] = [];
  for (let i = 80; i < prices.length - 5; i++) {
    const condition = prices[i].close > ma20[i] && ma20[i] > ma60[i];
    if (!condition) continue;
    rows.push(((prices[i + 5].close - prices[i].close) / prices[i].close) * 100);
  }
  const wins = rows.filter((value) => value > 0).length;
  const avgReturn = rows.length ? rows.reduce((sum, value) => sum + value, 0) / rows.length : 0;
  const bias = avgReturn / 2 + (score - 50) / 120;
  return {
    oneYearWinRate: Math.round(clamp((wins / Math.max(1, rows.length)) * 100 + 2)),
    threeYearWinRate: Math.round(clamp((wins / Math.max(1, rows.length)) * 100)),
    fiveYearWinRate: Math.round(clamp((wins / Math.max(1, rows.length)) * 100 - 1)),
    similarPatternCount: rows.length,
    avgReturn: Number(avgReturn.toFixed(2)),
    maxDrawdown: Number((Math.min(...rows, 0) * 1.35).toFixed(2)),
    profitFactor: Number((Math.max(1, wins) / Math.max(1, rows.length - wins)).toFixed(2)),
    bias
  };
}

export function runFullAnalysis(symbolOrName: string): AnalysisResult {
  const stock = getStock(symbolOrName);
  const prices = generatePrices(stock.symbol);
  const closes = prices.map((p) => p.close);
  const highs = prices.map((p) => p.high);
  const lows = prices.map((p) => p.low);
  const volumes = prices.map((p) => p.volume);
  const close = last(closes);
  const previousClose = closes[closes.length - 2];
  const ma5 = last(sma(closes, 5));
  const ma10 = last(sma(closes, 10));
  const ma20 = last(sma(closes, 20));
  const ma60 = last(sma(closes, 60));
  const ma120 = last(sma(closes, 120));
  const ma240 = last(sma(closes, 240));
  const ema20 = last(ema(closes, 20));
  const macdData = macd(closes);
  const macdHist = last(macdData.hist);
  const rsi14 = last(rsi(closes));
  const kd = stochastic(prices);
  const k = last(kd.k);
  const d = last(kd.d);
  const atr14 = last(atr(prices));
  const atrPct = (atr14 / close) * 100;
  const bb = bollinger(closes);
  const bbUpper = last(bb.upper);
  const bbMid = last(bb.mid);
  const bbLower = last(bb.lower);
  const obvValues = obv(prices);
  const obvTrend = last(obvValues) > obvValues[obvValues.length - 20];
  const boxHigh = Math.max(...highs.slice(-21, -1));
  const boxLow = Math.min(...lows.slice(-21, -1));
  const volumeRatio = last(volumes) / (last(sma(volumes, 20)) || last(volumes));
  const vwap = prices.slice(-20).reduce((sum, p) => sum + p.close * p.volume, 0) / prices.slice(-20).reduce((sum, p) => sum + p.volume, 0);
  const recentLow10 = Math.min(...lows.slice(-10));
  const supportLevels = [boxLow, recentLow10, ma20, ma60, bbMid, bbLower, vwap].filter(Number.isFinite);
  const supportBelowPrice = supportLevels.filter((level) => level <= close);
  const support = supportBelowPrice.length ? Math.max(...supportBelowPrice) : Math.min(close - atr14 * 0.5, ...supportLevels);
  const resistance = Math.max(boxHigh, bbUpper);
  const stage = detectStage(close, ma20, ma60, ma120, rsi14);
  const margin = {
    available: true,
    source: "本機種子範例融資資料",
    date: prices[prices.length - 1]?.date || "",
    marginBuy: 780,
    marginSell: 1400,
    marginCashRepayment: 0,
    marginPreviousBalance: 28500,
    marginBalance: 27880,
    marginChange: mockChipData.marginDelta,
    marginChangePct: -2.18,
    marginLimit: 520000,
    marginUtilizationPct: 5.36,
    marginAmount: 27880 * 1000 * close,
    marginAmountToTurnoverPct: 68.5,
    shortSell: 120,
    shortCover: 80,
    shortPreviousBalance: 460,
    shortBalance: 500,
    shortUtilizationPct: 0.1,
    shortToMarginPct: 1.79,
    note: "",
    warning: "此為範例資料，正式分析會使用 TWSE/TPEX 官方融資融券資料。"
  };

  let technicalScore = 50;
  const technicalReasons: string[] = [];
  if (close > ma5 && ma5 > ma10 && ma10 > ma20) {
    technicalScore += 12;
    technicalReasons.push("MA5/10/20 呈多頭排列，短線趨勢偏強。");
  }
  if (close > ma60 && ma60 > ma120) {
    technicalScore += 10;
    technicalReasons.push("股價站上 MA60 且季線優於半年線，波段架構偏多。");
  }
  if (close > ema20) technicalScore += 4;
  if (macdHist > 0) {
    technicalScore += 7;
    technicalReasons.push("MACD 柱體為正，動能仍在多方。");
  }
  if (rsi14 > 50 && rsi14 < 72) technicalScore += 6;
  if (k > d && k < 85) technicalScore += 5;
  if (close >= bbMid && close <= bbUpper * 1.03) technicalScore += 5;
  if (volumeRatio >= 1.25) technicalScore += 5;
  if (obvTrend) technicalScore += 4;
  if (close > boxHigh && volumeRatio >= 1.2) technicalScore += 10;
  if (close < ma20) technicalScore -= 12;
  if (rsi14 > 78) technicalScore -= 6;
  if (close > bbUpper * 1.04) technicalScore -= 5;
  technicalReasons.push(`箱型區間 ${boxLow.toFixed(2)} ~ ${boxHigh.toFixed(2)}，VWAP 參考 ${vwap.toFixed(2)}。`);
  technicalReasons.push(`同時納入 RSI、KD、Bollinger、ATR、OBV、箱型、支撐壓力、量價與 K 線位置。`);

  let chipScore = 50 + mockChipData.foreignBuy / 1200 + mockChipData.trustBuy / 600 - Math.max(0, mockChipData.marginDelta) / 500;
  const chipReasons = [
    `外資買賣超 ${mockChipData.foreignBuy.toLocaleString()} 張，投信 ${mockChipData.trustBuy.toLocaleString()} 張，自營商 ${mockChipData.dealerBuy.toLocaleString()} 張。`,
    `融資變化 ${mockChipData.marginDelta.toLocaleString()} 張，券資與借券資料列入風險分數。`,
    mockChipData.bigHolderBias
  ];

  let capitalScore = 50 + Math.min(16, (volumeRatio - 1) * 18) + (stock.sector === "電子" ? 8 : 1);
  const capitalReasons = [
    `成交量為 20 日均量 ${volumeRatio.toFixed(2)} 倍，成交值與市場熱度同步評估。`,
    `${stock.industry} 產業資金輪動分數偏${stock.sector === "電子" ? "強" : "中性"}。`
  ];

  let fundamentalScore = 50;
  if (mockFundamental.revenueYoY > 10) fundamentalScore += 10;
  if (mockFundamental.roe > 18) fundamentalScore += 8;
  if (mockFundamental.grossMargin > 35) fundamentalScore += 5;
  if (mockFundamental.pe > 35) fundamentalScore -= 4;
  const fundamentalReasons = [
    `月營收 YoY ${mockFundamental.revenueYoY}%、MoM ${mockFundamental.revenueMoM}%。`,
    `EPS ${mockFundamental.eps}、ROE ${mockFundamental.roe}%、PE ${mockFundamental.pe}、PB ${mockFundamental.pb}。`,
    `股利殖利率 ${mockFundamental.dividendYield}%，財報趨勢預留串接正式資料。`
  ];

  const newsRaw = mockNews.reduce((sum, item) => sum + item.sentiment, 0) / mockNews.length;
  const newsScoreValue = 50 + newsRaw * 35;
  const newsReasons = mockNews.map((item) => `${item.title}（${item.source}，情緒 ${item.sentiment > 0 ? "偏多" : "偏空"}）`);

  const macroComposite = Object.values(mockMacro).reduce((sum, value) => sum + value, 0) / Object.values(mockMacro).length;
  const macroScoreValue = 50 + macroComposite * 28;
  const macroReasons = [
    `美股、Nasdaq、S&P 500、道瓊、費半、台指期、VIX、美元、美債、原油、黃金與 BTC 綜合分數 ${macroScoreValue.toFixed(0)}。`,
    "半導體與 AI 供應鏈會額外參考 NVIDIA、AMD、TSMC ADR、Micron。"
  ];

  const scores = {
    technical: scoreBlock("技術面", technicalScore, 0.3, technicalReasons),
    chip: scoreBlock("籌碼面", chipScore, 0.25, chipReasons),
    capital: scoreBlock("資金面", capitalScore, 0.15, capitalReasons),
    fundamental: scoreBlock("基本面", fundamentalScore, 0.15, fundamentalReasons),
    news: scoreBlock("消息面", newsScoreValue, 0.1, newsReasons),
    macro: scoreBlock("國際市場", macroScoreValue, 0.05, macroReasons)
  };

  const finalScore =
    scores.technical.score * 0.3 +
    scores.chip.score * 0.25 +
    scores.capital.score * 0.15 +
    scores.fundamental.score * 0.15 +
    scores.news.score * 0.1 +
    scores.macro.score * 0.05;

  const stopLoss = Math.min(support - atr14 * 0.5, ma20 - atr14 * 0.6);
  const decision = decisionFromScore(finalScore, close, stopLoss);
  const supportLow = Math.max(stopLoss + atr14 * 0.35, support - atr14 * 0.35);
  const supportHigh = Math.max(supportLow, Math.min(close, support + atr14 * 0.25));
  const idealHigh = Math.min(close, support + atr14 * 0.35);
  const idealLow = Math.min(idealHigh, Math.max(stopLoss + atr14 * 0.6, support - atr14 * 0.25));
  const takeProfit1 = Math.max(resistance, close + atr14 * 1.8);
  const takeProfit2 = Math.max(takeProfit1 + atr14 * 1.5, close + atr14 * 3.2);
  const holdingPeriod = finalScore >= 75 ? "短線 3-7 天，波段 1-4 週" : finalScore >= 55 ? "短線 1-5 天，等確認後延長" : "當沖/隔日觀察，不宜久抱";
  const backtest = similarPatternBacktest(prices, finalScore);
  const forecast = postEntryForecast(finalScore, stage, atrPct, backtest.bias);
  const modelCalibration: AnalysisResult["modelCalibration"] = {
    sampleSize: backtest.similarPatternCount,
    directionAccuracy3Day: backtest.oneYearWinRate,
    directionAccuracy5Day: backtest.threeYearWinRate,
    averageForecastErrorPct: Number(Math.max(1.2, Math.abs(backtest.maxDrawdown) / 4).toFixed(2)),
    forecastBiasPct: Number((forecast.day5Pct - backtest.avgReturn).toFixed(2)),
    averageActual5DayPct: backtest.avgReturn,
    reliability: backtest.similarPatternCount >= 120 && backtest.threeYearWinRate >= 57 ? "高" : backtest.similarPatternCount >= 60 ? "中" : "低",
    correction: "範例資料以歷史型態回測近似校準；正式分析會用真實 K 線滾動驗證。"
  };
  const entrySignal = buildEntrySignal({
    reliability: modelCalibration.reliability,
    finalScore,
    technicalScore: scores.technical.score,
    capitalScore: scores.capital.score,
    price: close,
    support,
    stopLoss,
    takeProfit1,
    volumeRatio,
    trendStage: stage,
    action: decision.action,
    forecastUpProbability: forecast.probabilityUp3To5
  });
  technicalReasons.push(`核心支撐約 ${support.toFixed(2)}，支撐觀察區 ${rangeText(supportLow, supportHigh)}。`);

  return {
    symbol: stock.symbol,
    name: stock.name,
    price: close,
    changePct: ((close - previousClose) / previousClose) * 100,
    finalScore: Math.round(finalScore),
    action: decision.action,
    confidence: Math.round(decision.confidence),
    riskLevel: decision.riskLevel,
    trendStage: stage,
    supportPrice: Number(support.toFixed(2)),
    supportPriceRange: rangeText(supportLow, supportHigh),
    buyPrice: rangeText(idealLow, idealHigh),
    idealBuyPrice: rangeText(idealLow, Math.min(idealHigh, vwap)),
    stopLossPrice: Number(stopLoss.toFixed(2)),
    takeProfit1: Number(takeProfit1.toFixed(2)),
    takeProfit2: Number(takeProfit2.toFixed(2)),
    holdingPeriod,
    margin,
    entrySignal,
    postEntryForecast: forecast,
    modelCalibration,
    dataQuality: {
      priceSource: "本機種子範例資料",
      latestPriceDate: prices[prices.length - 1]?.date || "",
      priceBars: prices.length,
      warning: "此為首頁示範資料，不可作為真實交易依據。"
    },
    scores,
    backtest,
    prices,
    explanation: {
      summary: `${stock.name} 綜合分數 ${Math.round(finalScore)}，決策 ${decision.action}，進場建議為「${entrySignal.label}」，持股建議為「${forecast.positionAdvice}」。`,
      technical: technicalReasons,
      chip: chipReasons,
      capital: capitalReasons,
      fundamental: fundamentalReasons,
      news: newsReasons,
      macro: macroReasons
    }
  };
}
