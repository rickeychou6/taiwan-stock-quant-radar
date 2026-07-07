import type { PriceBar, StockProfile } from "@/lib/types";

export const stocks: StockProfile[] = [
  { symbol: "2330.TW", name: "台積電", market: "TWSE", industry: "半導體", sector: "電子" },
  { symbol: "2317.TW", name: "鴻海", market: "TWSE", industry: "電子製造", sector: "電子" },
  { symbol: "2454.TW", name: "聯發科", market: "TWSE", industry: "IC 設計", sector: "電子" },
  { symbol: "3008.TW", name: "大立光", market: "TWSE", industry: "光學", sector: "電子" },
  { symbol: "1303.TW", name: "南亞", market: "TWSE", industry: "塑化", sector: "傳產" },
  { symbol: "6285.TW", name: "啟碁", market: "TWSE", industry: "通訊設備", sector: "電子" },
  { symbol: "4976.TW", name: "佳凌", market: "TWSE", industry: "光學", sector: "電子" }
];

const seeds: Record<string, number> = {
  "2330.TW": 932,
  "2317.TW": 188,
  "2454.TW": 1260,
  "3008.TW": 2450,
  "1303.TW": 48,
  "6285.TW": 128,
  "4976.TW": 43
};

function wave(index: number, symbol: string) {
  const seed = symbol.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return Math.sin(index / 7 + seed) * 0.018 + Math.cos(index / 19 + seed / 10) * 0.012;
}

export function getStock(symbolOrName: string) {
  const q = symbolOrName.trim().toUpperCase();
  return stocks.find((stock) => stock.symbol.toUpperCase() === q || stock.name.includes(symbolOrName.trim())) ?? stocks[0];
}

export function searchStocks(query: string) {
  const q = query.trim().toUpperCase();
  if (!q) return stocks;
  return stocks.filter((stock) => stock.symbol.toUpperCase().includes(q) || stock.name.includes(query.trim()));
}

export function generatePrices(symbol: string, days = 320): PriceBar[] {
  const base = seeds[symbol] ?? 100;
  const now = new Date("2026-07-07T00:00:00+08:00");
  let close = base;
  const rows: PriceBar[] = [];
  for (let i = days; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(now.getDate() - i);
    if (date.getDay() === 0 || date.getDay() === 6) continue;
    const drift = symbol === "2330.TW" || symbol === "6285.TW" ? 0.002 : symbol === "1303.TW" ? -0.0004 : 0.0008;
    const change = drift + wave(rows.length, symbol);
    const open = close * (1 + wave(rows.length + 3, symbol) * 0.35);
    close = Math.max(8, close * (1 + change));
    const high = Math.max(open, close) * (1 + 0.008 + Math.abs(wave(rows.length + 5, symbol)) * 0.8);
    const low = Math.min(open, close) * (1 - 0.008 - Math.abs(wave(rows.length + 2, symbol)) * 0.7);
    const volume = Math.round((9000 + Math.abs(wave(rows.length + 8, symbol)) * 240000) * (base > 1000 ? 0.2 : 1));
    rows.push({
      date: date.toISOString().slice(0, 10),
      open: Number(open.toFixed(2)),
      high: Number(high.toFixed(2)),
      low: Number(low.toFixed(2)),
      close: Number(close.toFixed(2)),
      volume,
      turnover: Math.round(volume * close)
    });
  }
  return rows;
}

export const mockChipData = {
  foreignBuy: 8420,
  trustBuy: 1260,
  dealerBuy: -830,
  marginDelta: -620,
  shortDelta: 120,
  lendingBalance: 18400,
  bigHolderBias: "大戶持股小幅增加"
};

export const mockFundamental = {
  revenueYoY: 18.4,
  revenueMoM: 4.2,
  eps: 38.7,
  grossMargin: 54.1,
  operatingMargin: 42.8,
  roe: 29.4,
  pe: 22.5,
  pb: 5.8,
  dividendYield: 1.9
};

export const mockNews = [
  { title: "AI 伺服器需求延續，供應鏈接單能見度提升", sentiment: 0.72, source: "Mock News" },
  { title: "外資報告上修半導體與高速傳輸族群展望", sentiment: 0.66, source: "Mock News" },
  { title: "短線漲幅偏大，法人提醒留意回檔風險", sentiment: -0.25, source: "Mock News" }
];

export const mockMacro = {
  twiiTrend: 0.8,
  nasdaq: 0.55,
  sp500: 0.4,
  dow: 0.18,
  sox: 0.72,
  vix: -0.28,
  dxy: -0.1,
  us10y: -0.05,
  oil: 0.12,
  gold: 0.08,
  btc: 0.35
};

export const watchlistSeed = [
  { id: "w1", symbol: "2330.TW", name: "台積電", alert: "接近第一目標價" },
  { id: "w2", symbol: "6285.TW", name: "啟碁", alert: "接近突破買點" },
  { id: "w3", symbol: "1303.TW", name: "南亞", alert: "跌破 MA20 觀察" }
];

export const portfolioSeed = [
  { id: "p1", symbol: "2330.TW", name: "台積電", shares: 1000, cost: 910 },
  { id: "p2", symbol: "4976.TW", name: "佳凌", shares: 2000, cost: 42.5 }
];
