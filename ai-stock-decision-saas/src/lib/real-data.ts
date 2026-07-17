import type { AlertSeverity, MarginInfo, MarginSafetyLevel, PriceBar, StockProfile } from "@/lib/types";

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36";

const COMMON_TW_STOCKS: StockProfile[] = [
  { symbol: "2330.TW", name: "台積電", market: "TWSE", industry: "半導體", sector: "科技" },
  { symbol: "2317.TW", name: "鴻海", market: "TWSE", industry: "電子代工", sector: "科技" },
  { symbol: "2454.TW", name: "聯發科", market: "TWSE", industry: "IC 設計", sector: "科技" },
  { symbol: "3008.TW", name: "大立光", market: "TWSE", industry: "光學鏡頭", sector: "科技" },
  { symbol: "2382.TW", name: "廣達", market: "TWSE", industry: "電腦及週邊", sector: "科技" },
  { symbol: "2308.TW", name: "台達電", market: "TWSE", industry: "電源供應器", sector: "科技" },
  { symbol: "3711.TW", name: "日月光投控", market: "TWSE", industry: "封測", sector: "科技" },
  { symbol: "2412.TW", name: "中華電", market: "TWSE", industry: "電信", sector: "通訊" },
  { symbol: "1303.TW", name: "南亞", market: "TWSE", industry: "塑化", sector: "傳產" },
  { symbol: "2409.TW", name: "友達", market: "TWSE", industry: "面板", sector: "科技" },
  { symbol: "6285.TW", name: "啟碁", market: "TWSE", industry: "網通", sector: "科技" },
  { symbol: "4976.TW", name: "佳凌", market: "TWSE", industry: "光學", sector: "科技" },
  { symbol: "5274.TWO", name: "信驊", market: "TPEX", industry: "IC 設計", sector: "科技" },
  { symbol: "8071.TWO", name: "能率網通", market: "TPEX", industry: "網通通路", sector: "科技", aliases: ["能率網通股份有限公司"] },
  { symbol: "5392.TWO", name: "能率", market: "TPEX", industry: "電子零組件", sector: "科技", aliases: ["能率創新股份有限公司", "能率創新"] },
  { symbol: "3017.TW", name: "奇鋐", market: "TWSE", industry: "散熱", sector: "科技" },
  { symbol: "8046.TWO", name: "南電", market: "TPEX", industry: "IC 載板", sector: "科技" }
];

let stockUniversePromise: Promise<StockProfile[]> | null = null;
let marketCache: { at: number; data: Record<string, number> } | null = null;
let marketQuoteCache: { at: number; data: MarketQuote[] } | null = null;
let recommendationUniverseCache: { at: number; data: WholeMarketRecommendationUniverse } | null = null;
let marginMapsCache: {
  at: number;
  twse: Map<string, Record<string, string>>;
  tpex: Map<string, Record<string, string>>;
} | null = null;
let marketMarginCache: { at: number; data: MarketMarginOverview } | null = null;

export type MarketQuote = {
  symbol: string;
  label: string;
  group: "tw" | "twfutures" | "asia" | "us" | "futures" | "macro" | "crypto";
  price: number;
  previousClose: number;
  change: number;
  changePct: number;
  source: string;
  session: string;
};

export type MarketScanCandidate = StockProfile & {
  price: number;
  change: number;
  changePct: number;
  tradeValue: number;
  volume: number;
  setupScore: number;
  quoteDate: string;
  source: string;
};

export type WholeMarketRecommendationUniverse = {
  source: string;
  universeCount: number;
  qualifiedCount: number;
  candidates: MarketScanCandidate[];
};

export type MarketMarginWarning = {
  id: string;
  label: string;
  severity: AlertSeverity;
  message: string;
  triggeredValue: string;
};

export type MarketMarginOverview = {
  available: boolean;
  source: string;
  date: string;
  marketCount: number;
  currentAmount: number;
  previousAmount: number;
  changeAmount: number;
  changePct: number;
  marginBalance: number;
  previousMarginBalance: number;
  balanceChange: number;
  balanceChangePct: number;
  marginLimit: number;
  utilizationPct: number;
  turnover: number;
  amountToTurnoverPct: number;
  listedAmount: number;
  listedChangeAmount: number;
  otcAmount: number;
  otcChangeAmount: number;
  safety: {
    level: MarginSafetyLevel;
    score: number;
    summary: string;
    warnings: MarketMarginWarning[];
  };
};

type YahooQuote = {
  symbol?: string;
  shortname?: string;
  longname?: string;
  quoteType?: string;
  exchange?: string;
  exchDisp?: string;
  typeDisp?: string;
};

type YahooSearchResponse = {
  quotes?: YahooQuote[];
  news?: Array<{ title?: string; publisher?: string; link?: string; providerPublishTime?: number }>;
};

type YahooChartResponse = {
  chart?: {
    result?: Array<{
      meta?: {
        symbol?: string;
        shortName?: string;
        longName?: string;
        regularMarketPrice?: number;
        previousClose?: number;
        chartPreviousClose?: number;
        exchangeName?: string;
      };
      timestamp?: number[];
      indicators?: {
        quote?: Array<{
          open?: Array<number | null>;
          high?: Array<number | null>;
          low?: Array<number | null>;
          close?: Array<number | null>;
          volume?: Array<number | null>;
        }>;
      };
    }>;
    error?: { description?: string };
  };
};

type TwseMisItem = {
  c?: string;
  ch?: string;
  n?: string;
  z?: string;
  pz?: string;
  y?: string;
  o?: string;
  h?: string;
  l?: string;
  v?: string;
  tv?: string;
  d?: string;
  t?: string;
};

type TwseMisResponse = {
  msgArray?: TwseMisItem[];
  rtcode?: string;
  rtmessage?: string;
};

type RealtimeQuote = {
  price: number;
  previousClose: number;
  change: number;
  changePct: number;
  open?: number;
  high?: number;
  low?: number;
  volume?: number;
  date?: string;
  time?: string;
  source: string;
};

type TaifexQuoteItem = {
  SymbolID?: string;
  DispCName?: string;
  Status?: string;
  CTotalVolume?: string;
  CLastPrice?: string;
  CRefPrice?: string;
  CDiff?: string;
  CDiffRate?: string;
  CDate?: string;
  CTime?: string;
};

type TaifexQuoteResponse = {
  RtCode?: string;
  RtMsg?: string;
  RtData?: {
    QuoteList?: TaifexQuoteItem[];
  };
};

type TwseDayAllQuote = {
  Date?: string;
  Code?: string;
  Name?: string;
  TradeVolume?: string;
  TradeValue?: string;
  OpeningPrice?: string;
  HighestPrice?: string;
  LowestPrice?: string;
  ClosingPrice?: string;
  Change?: string;
};

type TpexDailyCloseQuote = {
  Date?: string;
  SecuritiesCompanyCode?: string;
  CompanyName?: string;
  Close?: string;
  Change?: string;
  Open?: string;
  High?: string;
  Low?: string;
  TradingShares?: string;
  TransactionAmount?: string;
};

type TpexMarginBalance = Record<string, string> & {
  Date?: string;
  SecuritiesCompanyCode?: string;
  CompanyName?: string;
  MarginPurchaseBalancePreviousDay?: string;
  MarginPurchase?: string;
  MarginSales?: string;
  CashRedemption?: string;
  MarginPurchaseBalance?: string;
  MarginPurchaseUtilizationRate?: string;
  MarginPurchaseQuota?: string;
  ShortSaleBalancePreviousDay?: string;
  ShortSale?: string;
  ShortConvering?: string;
  StockRedemption?: string;
  ShortSaleBalance?: string;
  ShortSaleUtilizationRate?: string;
  ShortSaleQuota?: string;
  Offsetting?: string;
  Note?: string;
};

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    cache: "no-store",
    headers: {
      "User-Agent": USER_AGENT,
      Accept: "application/json"
    }
  });
  if (!response.ok) {
    throw new Error(`資料來源回應失敗：${response.status}`);
  }
  return response.json() as Promise<T>;
}

async function fetchTaifexJson<T>(url: string, body: unknown): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    cache: "no-store",
    headers: {
      "User-Agent": USER_AGENT,
      Accept: "application/json, text/plain, */*",
      "Content-Type": "application/json",
      Origin: "https://mis.taifex.com.tw",
      Referer: "https://mis.taifex.com.tw/futures/"
    },
    body: JSON.stringify(body)
  });
  if (!response.ok) {
    throw new Error(`TAIFEX 即時資料來源回應失敗：${response.status}`);
  }
  return response.json() as Promise<T>;
}

async function fetchRealtimeJson<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    cache: "no-store",
    headers: {
      "User-Agent": USER_AGENT,
      Accept: "application/json, text/javascript, */*; q=0.01",
      Referer: "https://mis.twse.com.tw/stock/index.jsp"
    }
  });
  if (!response.ok) {
    throw new Error(`即時資料來源回應失敗：${response.status}`);
  }
  return response.json() as Promise<T>;
}

async function fetchOfficialJson<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    cache: "force-cache",
    next: { revalidate: 86400 },
    headers: {
      "User-Agent": USER_AGENT,
      Accept: "application/json"
    }
  });
  if (!response.ok) throw new Error(`官方股名清單回應失敗：${response.status}`);
  return response.json() as Promise<T>;
}

function cleanSymbol(input: string) {
  return input.trim().toUpperCase().replace(/\s+/g, "");
}

function normalizeText(input: string) {
  return input.trim().replace(/\s+/g, "").replace(/臺/g, "台").toUpperCase();
}

function stockFromSymbol(symbol: string, name?: string): StockProfile {
  const normalized = cleanSymbol(symbol);
  const known = COMMON_TW_STOCKS.find((stock) => stock.symbol === normalized);
  if (known) return known;
  const market = normalized.endsWith(".TWO") ? "TPEX" : "TWSE";
  return {
    symbol: normalized,
    name: name || normalized,
    market,
    industry: "待串接公開產業分類",
    sector: "台股"
  };
}

function parseTaiwanNumber(value?: string) {
  if (!value || value === "-" || value === "--") return undefined;
  const parsed = Number(value.replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : undefined;
}

function parseNumberOrZero(value?: string) {
  return parseTaiwanNumber(value) ?? 0;
}

function stockCode(symbol: string) {
  return cleanSymbol(symbol).replace(/\.(TW|TWO)$/, "");
}

function rocDateToIso(raw?: string) {
  if (!raw || !/^\d{7}$/.test(raw)) return "";
  const year = Number(raw.slice(0, 3)) + 1911;
  return `${year}-${raw.slice(3, 5)}-${raw.slice(5, 7)}`;
}

function quoteDateToIso(raw?: string) {
  const text = raw?.trim();
  if (!text) return "";
  const digits = text.replace(/[^\d]/g, "");
  if (/^\d{8}$/.test(digits)) return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 8)}`;
  if (/^\d{7}$/.test(digits)) return rocDateToIso(digits);
  return text;
}

function formatShortTwd(value: number) {
  const sign = value > 0 ? "+" : value < 0 ? "-" : "";
  const abs = Math.abs(value);
  if (abs >= 100_000_000) return `${sign}${(abs / 100_000_000).toFixed(1)} 億`;
  if (abs >= 10_000) return `${sign}${(abs / 10_000).toFixed(1)} 萬`;
  return `${sign}${Math.round(abs).toLocaleString("zh-TW")} 元`;
}

function blankMarginInfo(symbol: string, warning: string): MarginInfo {
  return {
    available: false,
    source: symbol.endsWith(".TWO") ? "TPEX 上櫃融資融券 OpenAPI" : "TWSE 上市融資融券 OpenAPI",
    date: "",
    marginBuy: 0,
    marginSell: 0,
    marginCashRepayment: 0,
    marginPreviousBalance: 0,
    marginBalance: 0,
    marginChange: 0,
    marginChangePct: 0,
    marginLimit: 0,
    marginUtilizationPct: 0,
    marginAmount: 0,
    marginAmountToTurnoverPct: 0,
    shortSell: 0,
    shortCover: 0,
    shortPreviousBalance: 0,
    shortBalance: 0,
    shortUtilizationPct: 0,
    shortToMarginPct: 0,
    note: "",
    warning
  };
}

function completeMarginInfo(input: Omit<MarginInfo, "available" | "marginChange" | "marginChangePct" | "marginAmount" | "marginAmountToTurnoverPct" | "shortToMarginPct" | "warning"> & {
  price: number;
  averageTurnover: number;
  warning?: string;
}): MarginInfo {
  const marginChange = input.marginBalance - input.marginPreviousBalance;
  const marginChangePct = input.marginPreviousBalance > 0 ? (marginChange / input.marginPreviousBalance) * 100 : 0;
  const marginAmount = input.marginBalance * 1000 * input.price;
  const marginAmountToTurnoverPct = input.averageTurnover > 0 ? (marginAmount / input.averageTurnover) * 100 : 0;
  const shortToMarginPct = input.marginBalance > 0 ? (input.shortBalance / input.marginBalance) * 100 : 0;
  const marginUtilizationPct =
    input.marginUtilizationPct > 0
      ? input.marginUtilizationPct
      : input.marginLimit > 0
        ? (input.marginBalance / input.marginLimit) * 100
        : 0;

  return {
    available: true,
    source: input.source,
    date: input.date,
    marginBuy: input.marginBuy,
    marginSell: input.marginSell,
    marginCashRepayment: input.marginCashRepayment,
    marginPreviousBalance: input.marginPreviousBalance,
    marginBalance: input.marginBalance,
    marginChange,
    marginChangePct,
    marginLimit: input.marginLimit,
    marginUtilizationPct,
    marginAmount,
    marginAmountToTurnoverPct,
    shortSell: input.shortSell,
    shortCover: input.shortCover,
    shortPreviousBalance: input.shortPreviousBalance,
    shortBalance: input.shortBalance,
    shortUtilizationPct: input.shortUtilizationPct,
    shortToMarginPct,
    note: input.note,
    warning: input.warning ?? ""
  };
}

function twseMisChannel(symbol: string) {
  const normalized = cleanSymbol(symbol);
  if (normalized === "^TWII") return "tse_t00.tw";
  const code = normalized.replace(/\.(TW|TWO)$/, "");
  if (!/^\d{4,6}$/.test(code)) return undefined;
  if (normalized.endsWith(".TWO")) return `otc_${code}.tw`;
  return `tse_${code}.tw`;
}

function formatMisDate(raw?: string) {
  if (!raw || !/^\d{8}$/.test(raw)) return undefined;
  return `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`;
}

function formatMarketTime(date?: string, time?: string) {
  const day = formatMisDate(date);
  if (!time || !/^\d{6}$/.test(time)) return day || "";
  const clock = `${time.slice(0, 2)}:${time.slice(2, 4)}:${time.slice(4, 6)}`;
  return day ? `${day} ${clock}` : clock;
}

async function fetchTaiwanRealtimeQuote(symbol: string): Promise<RealtimeQuote | null> {
  const channel = twseMisChannel(symbol);
  if (!channel) return null;

  try {
    const url = `https://mis.twse.com.tw/stock/api/getStockInfo.jsp?ex_ch=${encodeURIComponent(channel)}&json=1&delay=0&_=${Date.now()}`;
    const data = await fetchRealtimeJson<TwseMisResponse>(url);
    const item = data.msgArray?.[0];
    if (!item) return null;

    const price = parseTaiwanNumber(item.z) ?? parseTaiwanNumber(item.pz);
    const previousClose = parseTaiwanNumber(item.y);
    if (price == null || previousClose == null || price <= 0 || previousClose <= 0) return null;

    const change = price - previousClose;
    return {
      price,
      previousClose,
      change,
      changePct: (change / previousClose) * 100,
      open: parseTaiwanNumber(item.o),
      high: parseTaiwanNumber(item.h),
      low: parseTaiwanNumber(item.l),
      volume: parseTaiwanNumber(item.v) ?? parseTaiwanNumber(item.tv),
      date: formatMisDate(item.d),
      time: item.t,
      source: "TWSE MIS 即時報價"
    };
  } catch {
    return null;
  }
}

function isTaiwanEquity(symbol?: string) {
  return Boolean(symbol?.toUpperCase().endsWith(".TW") || symbol?.toUpperCase().endsWith(".TWO"));
}

type TwseCompany = {
  公司代號?: string;
  公司名稱?: string;
  公司簡稱?: string;
  產業別?: string;
};

type TpexCompany = {
  SecuritiesCompanyCode?: string;
  CompanyName?: string;
  CompanyAbbreviation?: string;
  SecuritiesIndustryCode?: string;
};

async function loadOfficialStockUniverse(): Promise<StockProfile[]> {
  if (stockUniversePromise) return stockUniversePromise;

  stockUniversePromise = Promise.allSettled([
    fetchOfficialJson<TwseCompany[]>("https://openapi.twse.com.tw/v1/opendata/t187ap03_L"),
    fetchOfficialJson<TpexCompany[]>("https://www.tpex.org.tw/openapi/v1/mopsfin_t187ap03_O")
  ]).then((results) => {
    const stocks: StockProfile[] = [...COMMON_TW_STOCKS];

    const twse = results[0].status === "fulfilled" ? results[0].value : [];
    for (const item of twse) {
      const code = item.公司代號?.trim();
      const name = item.公司簡稱?.trim() || item.公司名稱?.trim();
      if (!code || !name || !/^\d{4,6}$/.test(code)) continue;
      stocks.push({
        symbol: `${code}.TW`,
        name,
        market: "TWSE",
        industry: item.產業別?.trim() || "上市公司",
        sector: "台股",
        aliases: [item.公司名稱?.trim(), item.公司簡稱?.trim()].filter((value): value is string => Boolean(value))
      });
    }

    const tpex = results[1].status === "fulfilled" ? results[1].value : [];
    for (const item of tpex) {
      const code = item.SecuritiesCompanyCode?.trim();
      const name = item.CompanyAbbreviation?.trim() || item.CompanyName?.trim();
      if (!code || !name || !/^\d{4,6}$/.test(code)) continue;
      stocks.push({
        symbol: `${code}.TWO`,
        name,
        market: "TPEX",
        industry: item.SecuritiesIndustryCode?.trim() || "上櫃公司",
        sector: "台股",
        aliases: [item.CompanyName?.trim(), item.CompanyAbbreviation?.trim()].filter((value): value is string => Boolean(value))
      });
    }

    return Array.from(new Map(stocks.map((stock) => [stock.symbol, stock])).values());
  });

  return stockUniversePromise;
}

async function searchOfficialStocks(query: string): Promise<StockProfile[]> {
  const q = normalizeText(query);
  if (!q) return COMMON_TW_STOCKS;
  const universe = await loadOfficialStockUniverse();
  const scored = universe.map((stock) => {
    const name = normalizeText(stock.name);
    const symbol = normalizeText(stock.symbol);
    const code = symbol.replace(/\.(TW|TWO)$/, "");
    const aliases = (stock.aliases ?? []).map(normalizeText);
    const names = [name, ...aliases];

    let score = 0;
    if (symbol === q || code === q) score = 120;
    else if (names.some((value) => value === q)) score = 110;
    else if (names.some((value) => value.startsWith(q))) score = 90;
    else if (names.some((value) => value.includes(q))) score = 70;
    else if (symbol.includes(q)) score = 50;

    return { stock, score };
  });

  return scored
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || a.stock.symbol.localeCompare(b.stock.symbol))
    .map((item) => item.stock);
}

async function findOfficialBySymbol(symbol: string): Promise<StockProfile | undefined> {
  const normalized = cleanSymbol(symbol);
  const universe = await loadOfficialStockUniverse();
  return universe.find((stock) => stock.symbol === normalized);
}

function commonStockCode(code?: string) {
  return Boolean(code && /^\d{4}$/.test(code) && !code.startsWith("00"));
}

function scanSetupScore(row: {
  price: number;
  changePct: number;
  tradeValue: number;
  volume: number;
  open: number;
  high: number;
  low: number;
}) {
  const range = row.high - row.low;
  const closePosition = range > 0 ? (row.price - row.low) / range : 0.5;
  const valueMillions = row.tradeValue / 1_000_000;
  const liquidityScore = Math.min(30, Math.max(0, Math.log10(Math.max(1, valueMillions)) * 8));
  const volumeScore = Math.min(16, Math.max(0, Math.log10(Math.max(1, row.volume / 1000)) * 2.5));
  const momentumScore = Math.max(-18, Math.min(24, row.changePct * 3.2));
  const closeStrengthScore = (closePosition - 0.5) * 18;
  const affordableBonus = row.price <= 100 ? 12 : row.price <= 150 ? 5 : 0;
  const pennyPenalty = row.price < 10 ? 10 : 0;
  const overheatPenalty = row.changePct >= 9.4 ? 12 : row.changePct >= 7.5 ? 5 : 0;

  return Number((50 + liquidityScore + volumeScore + momentumScore + closeStrengthScore + affordableBonus - pennyPenalty - overheatPenalty).toFixed(2));
}

function quoteChangePct(price: number, change: number) {
  const previous = price - change;
  return previous > 0 ? (change / previous) * 100 : 0;
}

function profileForQuote(
  profileMap: Map<string, StockProfile>,
  symbol: string,
  name: string,
  market: "TWSE" | "TPEX"
): StockProfile {
  const known = profileMap.get(symbol);
  if (known) return known;
  return {
    symbol,
    name,
    market,
    industry: market === "TWSE" ? "上市公司" : "上櫃公司",
    sector: "台股",
    aliases: [name]
  };
}

function buildMarketScanCandidate(
  profileMap: Map<string, StockProfile>,
  input: {
    symbol: string;
    name: string;
    market: "TWSE" | "TPEX";
    price?: number;
    change?: number;
    open?: number;
    high?: number;
    low?: number;
    volume?: number;
    tradeValue?: number;
    quoteDate?: string;
    source: string;
  }
): MarketScanCandidate | null {
  const price = input.price ?? 0;
  const change = input.change ?? 0;
  const open = input.open ?? price;
  const high = input.high ?? price;
  const low = input.low ?? price;
  const volume = input.volume ?? 0;
  const tradeValue = input.tradeValue ?? 0;
  if (!Number.isFinite(price) || price <= 0 || volume <= 0 || tradeValue <= 0) return null;

  const profile = profileForQuote(profileMap, input.symbol, input.name, input.market);
  const changePct = quoteChangePct(price, change);
  return {
    ...profile,
    price,
    change,
    changePct,
    tradeValue,
    volume,
    setupScore: scanSetupScore({ price, changePct, tradeValue, volume, open, high, low }),
    quoteDate: input.quoteDate || "",
    source: input.source
  };
}

function mergeMarketCandidates(candidates: MarketScanCandidate[], limit: number) {
  const qualified = candidates.filter((item) => item.price >= 10 && item.tradeValue >= 8_000_000);
  const byScore = [...qualified].sort((a, b) => b.setupScore - a.setupScore || b.tradeValue - a.tradeValue);
  const lowPrice = byScore.filter((item) => item.price <= 100).slice(0, Math.max(10, Math.ceil(limit * 0.4)));
  const liquidMomentum = byScore.slice(0, limit * 2);
  const merged = new Map<string, MarketScanCandidate>();

  for (const item of [...lowPrice, ...liquidMomentum]) {
    if (!merged.has(item.symbol)) merged.set(item.symbol, item);
    if (merged.size >= limit) break;
  }

  return {
    qualifiedCount: qualified.length,
    candidates: Array.from(merged.values()).sort((a, b) => b.setupScore - a.setupScore || b.tradeValue - a.tradeValue)
  };
}

export async function loadWholeMarketRecommendationUniverse(limit = 60): Promise<WholeMarketRecommendationUniverse> {
  const safeLimit = Math.max(12, Math.min(120, Math.round(limit)));
  if (recommendationUniverseCache && Date.now() - recommendationUniverseCache.at < 60_000) {
    const cached = recommendationUniverseCache.data;
    return { ...cached, candidates: cached.candidates.slice(0, safeLimit) };
  }

  const [twseResult, tpexResult, universeResult] = await Promise.allSettled([
    fetchJson<TwseDayAllQuote[]>("https://openapi.twse.com.tw/v1/exchangeReport/STOCK_DAY_ALL"),
    fetchJson<TpexDailyCloseQuote[]>("https://www.tpex.org.tw/openapi/v1/tpex_mainboard_daily_close_quotes"),
    loadOfficialStockUniverse()
  ]);
  const profiles = universeResult.status === "fulfilled" ? universeResult.value : COMMON_TW_STOCKS;
  const profileMap = new Map(profiles.map((stock) => [stock.symbol, stock]));
  const rows: MarketScanCandidate[] = [];

  if (twseResult.status === "fulfilled") {
    for (const item of twseResult.value) {
      const code = item.Code?.trim();
      if (!commonStockCode(code)) continue;
      const candidate = buildMarketScanCandidate(profileMap, {
        symbol: `${code}.TW`,
        name: item.Name?.trim() || code!,
        market: "TWSE",
        price: parseTaiwanNumber(item.ClosingPrice),
        change: parseTaiwanNumber(item.Change),
        open: parseTaiwanNumber(item.OpeningPrice),
        high: parseTaiwanNumber(item.HighestPrice),
        low: parseTaiwanNumber(item.LowestPrice),
        volume: parseTaiwanNumber(item.TradeVolume),
        tradeValue: parseTaiwanNumber(item.TradeValue),
        quoteDate: item.Date,
        source: "TWSE 官方全市場日行情"
      });
      if (candidate) rows.push(candidate);
    }
  }

  if (tpexResult.status === "fulfilled") {
    for (const item of tpexResult.value) {
      const code = item.SecuritiesCompanyCode?.trim();
      if (!commonStockCode(code)) continue;
      const candidate = buildMarketScanCandidate(profileMap, {
        symbol: `${code}.TWO`,
        name: item.CompanyName?.trim() || code!,
        market: "TPEX",
        price: parseTaiwanNumber(item.Close),
        change: parseTaiwanNumber(item.Change),
        open: parseTaiwanNumber(item.Open),
        high: parseTaiwanNumber(item.High),
        low: parseTaiwanNumber(item.Low),
        volume: parseTaiwanNumber(item.TradingShares),
        tradeValue: parseTaiwanNumber(item.TransactionAmount),
        quoteDate: item.Date,
        source: "TPEX 官方全市場日行情"
      });
      if (candidate) rows.push(candidate);
    }
  }

  if (rows.length === 0) throw new Error("無法取得 TWSE/TPEX 全市場日行情");

  const deduped = Array.from(new Map(rows.map((item) => [item.symbol, item])).values());
  const merged = mergeMarketCandidates(deduped, 120);
  const data: WholeMarketRecommendationUniverse = {
    source: "TWSE/TPEX 官方全市場日行情",
    universeCount: deduped.length,
    qualifiedCount: merged.qualifiedCount,
    candidates: merged.candidates
  };
  recommendationUniverseCache = { at: Date.now(), data };

  return { ...data, candidates: data.candidates.slice(0, safeLimit) };
}

async function loadMarginMaps() {
  if (marginMapsCache && Date.now() - marginMapsCache.at < 10 * 60_000) return marginMapsCache;

  const [twseResult, tpexResult] = await Promise.allSettled([
    fetchJson<Record<string, string>[]>("https://openapi.twse.com.tw/v1/exchangeReport/MI_MARGN"),
    fetchJson<TpexMarginBalance[]>("https://www.tpex.org.tw/openapi/v1/tpex_mainboard_margin_balance")
  ]);

  const twse = new Map<string, Record<string, string>>();
  if (twseResult.status === "fulfilled") {
    for (const row of twseResult.value) {
      const code = row["股票代號"]?.trim();
      if (code) twse.set(code, row);
    }
  }

  const tpex = new Map<string, Record<string, string>>();
  if (tpexResult.status === "fulfilled") {
    for (const row of tpexResult.value) {
      const code = row.SecuritiesCompanyCode?.trim();
      if (code) tpex.set(code, row);
    }
  }

  marginMapsCache = { at: Date.now(), twse, tpex };
  return marginMapsCache;
}

function blankMarketMarginOverview(summary: string): MarketMarginOverview {
  return {
    available: false,
    source: "TWSE/TPEX 官方融資融券 OpenAPI",
    date: "",
    marketCount: 0,
    currentAmount: 0,
    previousAmount: 0,
    changeAmount: 0,
    changePct: 0,
    marginBalance: 0,
    previousMarginBalance: 0,
    balanceChange: 0,
    balanceChangePct: 0,
    marginLimit: 0,
    utilizationPct: 0,
    turnover: 0,
    amountToTurnoverPct: 0,
    listedAmount: 0,
    listedChangeAmount: 0,
    otcAmount: 0,
    otcChangeAmount: 0,
    safety: {
      level: "資料不足",
      score: 0,
      summary,
      warnings: [
        {
          id: "market-margin-data-missing",
          label: "資料不足",
          severity: "warn",
          message: summary,
          triggeredValue: "官方資料暫缺"
        }
      ]
    }
  };
}

function buildMarketMarginWarning(
  id: string,
  label: string,
  severity: AlertSeverity,
  message: string,
  triggeredValue: string
): MarketMarginWarning {
  return { id, label, severity, message, triggeredValue };
}

function buildMarketMarginSafety(input: {
  marketCount: number;
  changeAmount: number;
  changePct: number;
  balanceChangePct: number;
  utilizationPct: number;
  amountToTurnoverPct: number;
}) {
  if (input.marketCount === 0) return blankMarketMarginOverview("官方融資資料暫時不足，無法判斷大盤融資水位。").safety;

  let score = 100;
  const warnings: MarketMarginWarning[] = [];
  const addWarning = (points: number, warning: MarketMarginWarning) => {
    score -= points;
    warnings.push(warning);
  };

  if (input.utilizationPct >= 25) {
    addWarning(
      28,
      buildMarketMarginWarning(
        "market-margin-utilization-danger",
        "融資使用率過高",
        "danger",
        "全市場融資使用率已進入高壓區，籌碼遇到急跌時較容易被迫降槓桿。",
        `${input.utilizationPct.toFixed(2)}%`
      )
    );
  } else if (input.utilizationPct >= 18) {
    addWarning(
      18,
      buildMarketMarginWarning(
        "market-margin-utilization-warn",
        "融資使用率偏高",
        "warn",
        "融資使用率偏高，追價時要降低部位，避免大盤回檔時融資賣壓放大。",
        `${input.utilizationPct.toFixed(2)}%`
      )
    );
  } else if (input.utilizationPct >= 12) {
    addWarning(
      8,
      buildMarketMarginWarning(
        "market-margin-utilization-watch",
        "融資使用率升溫",
        "info",
        "融資使用率開始升溫，仍可交易，但需要同步看量價是否健康。",
        `${input.utilizationPct.toFixed(2)}%`
      )
    );
  }

  if (input.balanceChangePct >= 3) {
    addWarning(
      24,
      buildMarketMarginWarning(
        "market-margin-balance-surge",
        "融資餘額急增",
        "danger",
        "融資餘額單日急增，代表散戶槓桿追價明顯升高，隔日若量縮容易壓回。",
        `${input.balanceChangePct.toFixed(2)}%`
      )
    );
  } else if (input.balanceChangePct >= 1.5) {
    addWarning(
      14,
      buildMarketMarginWarning(
        "market-margin-balance-rise",
        "融資餘額增加",
        "warn",
        "融資餘額增加速度偏快，若大盤同步轉弱，需提高停損紀律。",
        `${input.balanceChangePct.toFixed(2)}%`
      )
    );
  } else if (input.balanceChangePct > 0.5) {
    addWarning(
      6,
      buildMarketMarginWarning(
        "market-margin-balance-watch",
        "融資餘額溫和增加",
        "info",
        "融資餘額溫和增加，尚未達危險區，但不適合無停損追高。",
        `${input.balanceChangePct.toFixed(2)}%`
      )
    );
  }

  if (input.amountToTurnoverPct >= 900) {
    addWarning(
      24,
      buildMarketMarginWarning(
        "market-margin-turnover-danger",
        "融資總額相對成交值過高",
        "danger",
        "融資水位相對市場成交值偏重，代表短線承接力不足時，融資籌碼會變成壓力。",
        `${input.amountToTurnoverPct.toFixed(2)}%`
      )
    );
  } else if (input.amountToTurnoverPct >= 650) {
    addWarning(
      14,
      buildMarketMarginWarning(
        "market-margin-turnover-warn",
        "融資水位偏重",
        "warn",
        "融資總額相對成交值偏重，適合偏保守操作，避免重倉追高。",
        `${input.amountToTurnoverPct.toFixed(2)}%`
      )
    );
  } else if (input.amountToTurnoverPct >= 450) {
    addWarning(
      7,
      buildMarketMarginWarning(
        "market-margin-turnover-watch",
        "融資水位需觀察",
        "info",
        "融資總額相對成交值進入觀察區，須搭配大盤趨勢與法人買賣超確認。",
        `${input.amountToTurnoverPct.toFixed(2)}%`
      )
    );
  }

  if (input.changeAmount >= 20_000_000_000) {
    addWarning(
      18,
      buildMarketMarginWarning(
        "market-margin-money-danger",
        "融資金額大增",
        "danger",
        "融資水位單日增加金額過大，代表市場槓桿追價快速升高。",
        formatShortTwd(input.changeAmount)
      )
    );
  } else if (input.changeAmount >= 8_000_000_000) {
    addWarning(
      10,
      buildMarketMarginWarning(
        "market-margin-money-warn",
        "融資金額增加",
        "warn",
        "融資水位單日增加金額偏高，短線要避免買在情緒最熱的位置。",
        formatShortTwd(input.changeAmount)
      )
    );
  } else if (input.changeAmount > 0) {
    addWarning(
      4,
      buildMarketMarginWarning(
        "market-margin-money-up",
        "融資金額小增",
        "info",
        "融資水位小幅增加，尚未達明顯風險，但仍需搭配大盤趨勢確認。",
        formatShortTwd(input.changeAmount)
      )
    );
  }

  score = Math.max(0, Math.min(100, Math.round(score)));
  const hasDanger = warnings.some((item) => item.severity === "danger");
  const hasWarn = warnings.some((item) => item.severity === "warn");
  let level: MarginSafetyLevel =
    score >= 80 ? "安全" : score >= 62 ? "注意" : score >= 42 ? "警戒" : "危險";
  if (hasDanger && (level === "安全" || level === "注意")) level = "警戒";
  if (hasWarn && level === "安全") level = "注意";

  if (warnings.length === 0) {
    warnings.push(
      buildMarketMarginWarning(
        "market-margin-safe",
        "融資水位安全",
        "info",
        "融資水位、增幅與相對成交值都未達警戒門檻。",
        `安全分數 ${score}`
      )
    );
  }

  const summary =
    level === "安全"
      ? "大盤融資水位健康，槓桿風險暫低。"
      : level === "注意"
        ? "融資水位開始升溫，仍可交易但不宜重倉追高。"
        : level === "警戒"
          ? "融資籌碼偏熱，短線回檔時賣壓可能放大。"
          : "融資水位高風險，應降低槓桿與追價部位。";

  return { level, score, summary, warnings };
}

export async function marketMarginOverview(): Promise<MarketMarginOverview> {
  if (marketMarginCache && Date.now() - marketMarginCache.at < 60_000) return marketMarginCache.data;

  try {
    const [marginMaps, twseResult, tpexResult] = await Promise.all([
      loadMarginMaps(),
      fetchJson<TwseDayAllQuote[]>("https://openapi.twse.com.tw/v1/exchangeReport/STOCK_DAY_ALL"),
      fetchJson<TpexDailyCloseQuote[]>("https://www.tpex.org.tw/openapi/v1/tpex_mainboard_daily_close_quotes")
    ]);

    const rows: Array<{
      code: string;
      market: "TWSE" | "TPEX";
      price: number;
      tradeValue: number;
      date: string;
      marginPreviousBalance: number;
      marginBalance: number;
      marginLimit: number;
    }> = [];

    for (const item of twseResult) {
      const code = item.Code?.trim();
      if (!commonStockCode(code)) continue;
      const margin = marginMaps.twse.get(code!);
      if (!margin) continue;
      const price = parseTaiwanNumber(item.ClosingPrice) ?? 0;
      const tradeValue = parseTaiwanNumber(item.TradeValue) ?? 0;
      const marginPreviousBalance = parseNumberOrZero(margin["融資前日餘額"]);
      const marginBalance = parseNumberOrZero(margin["融資今日餘額"]);
      const marginLimit = parseNumberOrZero(margin["融資限額"]);
      if (price <= 0 || marginBalance <= 0) continue;
      rows.push({
        code: code!,
        market: "TWSE",
        price,
        tradeValue,
        date: quoteDateToIso(item.Date),
        marginPreviousBalance,
        marginBalance,
        marginLimit
      });
    }

    for (const item of tpexResult) {
      const code = item.SecuritiesCompanyCode?.trim();
      if (!commonStockCode(code)) continue;
      const margin = marginMaps.tpex.get(code!) as TpexMarginBalance | undefined;
      if (!margin) continue;
      const price = parseTaiwanNumber(item.Close) ?? 0;
      const tradeValue = parseTaiwanNumber(item.TransactionAmount) ?? 0;
      const marginPreviousBalance = parseNumberOrZero(margin.MarginPurchaseBalancePreviousDay);
      const marginBalance = parseNumberOrZero(margin.MarginPurchaseBalance);
      const marginLimit = parseNumberOrZero(margin.MarginPurchaseQuota);
      if (price <= 0 || marginBalance <= 0) continue;
      rows.push({
        code: code!,
        market: "TPEX",
        price,
        tradeValue,
        date: quoteDateToIso(item.Date || margin.Date),
        marginPreviousBalance,
        marginBalance,
        marginLimit
      });
    }

    if (rows.length === 0) return blankMarketMarginOverview("TWSE/TPEX 官方融資資料暫時沒有可彙總的普通股。");

    const summary = rows.reduce(
      (acc, row) => {
        const currentAmount = row.marginBalance * 1000 * row.price;
        const previousAmount = row.marginPreviousBalance * 1000 * row.price;
        acc.currentAmount += currentAmount;
        acc.previousAmount += previousAmount;
        acc.marginBalance += row.marginBalance;
        acc.previousMarginBalance += row.marginPreviousBalance;
        acc.marginLimit += row.marginLimit;
        acc.turnover += row.tradeValue;
        if (row.market === "TWSE") {
          acc.listedAmount += currentAmount;
          acc.listedChangeAmount += currentAmount - previousAmount;
        } else {
          acc.otcAmount += currentAmount;
          acc.otcChangeAmount += currentAmount - previousAmount;
        }
        if (row.date && row.date > acc.date) acc.date = row.date;
        return acc;
      },
      {
        currentAmount: 0,
        previousAmount: 0,
        marginBalance: 0,
        previousMarginBalance: 0,
        marginLimit: 0,
        turnover: 0,
        listedAmount: 0,
        listedChangeAmount: 0,
        otcAmount: 0,
        otcChangeAmount: 0,
        date: ""
      }
    );

    const changeAmount = summary.currentAmount - summary.previousAmount;
    const changePct = summary.previousAmount > 0 ? (changeAmount / summary.previousAmount) * 100 : 0;
    const balanceChange = summary.marginBalance - summary.previousMarginBalance;
    const balanceChangePct =
      summary.previousMarginBalance > 0 ? (balanceChange / summary.previousMarginBalance) * 100 : 0;
    const utilizationPct = summary.marginLimit > 0 ? (summary.marginBalance / summary.marginLimit) * 100 : 0;
    const amountToTurnoverPct = summary.turnover > 0 ? (summary.currentAmount / summary.turnover) * 100 : 0;

    const data: MarketMarginOverview = {
      available: true,
      source: "TWSE/TPEX 官方融資融券 OpenAPI + 官方每日收盤價",
      date: summary.date,
      marketCount: rows.length,
      currentAmount: summary.currentAmount,
      previousAmount: summary.previousAmount,
      changeAmount,
      changePct,
      marginBalance: summary.marginBalance,
      previousMarginBalance: summary.previousMarginBalance,
      balanceChange,
      balanceChangePct,
      marginLimit: summary.marginLimit,
      utilizationPct,
      turnover: summary.turnover,
      amountToTurnoverPct,
      listedAmount: summary.listedAmount,
      listedChangeAmount: summary.listedChangeAmount,
      otcAmount: summary.otcAmount,
      otcChangeAmount: summary.otcChangeAmount,
      safety: buildMarketMarginSafety({
        marketCount: rows.length,
        changeAmount,
        changePct,
        balanceChangePct,
        utilizationPct,
        amountToTurnoverPct
      })
    };
    marketMarginCache = { at: Date.now(), data };
    return data;
  } catch {
    const data = blankMarketMarginOverview("TWSE/TPEX 官方融資水位暫時抓取失敗，請稍後再更新。");
    marketMarginCache = { at: Date.now(), data };
    return data;
  }
}

export async function fetchMarginTrading(symbol: string, price: number, averageTurnover: number): Promise<MarginInfo> {
  const normalized = cleanSymbol(symbol);
  const code = stockCode(normalized);
  if (!/^\d{4,6}$/.test(code) || (!normalized.endsWith(".TW") && !normalized.endsWith(".TWO"))) {
    return blankMarginInfo(normalized, "非台股標的，沒有融資融券資料。");
  }

  try {
    const maps = await loadMarginMaps();

    if (normalized.endsWith(".TWO")) {
      const row = maps.tpex.get(code) as TpexMarginBalance | undefined;
      if (!row) return blankMarginInfo(normalized, "TPEX 官方融資融券資料暫無此股票。");

      return completeMarginInfo({
        source: "TPEX 上櫃融資融券 OpenAPI",
        date: rocDateToIso(row.Date),
        marginBuy: parseNumberOrZero(row.MarginPurchase),
        marginSell: parseNumberOrZero(row.MarginSales),
        marginCashRepayment: parseNumberOrZero(row.CashRedemption),
        marginPreviousBalance: parseNumberOrZero(row.MarginPurchaseBalancePreviousDay),
        marginBalance: parseNumberOrZero(row.MarginPurchaseBalance),
        marginLimit: parseNumberOrZero(row.MarginPurchaseQuota),
        marginUtilizationPct: parseNumberOrZero(row.MarginPurchaseUtilizationRate),
        shortSell: parseNumberOrZero(row.ShortSale),
        shortCover: parseNumberOrZero(row.ShortConvering),
        shortPreviousBalance: parseNumberOrZero(row.ShortSaleBalancePreviousDay),
        shortBalance: parseNumberOrZero(row.ShortSaleBalance),
        shortUtilizationPct: parseNumberOrZero(row.ShortSaleUtilizationRate),
        note: row.Note?.trim() || "",
        price,
        averageTurnover
      });
    }

    const row = maps.twse.get(code);
    if (!row) return blankMarginInfo(normalized, "TWSE 官方融資融券資料暫無此股票。");

    return completeMarginInfo({
      source: "TWSE 上市融資融券 OpenAPI",
      date: "",
      marginBuy: parseNumberOrZero(row["融資買進"]),
      marginSell: parseNumberOrZero(row["融資賣出"]),
      marginCashRepayment: parseNumberOrZero(row["融資現金償還"]),
      marginPreviousBalance: parseNumberOrZero(row["融資前日餘額"]),
      marginBalance: parseNumberOrZero(row["融資今日餘額"]),
      marginLimit: parseNumberOrZero(row["融資限額"]),
      marginUtilizationPct: 0,
      shortSell: parseNumberOrZero(row["融券賣出"]),
      shortCover: parseNumberOrZero(row["融券買進"]),
      shortPreviousBalance: parseNumberOrZero(row["融券前日餘額"]),
      shortBalance: parseNumberOrZero(row["融券今日餘額"]),
      shortUtilizationPct: 0,
      note: row["註記"]?.trim() || "",
      price,
      averageTurnover
    });
  } catch {
    return blankMarginInfo(normalized, "官方融資融券資料暫時抓取失敗，分析已降權處理。");
  }
}

export async function yahooSearchStocks(query: string): Promise<StockProfile[]> {
  const q = query.trim();
  if (!q) return await loadOfficialStockUniverse();

  const known = await searchOfficialStocks(q);
  const url = `https://query2.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(q)}&lang=zh-TW&region=TW&quotesCount=10&newsCount=0`;

  try {
    const data = await fetchJson<YahooSearchResponse>(url);
    const remote =
      data.quotes
        ?.filter((quote) => quote.quoteType === "EQUITY" && isTaiwanEquity(quote.symbol))
        .map((quote) => stockFromSymbol(quote.symbol || "", quote.shortname || quote.longname))
        .filter((stock) => stock.symbol) ?? [];

    const merged = [...known, ...remote];
    return Array.from(new Map(merged.map((stock) => [stock.symbol, stock])).values());
  } catch {
    if (known.length > 0) return known;
    if (/^\d{4,6}$/.test(q)) return [stockFromSymbol(`${q}.TW`), stockFromSymbol(`${q}.TWO`)];
    return [];
  }
}

async function fetchChart(symbol: string, range = "2y", interval = "1d") {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=${range}&interval=${interval}&events=history&includeAdjustedClose=true&lang=zh-TW&region=TW`;
  const data = await fetchJson<YahooChartResponse>(url);
  const result = data.chart?.result?.[0];
  if (!result || data.chart?.error) {
    throw new Error(data.chart?.error?.description || `找不到 ${symbol} 的 Yahoo Finance K 線資料`);
  }
  return result;
}

export async function downloadPriceBars(symbol: string): Promise<PriceBar[]> {
  const normalized = cleanSymbol(symbol);
  const result = await fetchChart(normalized);
  const timestamps = result.timestamp ?? [];
  const quote = result.indicators?.quote?.[0];
  if (!quote || timestamps.length === 0) {
    throw new Error(`找不到 ${symbol} 的歷史價格資料`);
  }

  const bars: PriceBar[] = [];
  for (let index = 0; index < timestamps.length; index += 1) {
    const open = quote.open?.[index];
    const high = quote.high?.[index];
    const low = quote.low?.[index];
    const close = quote.close?.[index];
    if (open == null || high == null || low == null || close == null) continue;
    const volume = quote.volume?.[index] ?? 0;
    bars.push({
      date: new Date(timestamps[index] * 1000).toISOString().slice(0, 10),
      open,
      high,
      low,
      close,
      volume,
      turnover: close * volume
    });
  }

  if (bars.length < 80) {
    throw new Error(`${symbol} 可用 K 線不足，無法進行完整分析`);
  }

  const realtime = await fetchTaiwanRealtimeQuote(normalized);
  const last = bars[bars.length - 1];
  if (realtime?.date && realtime.price > 0 && realtime.date >= last.date) {
    const intradayBar = {
      date: realtime.date,
      open: realtime.open ?? last.open,
      high: Math.max(realtime.high ?? realtime.price, last.high, realtime.price),
      low: Math.min(realtime.low ?? realtime.price, last.low, realtime.price),
      close: realtime.price,
      volume: realtime.volume && realtime.volume > 0 ? realtime.volume : last.volume,
      turnover: realtime.price * (realtime.volume && realtime.volume > 0 ? realtime.volume : last.volume)
    };

    if (realtime.date === last.date) {
      bars[bars.length - 1] = intradayBar;
    } else {
      bars.push(intradayBar);
    }
  }

  return bars;
}

export async function resolveStock(query: string): Promise<StockProfile> {
  const input = cleanSymbol(query);
  if (!input) throw new Error("請輸入股票代號或股票名稱");

  if (input.endsWith(".TW") || input.endsWith(".TWO")) {
    return (await findOfficialBySymbol(input)) ?? stockFromSymbol(input);
  }

  if (/^\d{4,6}$/.test(input)) {
    const candidates = [`${input}.TW`, `${input}.TWO`];
    for (const candidate of candidates) {
      try {
        const official = await findOfficialBySymbol(candidate);
        if (official) return official;
        const profile = stockFromSymbol(candidate);
        await downloadPriceBars(candidate);
        return profile;
      } catch {
        // Try the next market suffix.
      }
    }
    throw new Error(`找不到 ${input} 的上市或上櫃價格資料`);
  }

  const officialResults = await searchOfficialStocks(query);
  if (officialResults.length > 0) return officialResults[0];

  const results = await yahooSearchStocks(query);
  for (const stock of results) {
    try {
      await downloadPriceBars(stock.symbol);
      return stock;
    } catch {
      // Keep searching until a candidate has valid chart data.
    }
  }
  throw new Error(`找不到符合「${query}」的台股標的`);
}

export async function getStockProfile(query: string): Promise<StockProfile> {
  return resolveStock(query);
}

function sentimentFromTitle(title: string) {
  const positive = ["成長", "上修", "利多", "突破", "接單", "旺", "新高", "看好", "買超", "擴產", "AI"];
  const negative = ["下修", "利空", "衰退", "虧損", "跌", "賣超", "警訊", "降評", "減產", "風險"];
  const score = positive.reduce((sum, word) => sum + (title.includes(word) ? 1 : 0), 0) -
    negative.reduce((sum, word) => sum + (title.includes(word) ? 1 : 0), 0);
  return Math.max(-1, Math.min(1, score / 3));
}

export async function getStockNews(stock: StockProfile) {
  const url = `https://query2.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(`${stock.symbol} ${stock.name}`)}&lang=zh-TW&region=TW&quotesCount=0&newsCount=6`;
  try {
    const data = await fetchJson<YahooSearchResponse>(url);
    return (
      data.news?.map((item) => ({
        title: item.title || "未命名新聞",
        source: item.publisher || "Yahoo Finance",
        link: item.link || "",
        publishedAt: item.providerPublishTime ? new Date(item.providerPublishTime * 1000).toISOString() : "",
        sentiment: sentimentFromTitle(item.title || "")
      })) ?? []
    );
  } catch {
    return [];
  }
}

export async function marketSnapshot() {
  if (marketCache && Date.now() - marketCache.at < 15_000) return marketCache.data;

  const quotes = await marketOverviewQuotes();
  const data = Object.fromEntries(quotes.map((quote) => [quote.symbol, quote.changePct]));
  marketCache = { at: Date.now(), data };
  return data;
}

function taifexActiveContract(items: TaifexQuoteItem[], sessionSuffix: "-F" | "-M") {
  return items
    .filter((item) => item.SymbolID?.startsWith("TXF") && item.SymbolID.endsWith(sessionSuffix))
    .map((item) => ({
      item,
      volume: parseTaiwanNumber(item.CTotalVolume) ?? 0,
      price: parseTaiwanNumber(item.CLastPrice) ?? 0
    }))
    .filter((row) => row.price > 0)
    .sort((a, b) => b.volume - a.volume || a.item.SymbolID!.localeCompare(b.item.SymbolID!))[0]?.item;
}

function taifexQuoteToMarketQuote(item: TaifexQuoteItem, label: string, session: string): MarketQuote {
  const price = parseTaiwanNumber(item.CLastPrice) ?? 0;
  const previousClose = parseTaiwanNumber(item.CRefPrice) ?? price;
  const change = parseTaiwanNumber(item.CDiff) ?? price - previousClose;
  const changePct = parseTaiwanNumber(item.CDiffRate) ?? (previousClose ? (change / previousClose) * 100 : 0);
  return {
    symbol: item.SymbolID || label,
    label,
    group: "twfutures",
    price,
    previousClose,
    change,
    changePct,
    source: "TAIFEX 官方即時行情",
    session: `${session} · ${formatMarketTime(item.CDate, item.CTime)}`
  };
}

async function taifexIndexFuturesQuotes(): Promise<MarketQuote[]> {
  const data = await fetchTaifexJson<TaifexQuoteResponse>("https://mis.taifex.com.tw/futures/api/getQuoteList", {});
  const items = data.RtData?.QuoteList ?? [];
  const day = taifexActiveContract(items, "-F");
  const night = taifexActiveContract(items, "-M");
  const rows: MarketQuote[] = [];

  if (day) rows.push(taifexQuoteToMarketQuote(day, "台指期日盤", "日盤"));
  if (night) rows.push(taifexQuoteToMarketQuote(night, "台指期夜盤", "夜盤"));
  return rows;
}

const MARKET_SYMBOLS: Array<{ symbol: string; label: string; group: MarketQuote["group"] }> = [
  { symbol: "^TWII", label: "台股加權", group: "tw" },
  { symbol: "^N225", label: "日本日經 225", group: "asia" },
  { symbol: "^KS11", label: "韓國 KOSPI", group: "asia" },
  { symbol: "^KQ11", label: "韓國 KOSDAQ", group: "asia" },
  { symbol: "^IXIC", label: "Nasdaq", group: "us" },
  { symbol: "^GSPC", label: "S&P 500", group: "us" },
  { symbol: "^DJI", label: "道瓊", group: "us" },
  { symbol: "^SOX", label: "費半", group: "us" },
  { symbol: "NQ=F", label: "Nasdaq 100 期貨", group: "futures" },
  { symbol: "ES=F", label: "S&P 500 期貨", group: "futures" },
  { symbol: "YM=F", label: "道瓊期貨", group: "futures" },
  { symbol: "RTY=F", label: "Russell 2000 期貨", group: "futures" },
  { symbol: "DX-Y.NYB", label: "美元指數", group: "macro" },
  { symbol: "GC=F", label: "黃金期貨", group: "macro" },
  { symbol: "CL=F", label: "原油期貨", group: "macro" },
  { symbol: "^VIX", label: "VIX", group: "macro" },
  { symbol: "BTC-USD", label: "BTC", group: "crypto" }
];

function futuresSessionLabel(now = new Date()) {
  const taipeiHour = Number(new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Taipei", hour: "2-digit", hour12: false }).format(now));
  return taipeiHour >= 6 && taipeiHour < 18 ? "日盤 / 電子盤" : "夜盤 / 電子盤";
}

async function quoteFromChart(item: { symbol: string; label: string; group: MarketQuote["group"] }): Promise<MarketQuote> {
  const realtime = await fetchTaiwanRealtimeQuote(item.symbol);
  if (realtime) {
    return {
      symbol: item.symbol,
      label: item.label,
      group: item.group,
      price: realtime.price,
      previousClose: realtime.previousClose,
      change: realtime.change,
      changePct: realtime.changePct,
      source: realtime.source,
      session: realtime.time ? `即時 ${realtime.time}` : "即時報價"
    };
  }

  let result: Awaited<ReturnType<typeof fetchChart>>;
  try {
    result = await fetchChart(item.symbol, "1d", "1m");
  } catch {
    result = await fetchChart(item.symbol, "5d", "1d");
  }
  const meta = result.meta;
  const quote = result.indicators?.quote?.[0];
  const closes = quote?.close?.filter((value): value is number => value != null) ?? [];
  const price = meta?.regularMarketPrice ?? closes[closes.length - 1] ?? 0;
  const previousClose = meta?.previousClose ?? meta?.chartPreviousClose ?? closes[closes.length - 2] ?? price;
  const change = price - previousClose;
  const changePct = previousClose ? (change / previousClose) * 100 : 0;
  return {
    symbol: item.symbol,
    label: item.label,
    group: item.group,
    price,
    previousClose,
    change,
    changePct,
    source: "Yahoo Finance",
    session: item.group === "futures" ? futuresSessionLabel() : "最新報價"
  };
}

export async function marketOverviewQuotes(): Promise<MarketQuote[]> {
  if (marketQuoteCache && Date.now() - marketQuoteCache.at < 15_000) return marketQuoteCache.data;

  const [marketEntries, twFutureEntries] = await Promise.all([
    Promise.allSettled(MARKET_SYMBOLS.map((item) => quoteFromChart(item))),
    taifexIndexFuturesQuotes().catch(() => [])
  ]);
  const data = marketEntries
    .map((entry, index) =>
      entry.status === "fulfilled"
        ? entry.value
        : {
            ...MARKET_SYMBOLS[index],
            price: 0,
            previousClose: 0,
            change: 0,
            changePct: 0,
            source: "Yahoo Finance",
            session: MARKET_SYMBOLS[index].group === "futures" ? futuresSessionLabel() : "資料暫缺"
          }
    )
    .flatMap((quote, index) => (index === 1 ? [...twFutureEntries, quote] : [quote]));
  marketQuoteCache = { at: Date.now(), data };
  return data;
}
