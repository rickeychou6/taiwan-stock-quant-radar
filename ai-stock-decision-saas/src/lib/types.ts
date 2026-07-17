export type Action = "BUY" | "SELL" | "HOLD" | "WATCH" | "REDUCE" | "STOP_LOSS";
export type RiskLevel = "LOW" | "MEDIUM" | "HIGH";
export type TrendStage = "初升段" | "主升段" | "末升段" | "盤整" | "轉弱" | "破線";
export type EntryAdviceLabel = "應買" | "可買" | "小量試單" | "等待" | "觀望" | "觀察" | "不買";

export type PriceBar = {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  turnover: number;
};

export type StockProfile = {
  symbol: string;
  name: string;
  market: "TWSE" | "TPEX" | "US";
  industry: string;
  sector: string;
  aliases?: string[];
};

export type ScoreBlock = {
  score: number;
  weight: number;
  label: string;
  explanation: string[];
};

export type MarginInfo = {
  available: boolean;
  source: string;
  date: string;
  marginBuy: number;
  marginSell: number;
  marginCashRepayment: number;
  marginPreviousBalance: number;
  marginBalance: number;
  marginChange: number;
  marginChangePct: number;
  marginLimit: number;
  marginUtilizationPct: number;
  marginAmount: number;
  marginAmountToTurnoverPct: number;
  shortSell: number;
  shortCover: number;
  shortPreviousBalance: number;
  shortBalance: number;
  shortUtilizationPct: number;
  shortToMarginPct: number;
  note: string;
  warning: string;
};

export type AnalysisResult = {
  symbol: string;
  name: string;
  price: number;
  changePct: number;
  finalScore: number;
  action: Action;
  confidence: number;
  riskLevel: RiskLevel;
  trendStage: TrendStage;
  supportPrice: number;
  supportPriceRange: string;
  buyPrice: string;
  idealBuyPrice: string;
  stopLossPrice: number;
  takeProfit1: number;
  takeProfit2: number;
  holdingPeriod: string;
  margin: MarginInfo;
  entrySignal: {
    label: EntryAdviceLabel;
    reason: string;
    rule: string;
    riskReward: number;
    supportDistancePct: number;
  };
  postEntryForecast: {
    day3Pct: number;
    day4Pct: number;
    day5Pct: number;
    probabilityUp3To5: number;
    probabilityDown3To5: number;
    positionAdvice: "續抱" | "賣出" | "減碼" | "觀望";
    reason: string;
  };
  modelCalibration: {
    sampleSize: number;
    directionAccuracy3Day: number;
    directionAccuracy5Day: number;
    averageForecastErrorPct: number;
    forecastBiasPct: number;
    averageActual5DayPct: number;
    reliability: "高" | "中" | "低";
    correction: string;
  };
  dataQuality: {
    priceSource: string;
    latestPriceDate: string;
    priceBars: number;
    warning: string;
  };
  scores: {
    technical: ScoreBlock;
    chip: ScoreBlock;
    capital: ScoreBlock;
    fundamental: ScoreBlock;
    news: ScoreBlock;
    macro: ScoreBlock;
  };
  backtest: {
    oneYearWinRate: number;
    threeYearWinRate: number;
    fiveYearWinRate: number;
    similarPatternCount: number;
    avgReturn: number;
    maxDrawdown: number;
    profitFactor: number;
  };
  explanation: {
    summary: string;
    technical: string[];
    chip: string[];
    capital: string[];
    fundamental: string[];
    news: string[];
    macro: string[];
  };
  prices: PriceBar[];
};
