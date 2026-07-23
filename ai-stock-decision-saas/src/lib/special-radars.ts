export type RadarMode = "next-jump" | "tw50" | "non-futures" | "photo" | "low-price";

export const TAIWAN_50_SYMBOLS = [
  "2330.TW",
  "2317.TW",
  "2454.TW",
  "2308.TW",
  "2382.TW",
  "2881.TW",
  "2412.TW",
  "2882.TW",
  "2303.TW",
  "2891.TW",
  "3711.TW",
  "2886.TW",
  "1216.TW",
  "2884.TW",
  "2357.TW",
  "2892.TW",
  "3034.TW",
  "2603.TW",
  "2885.TW",
  "6669.TW",
  "5880.TW",
  "2345.TW",
  "1303.TW",
  "2002.TW",
  "3045.TW",
  "1301.TW",
  "2207.TW",
  "2880.TW",
  "5871.TW",
  "2912.TW",
  "2395.TW",
  "1326.TW",
  "4904.TW",
  "1590.TW",
  "2379.TW",
  "2327.TW",
  "3008.TW",
  "2890.TW",
  "2883.TW",
  "1101.TW",
  "2887.TW",
  "5876.TW",
  "2609.TW",
  "2615.TW",
  "2801.TW",
  "6505.TW",
  "9910.TW",
  "2408.TW",
  "1402.TW",
  "6415.TW"
];

export const PHOTO_GROUP_SYMBOLS = [
  "5274.TWO",
  "2484.TW",
  "1504.TW",
  "8096.TWO",
  "5443.TWO",
  "1710.TW",
  "2352.TW",
  "2324.TW",
  "3048.TW",
  "8071.TWO",
  "7777.TWO",
  "2317.TW",
  "2409.TW",
  "4976.TW",
  "6285.TW",
  "1303.TW",
  "3008.TW"
];

export const NON_FUTURES_BASE_SYMBOLS = [
  "8071.TWO",
  "7777.TWO",
  "2484.TW",
  "1504.TW",
  "1710.TW",
  "8096.TWO",
  "5443.TWO",
  "3048.TW",
  "4976.TW",
  "6285.TW",
  "2352.TW",
  "2409.TW",
  "2344.TW",
  "3481.TW",
  "3706.TW",
  "2353.TW",
  "2356.TW",
  "4977.TWO",
  "6182.TW",
  "3324.TWO",
  "6274.TWO",
  "6188.TWO",
  "6125.TWO",
  "6207.TW",
  "6235.TW",
  "3260.TWO",
  "3264.TWO",
  "3227.TWO",
  "3323.TWO",
  "5425.TWO"
];

export const LOW_PRICE_BASE_SYMBOLS = [
  "8071.TWO",
  "7777.TWO",
  "2484.TW",
  "1504.TW",
  "1710.TW",
  "2324.TW",
  "2352.TW",
  "2409.TW",
  "2344.TW",
  "3481.TW",
  "2353.TW",
  "2356.TW",
  "3706.TW",
  "4976.TW",
  "6285.TW",
  "3048.TW",
  "8096.TWO",
  "5443.TWO",
  "6207.TW",
  "6235.TW",
  "6125.TWO",
  "6188.TWO"
];

export const STOCK_FUTURES_CODES = new Set([
  "1101",
  "1216",
  "1301",
  "1303",
  "1326",
  "1402",
  "1476",
  "1590",
  "2002",
  "2049",
  "2201",
  "2207",
  "2301",
  "2303",
  "2308",
  "2317",
  "2324",
  "2327",
  "2330",
  "2344",
  "2345",
  "2352",
  "2353",
  "2354",
  "2356",
  "2357",
  "2376",
  "2377",
  "2379",
  "2382",
  "2383",
  "2395",
  "2408",
  "2412",
  "2449",
  "2454",
  "2603",
  "2609",
  "2615",
  "2618",
  "2633",
  "2801",
  "2880",
  "2881",
  "2882",
  "2883",
  "2884",
  "2885",
  "2886",
  "2887",
  "2890",
  "2891",
  "2892",
  "2912",
  "3008",
  "3034",
  "3045",
  "3231",
  "3481",
  "3711",
  "4904",
  "5871",
  "5876",
  "5880",
  "6415",
  "6669"
]);

export function stockCode(symbol: string) {
  return symbol.split(".")[0];
}

export function uniqueSymbols(symbols: string[]) {
  return Array.from(new Set(symbols.map((symbol) => symbol.trim()).filter(Boolean)));
}

export function staticRadarSymbols(mode: RadarMode) {
  if (mode === "tw50") return TAIWAN_50_SYMBOLS;
  if (mode === "photo") return PHOTO_GROUP_SYMBOLS;
  if (mode === "non-futures") return NON_FUTURES_BASE_SYMBOLS.filter((symbol) => !STOCK_FUTURES_CODES.has(stockCode(symbol)));
  if (mode === "low-price") return LOW_PRICE_BASE_SYMBOLS;
  return [];
}

export const RADAR_LABELS: Record<RadarMode, { title: string; description: string; source: string }> = {
  "next-jump": {
    title: "隔日與 3-5 天上漲候選",
    description: "依完整分析分數、3-5 天上漲機率、風險報酬比與槓桿風險排序，找出可能續強標的。",
    source: "全市場初選"
  },
  tw50: {
    title: "0050 權值股掃描",
    description: "把舊版 0050 盤後雷達併入新網站，專看大型權值股的買點、停損、目標與風險。",
    source: "內建 0050 成分股清單"
  },
  "non-futures": {
    title: "非期貨個股掃描",
    description: "排除常見個股期貨標的，聚焦籌碼較不容易被期貨套利牽動的一般股票。",
    source: "官方日行情初選 + 排除個股期貨"
  },
  photo: {
    title: "照片群組個股",
    description: "整合你照片中的股票，並加入鴻海、友達、佳凌、啟碁、南亞、大立光一起分析。",
    source: "照片群組 + 你指定加選股"
  },
  "low-price": {
    title: "百元以下低價股",
    description: "優先找百元以下、短線量價較活躍的候選股，避免只推薦高價股。",
    source: "全市場初選 + 低價候選池"
  }
};
