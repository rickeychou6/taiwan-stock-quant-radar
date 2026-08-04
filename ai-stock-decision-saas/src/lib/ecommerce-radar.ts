export type CommerceSourceStatus = {
  source: string;
  ok: boolean;
  fetchedAt: string;
  message: string;
  url?: string;
};

export type CostSettings = {
  platformFeeRate: number;
  paymentFeeRate: number;
  shippingCost: number;
  adRate: number;
  returnReserveRate: number;
};

export type CommerceCategorySummary = {
  category: string;
  parentCategory: string;
  productCount: number;
  averagePrice: number;
  averageSalesSignal: number;
  averageNetMarginRate: number;
  bestProductTitle: string;
  bestProductUrl: string;
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
  parentCategory: string;
  category: string;
  categoryConfidence: "高" | "中" | "低";
  grossMarginRate: number;
  costRate: number;
  estimatedProductCost: number;
  estimatedPlatformFee: number;
  estimatedPaymentFee: number;
  estimatedShippingCost: number;
  estimatedAdCost: number;
  estimatedReturnReserve: number;
  estimatedTotalCost: number;
  estimatedNetProfit: number;
  estimatedNetMarginRate: number;
  estimatedProfitIndex: number;
  breakEvenPrice: number;
  nextMonthScore: number;
  nextQuarterScore: number;
  confidence: "高" | "中" | "低";
  reasons: string[];
  riskNotes: string[];
};

export type CommerceRadarReport = {
  updatedAt: string;
  dataMode: "real-public-signal";
  costSettings: CostSettings;
  sources: CommerceSourceStatus[];
  scannedKeywords: string[];
  categorySummary: CommerceCategorySummary[];
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
  prods?: PchomeProduct[];
};

type CategoryRule = {
  parentCategory: string;
  category: string;
  grossMarginRate: number;
  keywords: string[];
  seasonalKeywords?: string[];
};

const DEFAULT_KEYWORDS = [
  "藍牙耳機",
  "行動電源",
  "手機殼",
  "掃地機器人",
  "氣炸鍋",
  "除濕機",
  "空氣清淨機",
  "電競滑鼠",
  "SSD",
  "咖啡機",
  "保健食品",
  "葉黃素",
  "貓砂",
  "狗飼料",
  "美妝保養",
  "防曬",
  "筋膜槍",
  "兒童玩具",
  "露營燈",
  "收納箱",
  "洗衣精",
  "零食",
  "車用吸塵器"
];

const DEFAULT_COST_SETTINGS: CostSettings = {
  platformFeeRate: 0.08,
  paymentFeeRate: 0.02,
  shippingCost: 60,
  adRate: 0.06,
  returnReserveRate: 0.03
};

const CATEGORY_RULES: CategoryRule[] = [
  { parentCategory: "3C 電子", category: "耳機與音訊", grossMarginRate: 0.28, keywords: ["耳機", "藍牙", "降噪", "喇叭", "音響", "麥克風"], seasonalKeywords: ["通勤", "開學", "禮物"] },
  { parentCategory: "3C 電子", category: "手機配件", grossMarginRate: 0.42, keywords: ["手機殼", "保護貼", "充電線", "充電器", "磁吸", "支架", "快充"], seasonalKeywords: ["換機", "開學"] },
  { parentCategory: "3C 電子", category: "電腦周邊", grossMarginRate: 0.30, keywords: ["滑鼠", "鍵盤", "螢幕", "電競", "筆電", "散熱", "視訊"], seasonalKeywords: ["開學", "電競"] },
  { parentCategory: "3C 電子", category: "儲存與零組件", grossMarginRate: 0.20, keywords: ["SSD", "硬碟", "記憶卡", "隨身碟", "記憶體", "DRAM"], seasonalKeywords: ["開學", "升級"] },
  { parentCategory: "小家電", category: "清潔家電", grossMarginRate: 0.26, keywords: ["掃地", "吸塵", "洗地", "清潔機", "機器人"], seasonalKeywords: ["年終", "搬家", "大掃除"] },
  { parentCategory: "小家電", category: "廚房家電", grossMarginRate: 0.32, keywords: ["氣炸", "咖啡機", "烤箱", "電鍋", "果汁機", "熱水瓶", "電磁爐"], seasonalKeywords: ["年節", "中秋", "禮物"] },
  { parentCategory: "小家電", category: "空調環境", grossMarginRate: 0.24, keywords: ["除濕", "清淨", "電風扇", "循環扇", "冷氣", "暖氣"], seasonalKeywords: ["梅雨", "夏天", "換季"] },
  { parentCategory: "美妝保養", category: "保養品", grossMarginRate: 0.52, keywords: ["保養", "精華", "乳液", "面膜", "化妝水", "洗面乳"], seasonalKeywords: ["換季", "母親節", "週年慶"] },
  { parentCategory: "美妝保養", category: "彩妝香氛", grossMarginRate: 0.55, keywords: ["彩妝", "口紅", "粉底", "香水", "眼影", "腮紅"], seasonalKeywords: ["節慶", "禮物", "週年慶"] },
  { parentCategory: "健康保健", category: "營養補充", grossMarginRate: 0.45, keywords: ["保健", "維他命", "葉黃素", "魚油", "益生菌", "膠原", "鈣", "B群"], seasonalKeywords: ["銀髮", "開學", "年節"] },
  { parentCategory: "健康保健", category: "運動恢復", grossMarginRate: 0.40, keywords: ["筋膜槍", "按摩", "護具", "瑜珈", "健身", "蛋白"], seasonalKeywords: ["健身", "恢復"] },
  { parentCategory: "寵物用品", category: "貓狗消耗品", grossMarginRate: 0.34, keywords: ["貓砂", "飼料", "罐頭", "寵物", "貓", "狗", "尿布"], seasonalKeywords: ["囤貨", "定期購"] },
  { parentCategory: "母嬰玩具", category: "玩具與親子", grossMarginRate: 0.42, keywords: ["玩具", "兒童", "積木", "模型", "桌遊", "娃娃"], seasonalKeywords: ["暑假", "聖誕", "開學"] },
  { parentCategory: "母嬰玩具", category: "嬰幼兒用品", grossMarginRate: 0.38, keywords: ["嬰兒", "奶瓶", "尿布", "推車", "安全座椅", "濕巾"], seasonalKeywords: ["育兒", "囤貨"] },
  { parentCategory: "運動戶外", category: "露營戶外", grossMarginRate: 0.40, keywords: ["露營", "帳篷", "露營燈", "登山", "戶外", "睡袋"], seasonalKeywords: ["春遊", "暑假", "中秋"] },
  { parentCategory: "居家生活", category: "收納清潔", grossMarginRate: 0.36, keywords: ["收納", "清潔", "洗衣精", "拖把", "垃圾袋", "置物"], seasonalKeywords: ["大掃除", "搬家"] },
  { parentCategory: "居家生活", category: "寢具家飾", grossMarginRate: 0.39, keywords: ["床包", "枕頭", "棉被", "涼感", "沙發", "地毯"], seasonalKeywords: ["換季", "新居"] },
  { parentCategory: "食品飲料", category: "零食飲品", grossMarginRate: 0.30, keywords: ["零食", "餅乾", "咖啡", "茶", "飲料", "泡麵", "巧克力"], seasonalKeywords: ["年節", "中秋", "囤貨"] },
  { parentCategory: "服飾鞋包", category: "服飾配件", grossMarginRate: 0.50, keywords: ["衣服", "外套", "鞋", "包", "襪", "帽", "內衣"], seasonalKeywords: ["換季", "開學"] },
  { parentCategory: "車用百貨", category: "車用配件", grossMarginRate: 0.35, keywords: ["車用", "行車", "吸塵器", "胎壓", "汽車", "機車", "安全帽"], seasonalKeywords: ["旅遊", "通勤"] },
  { parentCategory: "辦公文具", category: "文具辦公", grossMarginRate: 0.44, keywords: ["文具", "辦公", "筆", "紙", "印表機", "標籤", "資料夾"], seasonalKeywords: ["開學", "開工"] }
];

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function round(value: number, digits = 0) {
  const base = 10 ** digits;
  return Math.round(value * base) / base;
}

function cleanKeywords(input?: string | null) {
  const raw = input ? input.split(/[,，\n]/).map((item) => item.trim()).filter(Boolean) : DEFAULT_KEYWORDS;
  return Array.from(new Set(raw)).slice(0, 30);
}

function normalizeCostSettings(input?: Partial<CostSettings>) {
  return {
    platformFeeRate: clamp(Number(input?.platformFeeRate ?? DEFAULT_COST_SETTINGS.platformFeeRate), 0, 0.35),
    paymentFeeRate: clamp(Number(input?.paymentFeeRate ?? DEFAULT_COST_SETTINGS.paymentFeeRate), 0, 0.12),
    shippingCost: clamp(Number(input?.shippingCost ?? DEFAULT_COST_SETTINGS.shippingCost), 0, 500),
    adRate: clamp(Number(input?.adRate ?? DEFAULT_COST_SETTINGS.adRate), 0, 0.5),
    returnReserveRate: clamp(Number(input?.returnReserveRate ?? DEFAULT_COST_SETTINGS.returnReserveRate), 0, 0.3)
  };
}

function detectCategory(text: string): CategoryRule & { categoryConfidence: "高" | "中" | "低" } {
  const normalized = text.toLowerCase();
  const matches = CATEGORY_RULES.map((rule) => ({
    rule,
    score: rule.keywords.reduce((sum, keyword) => sum + (normalized.includes(keyword.toLowerCase()) ? 1 : 0), 0)
  })).filter((item) => item.score > 0).sort((a, b) => b.score - a.score);

  if (matches[0]) {
    return {
      ...matches[0].rule,
      categoryConfidence: matches[0].score >= 2 ? "高" : "中"
    };
  }

  return {
    parentCategory: "綜合商品",
    category: "未分類",
    grossMarginRate: 0.30,
    keywords: [],
    categoryConfidence: "低"
  };
}

function seasonalityBoost(title: string, rule: CategoryRule, target: "month" | "quarter") {
  const month = new Date().getMonth() + 1;
  const targetMonth = target === "month" ? ((month % 12) + 1) : (((month + 2) % 12) + 1);
  const text = `${title} ${rule.parentCategory} ${rule.category}`;
  let boost = 50;

  if ([6, 7, 8].includes(targetMonth) && /電風扇|冷氣|清淨|除濕|防曬|露營|飲料|冰|涼感/.test(text)) boost += 22;
  if ([9].includes(targetMonth) && /3C|耳機|行動電源|滑鼠|鍵盤|SSD|背包|咖啡|中秋|烤肉|文具/.test(text)) boost += 22;
  if ([10, 11, 12].includes(targetMonth) && /3C|美妝|保養|咖啡|小家電|玩具|禮|耳機|掃地|氣炸|清淨|香水/.test(text)) boost += 26;
  if ([1, 2].includes(targetMonth) && /清潔|收納|年節|禮盒|保健|家電|美妝|玩具|零食/.test(text)) boost += 22;
  if ([3, 4, 5].includes(targetMonth) && /除濕|清淨|防曬|露營|保養|運動|換季/.test(text)) boost += 18;

  if (rule.seasonalKeywords?.some((keyword) => text.includes(keyword))) boost += 8;
  if (target === "quarter" && ["美妝保養", "健康保健", "母嬰玩具", "服飾鞋包"].includes(rule.parentCategory)) boost += 6;

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

function buildCostModel(price: number, grossMarginRate: number, settings: CostSettings) {
  const costRate = clamp(1 - grossMarginRate, 0.2, 0.92);
  const estimatedProductCost = price * costRate;
  const estimatedPlatformFee = price * settings.platformFeeRate;
  const estimatedPaymentFee = price * settings.paymentFeeRate;
  const estimatedShippingCost = settings.shippingCost;
  const estimatedAdCost = price * settings.adRate;
  const estimatedReturnReserve = price * settings.returnReserveRate;
  const estimatedTotalCost =
    estimatedProductCost +
    estimatedPlatformFee +
    estimatedPaymentFee +
    estimatedShippingCost +
    estimatedAdCost +
    estimatedReturnReserve;
  const estimatedNetProfit = price - estimatedTotalCost;
  const estimatedNetMarginRate = price > 0 ? estimatedNetProfit / price : 0;
  const breakEvenPrice = estimatedTotalCost;

  return {
    costRate,
    estimatedProductCost: round(estimatedProductCost),
    estimatedPlatformFee: round(estimatedPlatformFee),
    estimatedPaymentFee: round(estimatedPaymentFee),
    estimatedShippingCost: round(estimatedShippingCost),
    estimatedAdCost: round(estimatedAdCost),
    estimatedReturnReserve: round(estimatedReturnReserve),
    estimatedTotalCost: round(estimatedTotalCost),
    estimatedNetProfit: round(estimatedNetProfit),
    estimatedNetMarginRate: round(estimatedNetMarginRate, 4),
    breakEvenPrice: round(breakEvenPrice)
  };
}

async function fetchPchomeKeyword(keyword: string, limit: number, costSettings: CostSettings): Promise<{ products: CommerceProduct[]; status: CommerceSourceStatus }> {
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

    if (!response.ok) throw new Error(`PChome returned HTTP ${response.status}`);

    const payload = (await response.json()) as PchomeResponse;
    const totalRows = Number(payload.totalRows || 0);
    const rows = Array.isArray(payload.prods) ? payload.prods.slice(0, limit) : [];

    const products = rows.map<CommerceProduct>((item, index) => {
      const id = String(item.Id || `${keyword}-${index}`);
      const title = String(item.name || "未命名商品");
      const description = String(item.describe || "");
      const price = Number(item.price || 0);
      const originalPrice = Number(item.originPrice || price);
      const discountPct = originalPrice > price ? ((originalPrice - price) / originalPrice) * 100 : 0;
      const rank = index + 1;
      const category = detectCategory(`${title} ${description} ${keyword}`);
      const rankScore = clamp(100 - (rank - 1) * (70 / Math.max(limit - 1, 1)), 0, 100);
      const breadthScore = clamp(Math.log10(totalRows + 1) * 18, 0, 70);
      const salesSignal = clamp(rankScore * 0.72 + breadthScore * 0.28 + (discountPct > 0 ? 4 : 0), 0, 100);
      const costs = buildCostModel(price, category.grossMarginRate, costSettings);
      const estimatedProfitIndex = Math.max(costs.estimatedNetProfit, 0) * (salesSignal / 100);
      const seasonMonth = seasonalityBoost(title, category, "month");
      const seasonQuarter = seasonalityBoost(title, category, "quarter");
      const nextMonthScore = clamp(salesSignal * 0.54 + seasonMonth * 0.24 + Math.max(costs.estimatedNetMarginRate, 0) * 45 + (discountPct > 0 ? 6 : 0), 0, 100);
      const nextQuarterScore = clamp(salesSignal * 0.46 + seasonQuarter * 0.32 + Math.max(costs.estimatedNetMarginRate, 0) * 55 + (price < 3000 ? 4 : 0), 0, 100);

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
        currency: "TWD",
        discountPct: round(discountPct, 1),
        searchTotalRows: totalRows,
        salesSignal: round(salesSignal, 1),
        salesSignalLabel: `熱銷排序第 ${rank} 名 / 搜尋池 ${totalRows.toLocaleString()} 件`,
        parentCategory: category.parentCategory,
        category: category.category,
        categoryConfidence: category.categoryConfidence,
        grossMarginRate: category.grossMarginRate,
        ...costs,
        estimatedProfitIndex: round(estimatedProfitIndex, 1),
        nextMonthScore: round(nextMonthScore, 1),
        nextQuarterScore: round(nextQuarterScore, 1),
        confidence: totalRows >= 1000 && rank <= 5 ? "高" : totalRows >= 200 ? "中" : "低",
        reasons: [
          `PChome 熱銷排序 ${rank}，代表目前平台排序訊號靠前。`,
          `搜尋池共有 ${totalRows.toLocaleString()} 件，需求廣度${totalRows >= 1000 ? "大" : totalRows >= 200 ? "中等" : "偏小"}。`,
          `分類為 ${category.parentCategory} / ${category.category}，分類可信度 ${category.categoryConfidence}。`,
          `估進貨成本 ${round(costs.costRate * 100, 1)}%，加上平台費、金流、物流、廣告與退貨準備後，估淨利 ${costs.estimatedNetProfit.toLocaleString()} 元。`
        ],
        riskNotes: [
          "PChome 公開資料沒有揭露實際成交件數。",
          "成本為估算值，尚未接你的真實進貨單、平台合約、物流費率與廣告後台。",
          "如果商品需要保固、客服或高退貨率，實際淨利可能低於本模型。"
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

function buildCategorySummary(products: CommerceProduct[]) {
  const groups = new Map<string, CommerceProduct[]>();
  for (const product of products) {
    const key = `${product.parentCategory}/${product.category}`;
    groups.set(key, [...(groups.get(key) || []), product]);
  }

  return Array.from(groups.entries()).map<CommerceCategorySummary>(([, rows]) => {
    const best = sortDesc(rows, (product) => product.estimatedProfitIndex)[0];
    return {
      category: rows[0].category,
      parentCategory: rows[0].parentCategory,
      productCount: rows.length,
      averagePrice: round(rows.reduce((sum, product) => sum + product.price, 0) / rows.length),
      averageSalesSignal: round(rows.reduce((sum, product) => sum + product.salesSignal, 0) / rows.length, 1),
      averageNetMarginRate: round(rows.reduce((sum, product) => sum + product.estimatedNetMarginRate, 0) / rows.length, 4),
      bestProductTitle: best?.title || "",
      bestProductUrl: best?.url || ""
    };
  }).sort((a, b) => b.productCount - a.productCount || b.averageSalesSignal - a.averageSalesSignal);
}

export async function runEcommerceRadar(options?: { keywords?: string | null; perKeywordLimit?: number; costSettings?: Partial<CostSettings> }) {
  const keywords = cleanKeywords(options?.keywords);
  const perKeywordLimit = clamp(Number(options?.perKeywordLimit || 8), 3, 12);
  const costSettings = normalizeCostSettings(options?.costSettings);
  const results = await Promise.all(keywords.map((keyword) => fetchPchomeKeyword(keyword, perKeywordLimit, costSettings)));
  const products = uniqueProducts(results.flatMap((result) => result.products));

  const topSales = sortDesc(products, (product) => product.salesSignal).slice(0, 10);
  const topProfit = sortDesc(products, (product) => product.estimatedProfitIndex).slice(0, 10);
  const nextMonthWinners = sortDesc(products, (product) => product.nextMonthScore).slice(0, 10);
  const nextQuarterWinners = sortDesc(products, (product) => product.nextQuarterScore).slice(0, 10);

  return {
    updatedAt: new Date().toISOString(),
    dataMode: "real-public-signal" as const,
    costSettings,
    sources: results.map((result) => result.status),
    scannedKeywords: keywords,
    categorySummary: buildCategorySummary(products),
    products,
    topSales,
    topProfit,
    nextMonthWinners,
    nextQuarterWinners,
    limitations: [
      "目前使用 PChome 24h 公開搜尋 JSON：商品、價格、折扣、搜尋池與熱銷排序是真實公開資料。",
      "PChome 沒有公開實際成交件數，所以「銷售量最大」以熱銷排序分數呈現，不顯示假件數。",
      "成本為模型估算，包含進貨成本、平台費、金流費、物流、廣告與退貨準備金；若要真正精準，必須接你的進貨成本與店鋪報表。",
      "預估下月/下季爆品使用熱銷排序、搜尋池、折扣、價格帶、分類成本與季節性，屬於決策輔助，不是保證銷售。"
    ]
  } satisfies CommerceRadarReport;
}

