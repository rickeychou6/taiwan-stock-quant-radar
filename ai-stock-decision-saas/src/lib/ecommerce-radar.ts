export type CommerceSourceStatus = {
  source: string;
  ok: boolean;
  fetchedAt: string;
  message: string;
  url?: string;
};

export type CommerceProduct = {
  id: string;
  title: string;
  source: string;
  marketplace: string;
  keyword: string;
  rank: number;
  url: string;
  imageUrl: string;
  price: number;
  originalPrice: number;
  currency: "TWD";
  discountPct: number;
  searchTotalRows: number;
  salesSignal: number;
  salesSignalLabel: string;
  estimatedUnitProfit: number;
  estimatedProfitIndex: number;
  marginRate: number;
  group: string;
  nextMonthScore: number;
  nextQuarterScore: number;
  confidence: "高" | "中" | "低";
  reasons: string[];
  riskNotes: string[];
};

export type CommerceRadarReport = {
  updatedAt: string;
  dataMode: "real-public-signal";
  sources: CommerceSourceStatus[];
  scannedKeywords: string[];
  products: CommerceProduct[];
  topSales: CommerceProduct[];
  topProfit: CommerceProduct[];
  nextMonthWinners: CommerceProduct[];
  nextQuarterWinners: CommerceProduct[];
  limitations: string[];
};

type PchomeProduct = {
  Id?: string;
  name?: string;
  describe?: string;
  price?: number;
  originPrice?: number;
  picS?: string;
  picB?: string;
};

type PchomeResponse = {
  totalRows?: number;
  q?: string;
  prods?: PchomeProduct[];
};

const DEFAULT_KEYWORDS = [
  "藍牙耳機",
  "行動電源",
  "掃地機器人",
  "氣炸鍋",
  "除濕機",
  "電競滑鼠",
  "SSD",
  "咖啡機",
  "保健食品",
  "貓砂",
  "美妝保養",
  "筋膜槍",
  "兒童玩具",
  "露營燈",
  "電風扇",
  "空氣清淨機"
];

const GROUP_RULES: Array<{ group: string; marginRate: number; keywords: string[] }> = [
  { group: "3C 周邊", marginRate: 0.24, keywords: ["耳機", "藍牙", "行動電源", "滑鼠", "鍵盤", "SSD", "記憶卡", "充電", "手機", "平板"] },
  { group: "小家電", marginRate: 0.30, keywords: ["掃地", "氣炸", "除濕", "咖啡機", "清淨機", "電風扇", "吹風", "電鍋", "烤箱"] },
  { group: "美妝保養", marginRate: 0.48, keywords: ["美妝", "保養", "精華", "面膜", "防曬", "洗面乳", "乳液", "香水"] },
  { group: "健康保健", marginRate: 0.42, keywords: ["保健", "維他命", "葉黃素", "魚油", "益生菌", "蛋白", "膠原"] },
  { group: "寵物用品", marginRate: 0.36, keywords: ["貓砂", "寵物", "狗", "貓", "飼料", "罐頭"] },
  { group: "運動戶外", marginRate: 0.38, keywords: ["筋膜槍", "露營", "登山", "健身", "瑜珈", "運動", "帳篷", "露營燈"] },
  { group: "玩具親子", marginRate: 0.40, keywords: ["玩具", "兒童", "嬰兒", "積木", "模型", "桌遊"] },
  { group: "居家生活", marginRate: 0.34, keywords: ["收納", "床包", "枕頭", "清潔", "鍋", "保溫", "居家"] }
];

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function round(value: number, digits = 0) {
  const base = 10 ** digits;
  return Math.round(value * base) / base;
}

function cleanKeywords(input?: string | null) {
  const raw = input
    ? input.split(/[,，\n]/).map((item) => item.trim()).filter(Boolean)
    : DEFAULT_KEYWORDS;
  return Array.from(new Set(raw)).slice(0, 20);
}

function detectGroup(title: string) {
  const normalized = title.toLowerCase();
  return GROUP_RULES.find((rule) => rule.keywords.some((keyword) => normalized.includes(keyword.toLowerCase()))) || {
    group: "綜合商品",
    marginRate: 0.30,
    keywords: []
  };
}

function seasonalityBoost(title: string, group: string, target: "month" | "quarter") {
  const month = new Date().getMonth() + 1;
  const targetMonth = target === "month" ? ((month % 12) + 1) : (((month + 2) % 12) + 1);
  const text = `${title} ${group}`;
  let boost = 50;

  if ([6, 7, 8].includes(targetMonth) && /電風扇|冷氣|清淨|除濕|防曬|露營|飲料|冰/.test(text)) boost += 22;
  if ([9].includes(targetMonth) && /3C|耳機|行動電源|滑鼠|鍵盤|SSD|背包|咖啡|中秋|烤肉/.test(text)) boost += 22;
  if ([10, 11, 12].includes(targetMonth) && /3C|美妝|保養|咖啡|小家電|玩具|禮|耳機|掃地|氣炸|清淨/.test(text)) boost += 26;
  if ([1, 2].includes(targetMonth) && /清潔|收納|年節|禮盒|保健|家電|美妝|玩具/.test(text)) boost += 22;
  if ([3, 4, 5].includes(targetMonth) && /除濕|清淨|防曬|露營|保養|運動/.test(text)) boost += 18;

  if (target === "quarter") boost += /3C|小家電|美妝保養|健康保健/.test(group) ? 8 : 0;
  return clamp(boost, 0, 100);
}

function productUrl(id: string) {
  return `https://24h.pchome.com.tw/prod/${encodeURIComponent(id)}`;
}

function imageUrl(path?: string) {
  if (!path) return "";
  if (path.startsWith("http")) return path;
  return `https://cs-a.ecimg.tw${path}`;
}

async function fetchPchomeKeyword(keyword: string, limit: number): Promise<{ products: CommerceProduct[]; status: CommerceSourceStatus }> {
  const url = `https://ecshweb.pchome.com.tw/search/v3.3/all/results?q=${encodeURIComponent(keyword)}&page=1&sort=sale/dc`;
  const fetchedAt = new Date().toISOString();

  try {
    const response = await fetch(url, {
      cache: "no-store",
      headers: {
        Accept: "application/json",
        "User-Agent": "Mozilla/5.0 ecommerce-radar"
      }
    });

    if (!response.ok) {
      throw new Error(`PChome returned HTTP ${response.status}`);
    }

    const payload = (await response.json()) as PchomeResponse;
    const totalRows = Number(payload.totalRows || 0);
    const rows = Array.isArray(payload.prods) ? payload.prods.slice(0, limit) : [];

    const products = rows.map<CommerceProduct>((item, index) => {
      const id = String(item.Id || `${keyword}-${index}`);
      const title = String(item.name || "未命名商品");
      const price = Number(item.price || 0);
      const originalPrice = Number(item.originPrice || price);
      const discountPct = originalPrice > price ? ((originalPrice - price) / originalPrice) * 100 : 0;
      const rank = index + 1;
      const group = detectGroup(`${title} ${item.describe || ""}`);
      const rankScore = clamp(100 - (rank - 1) * (70 / Math.max(limit - 1, 1)), 0, 100);
      const breadthScore = clamp(Math.log10(totalRows + 1) * 18, 0, 70);
      const salesSignal = clamp(rankScore * 0.72 + breadthScore * 0.28 + (discountPct > 0 ? 4 : 0), 0, 100);
      const estimatedUnitProfit = price * group.marginRate;
      const estimatedProfitIndex = estimatedUnitProfit * (salesSignal / 100);
      const seasonMonth = seasonalityBoost(title, group.group, "month");
      const seasonQuarter = seasonalityBoost(title, group.group, "quarter");
      const nextMonthScore = clamp(salesSignal * 0.56 + seasonMonth * 0.24 + (discountPct > 0 ? 8 : 0) + (price < 1500 ? 6 : 0), 0, 100);
      const nextQuarterScore = clamp(salesSignal * 0.48 + seasonQuarter * 0.34 + (group.marginRate >= 0.38 ? 8 : 0) + (price < 3000 ? 5 : 0), 0, 100);

      return {
        id,
        title,
        source: "PChome 24h 公開搜尋",
        marketplace: "PChome 24h",
        keyword,
        rank,
        url: productUrl(id),
        imageUrl: imageUrl(item.picS || item.picB),
        price,
        originalPrice,
        currency: "TWD" as const,
        discountPct: round(discountPct, 1),
        searchTotalRows: totalRows,
        salesSignal: round(salesSignal, 1),
        salesSignalLabel: `熱銷排序第 ${rank} 名 / 搜尋池 ${totalRows.toLocaleString()} 件`,
        estimatedUnitProfit: round(estimatedUnitProfit),
        estimatedProfitIndex: round(estimatedProfitIndex, 1),
        marginRate: group.marginRate,
        group: group.group,
        nextMonthScore: round(nextMonthScore, 1),
        nextQuarterScore: round(nextQuarterScore, 1),
        confidence: totalRows >= 1000 && rank <= 5 ? "高" : totalRows >= 200 ? "中" : "低",
        reasons: [
          `PChome 熱銷排序 ${rank}，代表目前平台排序訊號靠前。`,
          `搜尋池共有 ${totalRows.toLocaleString()} 件，需求廣度${totalRows >= 1000 ? "大" : totalRows >= 200 ? "中等" : "偏小"}。`,
          `分類為${group.group}，預設毛利率 ${Math.round(group.marginRate * 100)}%。`,
          discountPct > 0 ? `目前折扣約 ${round(discountPct, 1)}%，有促銷推升機會。` : "目前沒有明顯折扣，需靠自然需求或品牌力。"
        ],
        riskNotes: [
          "PChome 公開資料沒有揭露實際成交件數。",
          "毛利為成本率估算，尚未扣平台費、物流費、退貨與廣告費。",
          "若要判斷真正利潤，需接你的進貨成本與店鋪訂單資料。"
        ]
      };
    });

    return {
      products,
      status: {
        source: `PChome 24h：${keyword}`,
        ok: true,
        fetchedAt,
        url,
        message: `取得 ${products.length} 件商品，搜尋池 ${totalRows.toLocaleString()} 件。`
      }
    };
  } catch (error) {
    return {
      products: [],
      status: {
        source: `PChome 24h：${keyword}`,
        ok: false,
        fetchedAt,
        url,
        message: error instanceof Error ? error.message : "來源讀取失敗"
      }
    };
  }
}

function uniqueProducts(products: CommerceProduct[]) {
  const seen = new Set<string>();
  return products.filter((product) => {
    const key = `${product.source}:${product.id}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function sortDesc<T>(rows: T[], selector: (row: T) => number) {
  return [...rows].sort((a, b) => selector(b) - selector(a));
}

export async function runEcommerceRadar(options?: { keywords?: string | null; perKeywordLimit?: number }) {
  const keywords = cleanKeywords(options?.keywords);
  const perKeywordLimit = clamp(Number(options?.perKeywordLimit || 8), 3, 12);
  const results = await Promise.all(keywords.map((keyword) => fetchPchomeKeyword(keyword, perKeywordLimit)));
  const products = uniqueProducts(results.flatMap((result) => result.products));

  const topSales = sortDesc(products, (product) => product.salesSignal).slice(0, 10);
  const topProfit = sortDesc(products, (product) => product.estimatedProfitIndex).slice(0, 10);
  const nextMonthWinners = sortDesc(products, (product) => product.nextMonthScore).slice(0, 10);
  const nextQuarterWinners = sortDesc(products, (product) => product.nextQuarterScore).slice(0, 10);

  return {
    updatedAt: new Date().toISOString(),
    dataMode: "real-public-signal" as const,
    sources: results.map((result) => result.status),
    scannedKeywords: keywords,
    products,
    topSales,
    topProfit,
    nextMonthWinners,
    nextQuarterWinners,
    limitations: [
      "目前使用 PChome 24h 公開搜尋 JSON：商品、價格、折扣、搜尋池與熱銷排序是真實公開資料。",
      "PChome 沒有公開實際成交件數，所以「銷售量最大」以熱銷排序分數呈現，不顯示假件數。",
      "利潤為分類毛利率估算；若要真正利潤最高，必須接你的進貨成本、平台費、物流費、廣告費與退貨率。",
      "預估下月/下季爆品使用熱銷排序、搜尋池、折扣、價格帶、分類毛利與季節性，屬於決策輔助，不是保證銷售。"
    ]
  } satisfies CommerceRadarReport;
}
