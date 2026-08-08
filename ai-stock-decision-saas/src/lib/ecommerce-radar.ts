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
  averageRepurchaseScore: number;
  averageLowAfterSalesScore: number;
  averageLowServiceRepeatScore: number;
  averageSeasonalHotScore: number;
  averageLowCostHighMarginScore: number;
  averageLifestyleScore: number;
  bestProductTitle: string;
  bestProductUrl: string;
};

export type LifestyleSmallItemSummary = {
  productCount: number;
  averagePrice: number;
  averageGrossMarginRate: number;
  averageNetMarginRate: number;
  averageLowCostHighMarginScore: number;
  averageLifestyleScore: number;
  averageSalesSignal: number;
  marketplaces: string[];
  topProductTitle: string;
  topProductUrl: string;
};

export type ProductSizeClass = "small" | "medium" | "large" | "unknown";

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
  repurchaseScore: number;
  afterSalesBurden: "低" | "中" | "高";
  lowAfterSalesScore: number;
  lowServiceRepeatScore: number;
  seasonalHotScore: number;
  seasonalReason: string;
  lowCostHighMarginScore: number;
  isLifestyleSmallItem: boolean;
  lifestyleScore: number;
  lifestyleReason: string;
  sizeClass: ProductSizeClass;
  sizeLabel: string;
  sizeScore: number;
  sizeReason: string;
  selectionScore: number;
  selectionAdvice: "優先測品" | "可小量測試" | "等待比價" | "暫不建議";
  selectionReasons: string[];
  compactLifestyleScore: number;
  compactLifestyleReason: string;
  grossMarginRate: number;
  costRate: number;
  estimatedProductCost: number;
  estimatedGrossProfit: number;
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
  externalSoldSignal?: number;
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
  lifestyleSummary: LifestyleSmallItemSummary;
  products: CommerceProduct[];
  topSales: CommerceProduct[];
  topProfit: CommerceProduct[];
  lowServiceHighRepurchase: CommerceProduct[];
  seasonalHotProducts: CommerceProduct[];
  lowCostHighMarginProducts: CommerceProduct[];
  lifestyleProducts: CommerceProduct[];
  lifestyleLowCostHighProfitProducts: CommerceProduct[];
  compactLifestyleRecommendations: CommerceProduct[];
  productSelectionRecommendations: CommerceProduct[];
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

type ShopeeItemBasic = {
  itemid?: number;
  shopid?: number;
  name?: string;
  price?: number;
  price_before_discount?: number;
  image?: string;
  sold?: number;
  historical_sold?: number;
};

type ShopeeSearchResponse = {
  total_count?: number;
  items?: Array<{
    item_basic?: ShopeeItemBasic;
  }>;
};

type RawCommerceInput = {
  id: string;
  title: string;
  description: string;
  source: string;
  marketplace: string;
  keyword: string;
  rank: number;
  url: string;
  imageUrl: string;
  price: number;
  originalPrice: number;
  searchTotalRows: number;
  externalSoldSignal?: number;
};

type CategoryRule = {
  parentCategory: string;
  category: string;
  grossMarginRate: number;
  repurchaseScore: number;
  afterSalesBurden: "低" | "中" | "高";
  keywords: string[];
  seasonalKeywords?: string[];
};

const DEFAULT_KEYWORDS = [
  "藍牙耳機",
  "行動電源",
  "手機殼",
  "保護貼",
  "掃地機器人",
  "氣炸鍋",
  "除濕機",
  "空氣清淨機",
  "電競滑鼠",
  "SSD",
  "咖啡機",
  "保健食品",
  "葉黃素",
  "魚油",
  "益生菌",
  "貓砂",
  "狗飼料",
  "尿布",
  "濕紙巾",
  "美妝保養",
  "防曬",
  "筋膜槍",
  "兒童玩具",
  "露營燈",
  "收納箱",
  "洗衣精",
  "衛生紙",
  "洗髮精",
  "牙膏",
  "零食",
  "咖啡豆",
  "車用吸塵器",
  "掛勾",
  "置物架",
  "廚房小物",
  "浴室收納",
  "電線收納",
  "保溫杯",
  "小夜燈",
  "防塵罩",
  "密封袋",
  "桌面收納"
];

const DEFAULT_COST_SETTINGS: CostSettings = {
  platformFeeRate: 0.08,
  paymentFeeRate: 0.02,
  shippingCost: 60,
  adRate: 0.06,
  returnReserveRate: 0.03
};

const CATEGORY_RULES: CategoryRule[] = [
  { parentCategory: "生活小物", category: "收納整理小物", grossMarginRate: 0.48, repurchaseScore: 68, afterSalesBurden: "低", keywords: ["掛勾", "置物", "收納盒", "收納箱", "收納架", "電線收納", "桌面收納", "防塵罩", "衣架", "束線", "理線"], seasonalKeywords: ["搬家", "開學", "大掃除"] },
  { parentCategory: "生活小物", category: "廚房日用小物", grossMarginRate: 0.46, repurchaseScore: 72, afterSalesBurden: "低", keywords: ["廚房小物", "瀝水", "密封袋", "保鮮盒", "杯刷", "砧板", "餐具", "便當盒", "鍋鏟", "菜瓜布"], seasonalKeywords: ["年節", "搬家", "囤貨"] },
  { parentCategory: "生活小物", category: "浴室清潔小物", grossMarginRate: 0.44, repurchaseScore: 78, afterSalesBurden: "低", keywords: ["浴室", "牙刷架", "肥皂盒", "刮水", "除霉", "馬桶刷", "海綿", "抹布", "清潔刷"], seasonalKeywords: ["大掃除", "換季"] },
  { parentCategory: "生活小物", category: "隨身日用小物", grossMarginRate: 0.50, repurchaseScore: 58, afterSalesBurden: "低", keywords: ["保溫杯", "水壺", "小夜燈", "鑰匙圈", "杯墊", "香氛", "除臭", "旅行瓶", "口罩盒"], seasonalKeywords: ["通勤", "開學", "禮物"] },
  { parentCategory: "3C 電子", category: "耳機與音訊", grossMarginRate: 0.28, repurchaseScore: 38, afterSalesBurden: "高", keywords: ["耳機", "藍牙", "降噪", "喇叭", "音響", "麥克風"], seasonalKeywords: ["通勤", "開學", "禮物"] },
  { parentCategory: "3C 電子", category: "手機配件", grossMarginRate: 0.42, repurchaseScore: 58, afterSalesBurden: "低", keywords: ["手機殼", "保護貼", "充電線", "充電器", "磁吸", "支架", "快充"], seasonalKeywords: ["換機", "開學"] },
  { parentCategory: "3C 電子", category: "電腦周邊", grossMarginRate: 0.30, repurchaseScore: 35, afterSalesBurden: "中", keywords: ["滑鼠", "鍵盤", "螢幕", "電競", "筆電", "散熱", "視訊"], seasonalKeywords: ["開學", "電競"] },
  { parentCategory: "3C 電子", category: "儲存與零組件", grossMarginRate: 0.20, repurchaseScore: 28, afterSalesBurden: "中", keywords: ["SSD", "硬碟", "記憶卡", "隨身碟", "記憶體", "DRAM"], seasonalKeywords: ["開學", "升級"] },
  { parentCategory: "小家電", category: "清潔家電", grossMarginRate: 0.26, repurchaseScore: 24, afterSalesBurden: "高", keywords: ["掃地", "吸塵", "洗地", "清潔機", "機器人"], seasonalKeywords: ["年終", "搬家", "大掃除"] },
  { parentCategory: "小家電", category: "廚房家電", grossMarginRate: 0.32, repurchaseScore: 32, afterSalesBurden: "中", keywords: ["氣炸", "咖啡機", "烤箱", "電鍋", "果汁機", "熱水瓶", "電磁爐"], seasonalKeywords: ["年節", "中秋", "禮物"] },
  { parentCategory: "小家電", category: "空調環境", grossMarginRate: 0.24, repurchaseScore: 25, afterSalesBurden: "高", keywords: ["除濕", "清淨", "電風扇", "循環扇", "冷氣", "暖氣"], seasonalKeywords: ["梅雨", "夏天", "換季"] },
  { parentCategory: "美妝保養", category: "保養品", grossMarginRate: 0.52, repurchaseScore: 86, afterSalesBurden: "低", keywords: ["保養", "精華", "乳液", "面膜", "化妝水", "洗面乳", "洗髮", "牙膏"], seasonalKeywords: ["換季", "母親節", "週年慶"] },
  { parentCategory: "美妝保養", category: "彩妝香氛", grossMarginRate: 0.55, repurchaseScore: 70, afterSalesBurden: "中", keywords: ["彩妝", "口紅", "粉底", "香水", "眼影", "腮紅"], seasonalKeywords: ["節慶", "禮物", "週年慶"] },
  { parentCategory: "健康保健", category: "營養補充", grossMarginRate: 0.45, repurchaseScore: 90, afterSalesBurden: "低", keywords: ["保健", "維他命", "葉黃素", "魚油", "益生菌", "膠原", "鈣", "B群"], seasonalKeywords: ["銀髮", "開學", "年節"] },
  { parentCategory: "健康保健", category: "運動恢復", grossMarginRate: 0.40, repurchaseScore: 48, afterSalesBurden: "中", keywords: ["筋膜槍", "按摩", "護具", "瑜珈", "健身", "蛋白"], seasonalKeywords: ["健身", "恢復"] },
  { parentCategory: "寵物用品", category: "貓狗消耗品", grossMarginRate: 0.34, repurchaseScore: 92, afterSalesBurden: "低", keywords: ["貓砂", "飼料", "罐頭", "寵物", "貓", "狗", "尿布"], seasonalKeywords: ["囤貨", "定期購"] },
  { parentCategory: "母嬰玩具", category: "玩具與親子", grossMarginRate: 0.42, repurchaseScore: 42, afterSalesBurden: "中", keywords: ["玩具", "兒童", "積木", "模型", "桌遊", "娃娃"], seasonalKeywords: ["暑假", "聖誕", "開學"] },
  { parentCategory: "母嬰玩具", category: "嬰幼兒用品", grossMarginRate: 0.38, repurchaseScore: 88, afterSalesBurden: "低", keywords: ["嬰兒", "奶瓶", "尿布", "推車", "安全座椅", "濕巾", "濕紙巾"], seasonalKeywords: ["育兒", "囤貨"] },
  { parentCategory: "運動戶外", category: "露營戶外", grossMarginRate: 0.40, repurchaseScore: 30, afterSalesBurden: "中", keywords: ["露營", "帳篷", "露營燈", "登山", "戶外", "睡袋"], seasonalKeywords: ["春遊", "暑假", "中秋"] },
  { parentCategory: "居家生活", category: "收納清潔", grossMarginRate: 0.36, repurchaseScore: 84, afterSalesBurden: "低", keywords: ["收納", "清潔", "洗衣精", "拖把", "垃圾袋", "置物", "衛生紙"], seasonalKeywords: ["大掃除", "搬家"] },
  { parentCategory: "居家生活", category: "寢具家飾", grossMarginRate: 0.39, repurchaseScore: 36, afterSalesBurden: "低", keywords: ["床包", "枕頭", "棉被", "涼感", "沙發", "地毯"], seasonalKeywords: ["換季", "新居"] },
  { parentCategory: "食品飲料", category: "零食飲品", grossMarginRate: 0.30, repurchaseScore: 88, afterSalesBurden: "低", keywords: ["零食", "餅乾", "咖啡", "咖啡豆", "茶", "飲料", "泡麵", "巧克力"], seasonalKeywords: ["年節", "中秋", "囤貨"] },
  { parentCategory: "服飾鞋包", category: "服飾配件", grossMarginRate: 0.50, repurchaseScore: 46, afterSalesBurden: "中", keywords: ["衣服", "外套", "鞋", "包", "襪", "帽", "內衣"], seasonalKeywords: ["換季", "開學"] },
  { parentCategory: "車用百貨", category: "車用配件", grossMarginRate: 0.35, repurchaseScore: 40, afterSalesBurden: "中", keywords: ["車用", "行車", "吸塵器", "胎壓", "汽車", "機車", "安全帽"], seasonalKeywords: ["旅遊", "通勤"] },
  { parentCategory: "辦公文具", category: "文具辦公", grossMarginRate: 0.44, repurchaseScore: 76, afterSalesBurden: "低", keywords: ["文具", "辦公", "筆", "紙", "印表機", "標籤", "資料夾"], seasonalKeywords: ["開學", "開工"] }
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
  return Array.from(new Set(raw)).slice(0, 42);
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
    repurchaseScore: 45,
    afterSalesBurden: "中",
    keywords: [],
    categoryConfidence: "低"
  };
}

function afterSalesScore(burden: CategoryRule["afterSalesBurden"]) {
  if (burden === "低") return 92;
  if (burden === "中") return 64;
  return 34;
}

function adjustRepurchaseScore(baseScore: number, text: string) {
  let score = baseScore;
  if (/補充包|替換|耗材|定期|箱購|囤貨|組合|入|包|罐|袋|片|抽|顆|錠|膠囊/.test(text)) score += 8;
  if (/保健|葉黃素|魚油|益生菌|貓砂|飼料|尿布|濕紙巾|洗衣精|衛生紙|咖啡|零食|牙膏|洗髮/.test(text)) score += 10;
  if (/掃地|機器人|除濕|冷氣|螢幕|筆電|硬碟|保固|維修/.test(text)) score -= 12;
  if (/禮盒|限量|玩具|模型|帳篷|安全座椅/.test(text)) score -= 6;
  return clamp(score, 0, 100);
}

function adjustAfterSalesScore(baseScore: number, text: string, price: number) {
  let score = baseScore;
  if (/耗材|補充包|食品|零食|洗衣精|衛生紙|牙膏|貓砂|飼料|尿布|濕紙巾/.test(text)) score += 8;
  if (/保固|維修|機器人|掃地|除濕|冷氣|螢幕|筆電|電池|馬達/.test(text)) score -= 18;
  if (price >= 5000) score -= 10;
  if (price <= 500) score += 5;
  return clamp(score, 0, 100);
}

function buildLowServiceRepeatScore(args: {
  salesSignal: number;
  repurchaseScore: number;
  lowAfterSalesScore: number;
  estimatedNetMarginRate: number;
  price: number;
}) {
  const pricePenalty = args.price >= 6000 ? 8 : args.price >= 3000 ? 4 : 0;
  return clamp(
    args.repurchaseScore * 0.34 +
      args.lowAfterSalesScore * 0.30 +
      args.salesSignal * 0.18 +
      Math.max(args.estimatedNetMarginRate, 0) * 75 -
      pricePenalty,
    0,
    100
  );
}

function seasonalityBoost(title: string, rule: CategoryRule, target: "month" | "quarter") {
  const month = new Date().getMonth() + 1;
  const targetMonth = target === "month" ? ((month % 12) + 1) : (((month + 2) % 12) + 1);
  const text = title;
  const categoryText = `${rule.parentCategory} ${rule.category}`;
  let boost = 50;

  if ([6, 7, 8].includes(targetMonth) && (/電風扇|冷氣|清淨|除濕|防曬|露營|飲料|冰|涼感/.test(text) || /空調環境|露營戶外/.test(categoryText))) boost += 22;
  if ([9].includes(targetMonth) && (/耳機|行動電源|滑鼠|鍵盤|SSD|背包|咖啡|中秋|烤肉|文具/.test(text) || /3C 電子|辦公文具/.test(categoryText))) boost += 22;
  if ([10, 11, 12].includes(targetMonth) && (/美妝|保養|咖啡|小家電|玩具|禮|耳機|掃地|氣炸|清淨|香水/.test(text) || /美妝保養|小家電|母嬰玩具/.test(categoryText))) boost += 26;
  if ([1, 2].includes(targetMonth) && (/清潔|收納|年節|禮盒|保健|家電|美妝|玩具|零食/.test(text) || /居家生活|健康保健|食品飲料/.test(categoryText))) boost += 22;
  if ([3, 4, 5].includes(targetMonth) && (/除濕|清淨|防曬|露營|保養|運動|換季/.test(text) || /空調環境|美妝保養|運動戶外/.test(categoryText))) boost += 18;

  if (rule.seasonalKeywords?.some((keyword) => text.includes(keyword))) boost += 8;
  if (target === "quarter" && ["美妝保養", "健康保健", "母嬰玩具", "服飾鞋包"].includes(rule.parentCategory)) boost += 6;

  return clamp(boost, 0, 100);
}

function seasonalProfile(title: string, rule: CategoryRule) {
  const month = new Date().getMonth() + 1;
  const text = title;
  const categoryText = `${rule.parentCategory} ${rule.category}`;
  const reasons: string[] = [];
  let score = 50;

  const add = (condition: boolean, points: number, reason: string) => {
    if (!condition) return;
    score += points;
    reasons.push(reason);
  };

  add([6, 7, 8].includes(month) && (/電風扇|冷氣|清淨|除濕|防曬|露營|飲料|冰|涼感|戶外/.test(text) || /空調環境|露營戶外/.test(categoryText)), 26, "夏季高溫/戶外/防曬需求");
  add([8, 9].includes(month) && (/耳機|滑鼠|鍵盤|SSD|文具|背包|行動電源|手機殼|保護貼/.test(text) || /3C 電子|辦公文具/.test(categoryText)), 24, "開學與換機準備需求");
  add([9, 10].includes(month) && /中秋|烤肉|咖啡|零食|茶|飲料|禮盒|露營/.test(text), 22, "中秋送禮與聚會需求");
  add([10, 11, 12].includes(month) && (/美妝|保養|香水|禮|玩具|小家電|耳機|咖啡|清淨|掃地/.test(text) || /美妝保養|小家電|母嬰玩具/.test(categoryText)), 25, "雙 11、年末送禮與換新需求");
  add([1, 2].includes(month) && (/清潔|收納|洗衣精|衛生紙|零食|保健|禮盒|玩具|家電|美妝/.test(text) || /居家生活|健康保健|食品飲料/.test(categoryText)), 24, "年節囤貨與大掃除需求");
  add([3, 4, 5].includes(month) && (/除濕|清淨|防曬|露營|保養|換季|運動/.test(text) || /空調環境|美妝保養|運動戶外/.test(categoryText)), 20, "梅雨、換季與戶外活動需求");
  add(rule.seasonalKeywords?.some((keyword) => text.includes(keyword)) || false, 10, `分類季節字：${rule.seasonalKeywords?.join("/")}`);
  add(["健康保健", "寵物用品", "食品飲料", "居家生活"].includes(rule.parentCategory), 6, "日常補貨型品類需求穩定");

  return {
    score: clamp(score, 0, 100),
    reason: reasons.length ? reasons.join("、") : "目前沒有明顯季節催化，主要看熱銷排序與價格競爭力"
  };
}

function buildLowCostHighMarginScore(args: {
  price: number;
  grossMarginRate: number;
  estimatedNetMarginRate: number;
  estimatedNetProfit: number;
  salesSignal: number;
  lowAfterSalesScore: number;
}) {
  const grossMarginScore = clamp(args.grossMarginRate * 170, 0, 100);
  const netMarginScore = clamp(Math.max(args.estimatedNetMarginRate, 0) * 230, 0, 100);
  const capitalEfficiencyScore =
    args.price <= 300 ? 95 :
    args.price <= 800 ? 90 :
    args.price <= 1500 ? 78 :
    args.price <= 3000 ? 62 :
    args.price <= 6000 ? 48 :
    32;
  const profitFloorScore = args.estimatedNetProfit > 0 ? clamp(Math.log10(args.estimatedNetProfit + 1) * 34, 0, 100) : 0;

  return clamp(
    grossMarginScore * 0.27 +
      netMarginScore * 0.30 +
      capitalEfficiencyScore * 0.18 +
      args.salesSignal * 0.11 +
      args.lowAfterSalesScore * 0.07 +
      profitFloorScore * 0.07,
    0,
    100
  );
}

const LIFESTYLE_SMALL_ITEM_PATTERN = /掛勾|置物|收納|理線|束線|廚房小物|瀝水|密封袋|保鮮盒|杯刷|餐具|便當盒|菜瓜布|浴室|牙刷架|肥皂盒|刮水|除霉|馬桶刷|海綿|抹布|清潔刷|保溫杯|水壺|小夜燈|鑰匙圈|杯墊|香氛|除臭|旅行瓶|防塵罩|衣架|桌面/;

function detectLifestyleSmallItem(text: string, rule: CategoryRule, price: number) {
  return rule.parentCategory === "生活小物" || (price <= 1200 && LIFESTYLE_SMALL_ITEM_PATTERN.test(text));
}

function buildLifestyleScore(args: {
  isLifestyleSmallItem: boolean;
  price: number;
  lowCostHighMarginScore: number;
  lowAfterSalesScore: number;
  salesSignal: number;
  repurchaseScore: number;
  estimatedNetMarginRate: number;
}) {
  if (!args.isLifestyleSmallItem) return 0;
  const lowCostEntryScore =
    args.price <= 199 ? 100 :
    args.price <= 499 ? 94 :
    args.price <= 899 ? 84 :
    args.price <= 1200 ? 72 :
    48;

  return clamp(
    args.lowCostHighMarginScore * 0.34 +
      lowCostEntryScore * 0.20 +
      args.lowAfterSalesScore * 0.16 +
      args.salesSignal * 0.12 +
      args.repurchaseScore * 0.10 +
      Math.max(args.estimatedNetMarginRate, 0) * 65,
    0,
    100
  );
}

function lifestyleReason(product: {
  isLifestyleSmallItem: boolean;
  price: number;
  grossMarginRate: number;
  afterSalesBurden: "低" | "中" | "高";
  estimatedNetMarginRate: number;
}) {
  if (!product.isLifestyleSmallItem) return "非生活小物主分類，生活小物分不列入主要判斷";
  const parts = [];
  if (product.price <= 500) parts.push("低單價容易測品");
  if (product.grossMarginRate >= 0.44) parts.push("分類毛利率偏高");
  if (product.afterSalesBurden === "低") parts.push("售服負擔低");
  if (product.estimatedNetMarginRate > 0.12) parts.push("估算淨利率較佳");
  return parts.length ? parts.join("、") : "生活小物屬性明確，但需確認實際進貨價與退貨率";
}

const SMALL_SIZE_PATTERN = /掛勾|杯墊|束線|理線|旅行瓶|口罩盒|肥皂盒|牙刷架|防塵罩|密封袋|菜瓜布|抹布|清潔刷|小夜燈|香氛|除臭|鑰匙圈|保護貼|手機殼|充電線|杯刷|餐具|文具|資料夾|標籤|耳機|隨身碟|記憶卡/;
const MEDIUM_SIZE_PATTERN = /置物架|收納盒|收納箱|桌面收納|浴室收納|廚房小物|瀝水|保溫杯|水壺|便當盒|保鮮盒|馬桶刷|拖把|露營燈|抱枕|枕頭|玩具|筋膜槍|滑鼠|鍵盤/;
const LARGE_SIZE_PATTERN = /掃地機器人|洗地|吸塵器|除濕機|空氣清淨|清淨機|氣炸鍋|咖啡機|烤箱|電鍋|螢幕|筆電|帳篷|睡袋|棉被|沙發|地毯|推車|安全座椅|冷氣/;

function detectSizeProfile(text: string, rule: CategoryRule, price: number): { className: ProductSizeClass; label: string; score: number; reason: string } {
  const lowerRiskCategory = ["生活小物", "辦公文具", "美妝保養", "健康保健", "食品飲料"].includes(rule.parentCategory);

  if (LARGE_SIZE_PATTERN.test(text) || price >= 8000) {
    return {
      className: "large",
      label: "大型",
      score: price >= 12000 ? 28 : 36,
      reason: "體積或單價偏大，倉儲、物流、退貨與售後成本較高。"
    };
  }

  if (SMALL_SIZE_PATTERN.test(text) || (price <= 699 && lowerRiskCategory)) {
    return {
      className: "small",
      label: "小型",
      score: price <= 399 ? 94 : 88,
      reason: "體積小、寄送與倉儲壓力低，適合先用小量測品。"
    };
  }

  if (MEDIUM_SIZE_PATTERN.test(text) || price <= 2500) {
    return {
      className: "medium",
      label: "中型",
      score: price <= 1500 ? 74 : 66,
      reason: "體積與物流壓力中等，需確認包材、材積與退貨率。"
    };
  }

  return {
    className: "unknown",
    label: "不明",
    score: 55,
    reason: "公開資料未揭露實際尺寸，建議補上供應商長寬高與材積再判斷。"
  };
}

function buildSelectionScore(args: {
  seasonalHotScore: number;
  repurchaseScore: number;
  lowCostHighMarginScore: number;
  sizeScore: number;
  lowAfterSalesScore: number;
  salesSignal: number;
  estimatedNetMarginRate: number;
}) {
  return clamp(
    args.seasonalHotScore * 0.24 +
      args.repurchaseScore * 0.18 +
      args.lowCostHighMarginScore * 0.24 +
      args.sizeScore * 0.14 +
      args.lowAfterSalesScore * 0.08 +
      args.salesSignal * 0.08 +
      Math.max(args.estimatedNetMarginRate, 0) * 38,
    0,
    100
  );
}

function selectionAdvice(score: number, sizeClass: ProductSizeClass, netProfit: number) {
  if (score >= 78 && netProfit > 0 && sizeClass !== "large") return "優先測品" as const;
  if (score >= 65 && netProfit > 0) return "可小量測試" as const;
  if (score >= 52) return "等待比價" as const;
  return "暫不建議" as const;
}

function buildSelectionReasons(product: {
  seasonalHotScore: number;
  repurchaseScore: number;
  lowCostHighMarginScore: number;
  sizeLabel: string;
  sizeScore: number;
  sizeReason: string;
  lowAfterSalesScore: number;
  estimatedNetProfit: number;
  estimatedNetMarginRate: number;
}) {
  return [
    `季節性 ${round(product.seasonalHotScore, 1)} 分，代表近期或下一季需求熱度。`,
    `回購率 ${round(product.repurchaseScore, 1)} 分，分數越高越適合做長期品項。`,
    `低成本高毛利 ${round(product.lowCostHighMarginScore, 1)} 分，估淨利 ${round(product.estimatedNetProfit).toLocaleString()} 元，估淨利率 ${round(product.estimatedNetMarginRate * 100, 1)}%。`,
    `尺寸 ${product.sizeLabel}，尺寸分 ${round(product.sizeScore, 1)}：${product.sizeReason}`,
    `售後負擔安全分 ${round(product.lowAfterSalesScore, 1)}，分數越高代表退換貨與客服壓力相對低。`
  ];
}

function buildCompactLifestyleScore(args: {
  isLifestyleSmallItem: boolean;
  price: number;
  estimatedProductCost: number;
  estimatedNetProfit: number;
  repurchaseScore: number;
  sizeClass: ProductSizeClass;
  sizeScore: number;
  lowAfterSalesScore: number;
  lowCostHighMarginScore: number;
}) {
  if (!args.isLifestyleSmallItem) return 0;

  const priceScore =
    args.price <= 199 ? 100 :
    args.price <= 399 ? 94 :
    args.price <= 699 ? 86 :
    args.price <= 999 ? 76 :
    args.price <= 1500 ? 58 :
    36;
  const costScore =
    args.estimatedProductCost <= 100 ? 100 :
    args.estimatedProductCost <= 250 ? 92 :
    args.estimatedProductCost <= 500 ? 80 :
    args.estimatedProductCost <= 800 ? 66 :
    args.estimatedProductCost <= 1200 ? 50 :
    30;
  const sizeFitScore =
    args.sizeClass === "small" ? 100 :
    args.sizeClass === "medium" ? 72 :
    args.sizeClass === "unknown" ? 54 :
    15;

  const raw =
    priceScore * 0.20 +
    costScore * 0.22 +
    args.repurchaseScore * 0.24 +
    sizeFitScore * 0.18 +
    args.lowAfterSalesScore * 0.08 +
    args.lowCostHighMarginScore * 0.08;

  if (args.estimatedNetProfit <= 0) return Math.min(clamp(raw, 0, 100), 48);
  if (args.sizeClass === "large") return Math.min(clamp(raw, 0, 100), 38);
  return clamp(raw, 0, 100);
}

function compactLifestyleReason(product: {
  price: number;
  estimatedProductCost: number;
  repurchaseScore: number;
  sizeLabel: string;
  sizeReason: string;
  estimatedNetProfit: number;
  estimatedNetMarginRate: number;
}) {
  return [
    `售價 ${round(product.price).toLocaleString()} 元`,
    `估成本 ${round(product.estimatedProductCost).toLocaleString()} 元`,
    `回購分 ${round(product.repurchaseScore, 1)}`,
    `尺寸 ${product.sizeLabel}`,
    `估淨利 ${round(product.estimatedNetProfit).toLocaleString()} 元`,
    `估淨利率 ${round(product.estimatedNetMarginRate * 100, 1)}%`,
    product.sizeReason
  ].join("，");
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
  const estimatedGrossProfit = price - estimatedProductCost;
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
    estimatedGrossProfit: round(estimatedGrossProfit),
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

function buildCommerceProduct(input: RawCommerceInput, costSettings: CostSettings): CommerceProduct {
  const price = Number(input.price || 0);
  const originalPrice = Number(input.originalPrice || price);
  const discountPct = originalPrice > price ? ((originalPrice - price) / originalPrice) * 100 : 0;
  const searchText = `${input.title} ${input.description} ${input.keyword}`;
  const category = detectCategory(searchText);
  const rankScore = clamp(100 - (input.rank - 1) * 10, 0, 100);
  const breadthScore = clamp(Math.log10(input.searchTotalRows + 1) * 18, 0, 70);
  const externalSoldScore = input.externalSoldSignal ? clamp(Math.log10(input.externalSoldSignal + 1) * 22, 0, 80) : 0;
  const salesSignal = input.externalSoldSignal
    ? clamp(rankScore * 0.52 + breadthScore * 0.18 + externalSoldScore * 0.24 + (discountPct > 0 ? 4 : 0), 0, 100)
    : clamp(rankScore * 0.72 + breadthScore * 0.28 + (discountPct > 0 ? 4 : 0), 0, 100);
  const costs = buildCostModel(price, category.grossMarginRate, costSettings);
  const estimatedProfitIndex = Math.max(costs.estimatedNetProfit, 0) * (salesSignal / 100);
  const repurchaseScore = adjustRepurchaseScore(category.repurchaseScore, searchText);
  const lowAfterSalesScore = adjustAfterSalesScore(afterSalesScore(category.afterSalesBurden), searchText, price);
  const lowServiceRepeatScore = buildLowServiceRepeatScore({
    salesSignal,
    repurchaseScore,
    lowAfterSalesScore,
    estimatedNetMarginRate: costs.estimatedNetMarginRate,
    price
  });
  const seasonNow = seasonalProfile(input.title, category);
  const lowCostHighMarginScore = buildLowCostHighMarginScore({
    price,
    grossMarginRate: category.grossMarginRate,
    estimatedNetMarginRate: costs.estimatedNetMarginRate,
    estimatedNetProfit: costs.estimatedNetProfit,
    salesSignal,
    lowAfterSalesScore
  });
  const isLifestyleSmallItem = detectLifestyleSmallItem(searchText, category, price);
  const lifestyleScore = buildLifestyleScore({
    isLifestyleSmallItem,
    price,
    lowCostHighMarginScore,
    lowAfterSalesScore,
    salesSignal,
    repurchaseScore,
    estimatedNetMarginRate: costs.estimatedNetMarginRate
  });
  const seasonMonth = seasonalityBoost(input.title, category, "month");
  const seasonQuarter = seasonalityBoost(input.title, category, "quarter");
  const seasonalHotScore = clamp(salesSignal * 0.40 + seasonNow.score * 0.34 + lowCostHighMarginScore * 0.10 + lowServiceRepeatScore * 0.08 + (discountPct > 0 ? 6 : 0), 0, 100);
  const nextMonthScore = clamp(salesSignal * 0.44 + seasonMonth * 0.22 + lowServiceRepeatScore * 0.14 + lowCostHighMarginScore * 0.10 + Math.max(costs.estimatedNetMarginRate, 0) * 36 + (discountPct > 0 ? 6 : 0), 0, 100);
  const nextQuarterScore = clamp(salesSignal * 0.38 + seasonQuarter * 0.30 + lowServiceRepeatScore * 0.16 + lowCostHighMarginScore * 0.10 + Math.max(costs.estimatedNetMarginRate, 0) * 42 + (price < 3000 ? 4 : 0), 0, 100);
  const sizeProfile = detectSizeProfile(searchText, category, price);
  const selectionScore = buildSelectionScore({
    seasonalHotScore,
    repurchaseScore,
    lowCostHighMarginScore,
    sizeScore: sizeProfile.score,
    lowAfterSalesScore,
    salesSignal,
    estimatedNetMarginRate: costs.estimatedNetMarginRate
  });
  const selectionReasons = buildSelectionReasons({
    seasonalHotScore,
    repurchaseScore,
    lowCostHighMarginScore,
    sizeLabel: sizeProfile.label,
    sizeScore: sizeProfile.score,
    sizeReason: sizeProfile.reason,
    lowAfterSalesScore,
    estimatedNetProfit: costs.estimatedNetProfit,
    estimatedNetMarginRate: costs.estimatedNetMarginRate
  });
  const compactLifestyleScore = buildCompactLifestyleScore({
    isLifestyleSmallItem,
    price,
    estimatedProductCost: costs.estimatedProductCost,
    estimatedNetProfit: costs.estimatedNetProfit,
    repurchaseScore,
    sizeClass: sizeProfile.className,
    sizeScore: sizeProfile.score,
    lowAfterSalesScore,
    lowCostHighMarginScore
  });
  const soldText = input.externalSoldSignal ? ` / 銷售訊號 ${input.externalSoldSignal.toLocaleString()}` : "";

  return {
    id: input.id,
    title: input.title,
    source: input.source,
    marketplace: input.marketplace,
    keyword: input.keyword,
    rank: input.rank,
    url: input.url,
    imageUrl: input.imageUrl,
    price,
    originalPrice,
    currency: "TWD",
    discountPct: round(discountPct, 1),
    searchTotalRows: input.searchTotalRows,
    salesSignal: round(salesSignal, 1),
    salesSignalLabel: `熱銷排序第 ${input.rank} 名 / 搜尋池 ${input.searchTotalRows.toLocaleString()} 件${soldText}`,
    parentCategory: category.parentCategory,
    category: category.category,
    categoryConfidence: category.categoryConfidence,
    repurchaseScore: round(repurchaseScore, 1),
    afterSalesBurden: category.afterSalesBurden,
    lowAfterSalesScore: round(lowAfterSalesScore, 1),
    lowServiceRepeatScore: round(lowServiceRepeatScore, 1),
    seasonalHotScore: round(seasonalHotScore, 1),
    seasonalReason: seasonNow.reason,
    lowCostHighMarginScore: round(lowCostHighMarginScore, 1),
    isLifestyleSmallItem,
    lifestyleScore: round(lifestyleScore, 1),
    lifestyleReason: lifestyleReason({
      isLifestyleSmallItem,
      price,
      grossMarginRate: category.grossMarginRate,
      afterSalesBurden: category.afterSalesBurden,
      estimatedNetMarginRate: costs.estimatedNetMarginRate
    }),
    sizeClass: sizeProfile.className,
    sizeLabel: sizeProfile.label,
    sizeScore: round(sizeProfile.score, 1),
    sizeReason: sizeProfile.reason,
    selectionScore: round(selectionScore, 1),
    selectionAdvice: selectionAdvice(selectionScore, sizeProfile.className, costs.estimatedNetProfit),
    selectionReasons,
    compactLifestyleScore: round(compactLifestyleScore, 1),
    compactLifestyleReason: compactLifestyleReason({
      price,
      estimatedProductCost: costs.estimatedProductCost,
      repurchaseScore,
      sizeLabel: sizeProfile.label,
      sizeReason: sizeProfile.reason,
      estimatedNetProfit: costs.estimatedNetProfit,
      estimatedNetMarginRate: costs.estimatedNetMarginRate
    }),
    grossMarginRate: category.grossMarginRate,
    ...costs,
    estimatedProfitIndex: round(estimatedProfitIndex, 1),
    breakEvenPrice: costs.breakEvenPrice,
    externalSoldSignal: input.externalSoldSignal,
    nextMonthScore: round(nextMonthScore, 1),
    nextQuarterScore: round(nextQuarterScore, 1),
    confidence: input.searchTotalRows >= 1000 && input.rank <= 5 ? "高" : input.searchTotalRows >= 200 || Number(input.externalSoldSignal || 0) >= 100 ? "中" : "低",
    reasons: [
      `${input.marketplace} 熱銷排序 ${input.rank}，代表目前平台排序訊號靠前。`,
      `搜尋池共有 ${input.searchTotalRows.toLocaleString()} 件，需求廣度${input.searchTotalRows >= 1000 ? "大" : input.searchTotalRows >= 200 ? "中等" : "偏小"}。`,
      input.externalSoldSignal ? `外部銷售訊號 ${input.externalSoldSignal.toLocaleString()}，已納入熱銷分。` : "來源沒有公開實際銷量，主要使用排序與商品池推估。",
      `分類為 ${category.parentCategory} / ${category.category}，分類可信度 ${category.categoryConfidence}。`,
      `回購分 ${round(repurchaseScore, 1)}，售服負擔 ${category.afterSalesBurden}，低售服回購分 ${round(lowServiceRepeatScore, 1)}。`,
      `季節熱賣分 ${round(seasonalHotScore, 1)}：${seasonNow.reason}。`,
      `低成本高毛利分 ${round(lowCostHighMarginScore, 1)}，估毛利 ${costs.estimatedGrossProfit.toLocaleString()} 元，估淨利 ${costs.estimatedNetProfit.toLocaleString()} 元。`,
      isLifestyleSmallItem ? `生活小物分 ${round(lifestyleScore, 1)}：${lifestyleReason({ isLifestyleSmallItem, price, grossMarginRate: category.grossMarginRate, afterSalesBurden: category.afterSalesBurden, estimatedNetMarginRate: costs.estimatedNetMarginRate })}。` : "非生活小物主分類，不列入生活小物重點榜。",
      `估進貨成本 ${round(costs.costRate * 100, 1)}%，加上平台費、金流、物流、廣告與退貨準備後，估淨利 ${costs.estimatedNetProfit.toLocaleString()} 元。`
    ],
    riskNotes: [
      `${input.marketplace} 公開資料可能沒有揭露完整成交件數。`,
      "成本為估算值，尚未接你的真實進貨單、平台合約、物流費率與廣告後台。",
      category.afterSalesBurden === "高" ? "此類商品售後、保固或維修負擔較高，需保守估算客服成本。" : "此類商品售服負擔相對可控，但仍需留意退貨率與評價。",
      "如果商品需要保固、客服或高退貨率，實際淨利可能低於本模型。"
    ]
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
      return buildCommerceProduct({
        id,
        title: String(item.name || "未命名商品"),
        description: String(item.describe || ""),
        source: "PChome 24h 公開搜尋",
        marketplace: "PChome 24h",
        keyword,
        rank: index + 1,
        url: productUrl(id),
        imageUrl: imageUrl(item.picS || item.picB),
        price: Number(item.price || 0),
        originalPrice: Number(item.originPrice || item.price || 0),
        searchTotalRows: totalRows
      }, costSettings);
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

function shopeeProductUrl(shopid?: number, itemid?: number) {
  if (!shopid || !itemid) return "https://shopee.tw/search";
  return `https://shopee.tw/product/${shopid}/${itemid}`;
}

function shopeeImageUrl(image?: string) {
  if (!image) return "";
  return `https://cf.shopee.tw/file/${image}`;
}

function normalizeShopeePrice(value?: number) {
  const raw = Number(value || 0);
  if (!Number.isFinite(raw) || raw <= 0) return 0;
  return Math.round(raw / 100000);
}

async function fetchShopeeKeyword(keyword: string, limit: number, costSettings: CostSettings): Promise<{ products: CommerceProduct[]; status: CommerceSourceStatus }> {
  const url = `https://shopee.tw/api/v4/search/search_items?by=relevancy&keyword=${encodeURIComponent(keyword)}&limit=${limit}&newest=0&order=desc&page_type=search&scenario=PAGE_GLOBAL_SEARCH&version=2`;
  const fetchedAt = new Date().toISOString();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 7000);

  try {
    const response = await fetch(url, {
      cache: "no-store",
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        Referer: `https://shopee.tw/search?keyword=${encodeURIComponent(keyword)}`,
        "User-Agent": "Mozilla/5.0 ecommerce-radar"
      }
    });

    if (!response.ok) throw new Error(`Shopee returned HTTP ${response.status}`);

    const payload = (await response.json()) as ShopeeSearchResponse;
    const rows = Array.isArray(payload.items) ? payload.items.slice(0, limit) : [];
    const totalRows = Number(payload.total_count || rows.length || 0);
    const products = rows.flatMap<CommerceProduct>((item, index) => {
      const basic = item.item_basic;
      if (!basic?.itemid || !basic.shopid || !basic.name) return [];
      const price = normalizeShopeePrice(basic.price);
      if (!price) return [];
      const originalPrice = normalizeShopeePrice(basic.price_before_discount) || price;
      const sold = Number(basic.historical_sold || basic.sold || 0);

      return buildCommerceProduct({
        id: `${basic.shopid}-${basic.itemid}`,
        title: basic.name,
        description: "",
        source: "Shopee 蝦皮公開搜尋",
        marketplace: "Shopee 蝦皮",
        keyword,
        rank: index + 1,
        url: shopeeProductUrl(basic.shopid, basic.itemid),
        imageUrl: shopeeImageUrl(basic.image),
        price,
        originalPrice,
        searchTotalRows: totalRows,
        externalSoldSignal: sold > 0 ? sold : undefined
      }, costSettings);
    });

    return {
      products,
      status: {
        source: `Shopee 蝦皮：${keyword}`,
        ok: products.length > 0,
        fetchedAt,
        url,
        message: products.length > 0
          ? `取得 ${products.length} 件商品，搜尋池 ${totalRows.toLocaleString()} 件；若來源有公開 sold/historical_sold，已納入銷售訊號。`
          : "蝦皮公開端點未回傳可用商品，可能需要登入 Cookie 或受到反爬限制。"
      }
    };
  } catch (error) {
    return {
      products: [],
      status: {
        source: `Shopee 蝦皮：${keyword}`,
        ok: false,
        fetchedAt,
        url,
        message: error instanceof Error ? `${error.message}；此來源可能需要登入 Cookie 或受到反爬限制。` : "蝦皮來源讀取失敗"
      }
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchPinduoduoKeyword(keyword: string): Promise<{ products: CommerceProduct[]; status: CommerceSourceStatus }> {
  const url = `https://mobile.yangkeduo.com/search_result.html?search_key=${encodeURIComponent(keyword)}`;
  const fetchedAt = new Date().toISOString();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 6000);

  try {
    const response = await fetch(url, {
      cache: "no-store",
      signal: controller.signal,
      headers: {
        Accept: "text/html,application/xhtml+xml",
        "User-Agent": "Mozilla/5.0 ecommerce-radar"
      }
    });

    return {
      products: [],
      status: {
        source: `拼多多：${keyword}`,
        ok: false,
        fetchedAt,
        url,
        message: response.ok
          ? "已嘗試連線，但拼多多匿名頁面沒有穩定公開 JSON 商品/價格資料；為避免硬爬錯誤資料，未納入計分。"
          : `拼多多返回 HTTP ${response.status}，未納入計分。`
      }
    };
  } catch (error) {
    return {
      products: [],
      status: {
        source: `拼多多：${keyword}`,
        ok: false,
        fetchedAt,
        url,
        message: error instanceof Error ? `${error.message}；拼多多通常需要動態驗證或正式資料介面。` : "拼多多來源讀取失敗"
      }
    };
  } finally {
    clearTimeout(timeout);
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

function pickExternalKeywords(keywords: string[]) {
  const lifestyleKeywords = keywords.filter((keyword) => LIFESTYLE_SMALL_ITEM_PATTERN.test(keyword)).slice(0, 8);
  const base = lifestyleKeywords.length ? lifestyleKeywords : keywords.slice(0, 6);
  return Array.from(new Set(base)).slice(0, 8);
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
      averageRepurchaseScore: round(rows.reduce((sum, product) => sum + product.repurchaseScore, 0) / rows.length, 1),
      averageLowAfterSalesScore: round(rows.reduce((sum, product) => sum + product.lowAfterSalesScore, 0) / rows.length, 1),
      averageLowServiceRepeatScore: round(rows.reduce((sum, product) => sum + product.lowServiceRepeatScore, 0) / rows.length, 1),
      averageSeasonalHotScore: round(rows.reduce((sum, product) => sum + product.seasonalHotScore, 0) / rows.length, 1),
      averageLowCostHighMarginScore: round(rows.reduce((sum, product) => sum + product.lowCostHighMarginScore, 0) / rows.length, 1),
      averageLifestyleScore: round(rows.reduce((sum, product) => sum + product.lifestyleScore, 0) / rows.length, 1),
      bestProductTitle: best?.title || "",
      bestProductUrl: best?.url || ""
    };
  }).sort((a, b) => Math.max(b.averageSeasonalHotScore, b.averageLowCostHighMarginScore, b.averageLowServiceRepeatScore) - Math.max(a.averageSeasonalHotScore, a.averageLowCostHighMarginScore, a.averageLowServiceRepeatScore));
}

function buildLifestyleSummary(products: CommerceProduct[]): LifestyleSmallItemSummary {
  const rows = products.filter((product) => product.isLifestyleSmallItem);
  const top = sortDesc(rows, (product) => product.lifestyleScore * 0.45 + product.lowCostHighMarginScore * 0.35 + product.salesSignal * 0.20)[0];

  if (!rows.length) {
    return {
      productCount: 0,
      averagePrice: 0,
      averageGrossMarginRate: 0,
      averageNetMarginRate: 0,
      averageLowCostHighMarginScore: 0,
      averageLifestyleScore: 0,
      averageSalesSignal: 0,
      marketplaces: [],
      topProductTitle: "",
      topProductUrl: ""
    };
  }

  return {
    productCount: rows.length,
    averagePrice: round(rows.reduce((sum, product) => sum + product.price, 0) / rows.length),
    averageGrossMarginRate: round(rows.reduce((sum, product) => sum + product.grossMarginRate, 0) / rows.length, 4),
    averageNetMarginRate: round(rows.reduce((sum, product) => sum + product.estimatedNetMarginRate, 0) / rows.length, 4),
    averageLowCostHighMarginScore: round(rows.reduce((sum, product) => sum + product.lowCostHighMarginScore, 0) / rows.length, 1),
    averageLifestyleScore: round(rows.reduce((sum, product) => sum + product.lifestyleScore, 0) / rows.length, 1),
    averageSalesSignal: round(rows.reduce((sum, product) => sum + product.salesSignal, 0) / rows.length, 1),
    marketplaces: Array.from(new Set(rows.map((product) => product.marketplace))).sort(),
    topProductTitle: top?.title || "",
    topProductUrl: top?.url || ""
  };
}

export async function runEcommerceRadar(options?: { keywords?: string | null; perKeywordLimit?: number; costSettings?: Partial<CostSettings>; includeExternalSources?: boolean }) {
  const keywords = cleanKeywords(options?.keywords);
  const perKeywordLimit = clamp(Number(options?.perKeywordLimit || 8), 3, 12);
  const costSettings = normalizeCostSettings(options?.costSettings);
  const pchomeResults = await Promise.all(keywords.map((keyword) => fetchPchomeKeyword(keyword, perKeywordLimit, costSettings)));
  const includeExternalSources = options?.includeExternalSources ?? true;
  const externalKeywords = includeExternalSources ? pickExternalKeywords(keywords) : [];
  const [shopeeResults, pinduoduoResults] = includeExternalSources
    ? await Promise.all([
        Promise.all(externalKeywords.map((keyword) => fetchShopeeKeyword(keyword, Math.min(perKeywordLimit, 6), costSettings))),
        Promise.all(externalKeywords.slice(0, 3).map((keyword) => fetchPinduoduoKeyword(keyword)))
      ])
    : [[], []] as Array<Array<{ products: CommerceProduct[]; status: CommerceSourceStatus }>>;
  const results = [...pchomeResults, ...shopeeResults, ...pinduoduoResults];
  const products = uniqueProducts(results.flatMap((result) => result.products));

  const topSales = sortDesc(products, (product) => product.salesSignal).slice(0, 10);
  const topProfit = sortDesc(products, (product) => product.estimatedProfitIndex).slice(0, 10);
  const lowServiceHighRepurchase = sortDesc(products, (product) => product.lowServiceRepeatScore).slice(0, 10);
  const seasonalHotProducts = sortDesc(products, (product) => product.seasonalHotScore).slice(0, 10);
  const lowCostHighMarginProducts = sortDesc(products, (product) => product.lowCostHighMarginScore).slice(0, 10);
  const lifestyleProducts = sortDesc(products.filter((product) => product.isLifestyleSmallItem), (product) => product.lifestyleScore).slice(0, 20);
  const lifestyleLowCostHighProfitProducts = sortDesc(
    products.filter((product) => product.isLifestyleSmallItem && product.estimatedNetProfit > 0),
    (product) => product.lifestyleScore * 0.42 + product.lowCostHighMarginScore * 0.40 + product.salesSignal * 0.18
  ).slice(0, 12);
  const compactLifestylePool = products.filter((product) =>
    product.isLifestyleSmallItem &&
    product.estimatedNetProfit > 0 &&
    product.sizeClass !== "large"
  );
  const strictCompactLifestylePool = compactLifestylePool.filter((product) =>
    product.price <= 1200 &&
    product.estimatedProductCost <= 800 &&
    product.repurchaseScore >= 55 &&
    product.compactLifestyleScore >= 60
  );
  const compactLifestyleRecommendations = sortDesc(
    strictCompactLifestylePool.length ? strictCompactLifestylePool : compactLifestylePool,
    (product) => product.compactLifestyleScore
  ).slice(0, 12);
  const productSelectionRecommendations = sortDesc(
    products.filter((product) => product.estimatedNetProfit > 0),
    (product) => product.selectionScore
  ).slice(0, 15);
  const nextMonthWinners = sortDesc(products, (product) => product.nextMonthScore).slice(0, 10);
  const nextQuarterWinners = sortDesc(products, (product) => product.nextQuarterScore).slice(0, 10);

  return {
    updatedAt: new Date().toISOString(),
    dataMode: "real-public-signal" as const,
    costSettings,
    sources: results.map((result) => result.status),
    scannedKeywords: keywords,
    categorySummary: buildCategorySummary(products),
    lifestyleSummary: buildLifestyleSummary(products),
    products,
    topSales,
    topProfit,
    lowServiceHighRepurchase,
    seasonalHotProducts,
    lowCostHighMarginProducts,
    lifestyleProducts,
    lifestyleLowCostHighProfitProducts,
    compactLifestyleRecommendations,
    productSelectionRecommendations,
    nextMonthWinners,
    nextQuarterWinners,
    limitations: [
      "目前使用 PChome 24h 公開搜尋 JSON：商品、價格、折扣、搜尋池與熱銷排序是真實公開資料。",
      "系統會盡量嘗試 Shopee 蝦皮公開搜尋端點；若來源要求登入 Cookie、驗證或被反爬，會在來源狀態中標示失敗，不使用假資料補值。",
      "拼多多匿名網頁目前沒有穩定公開 JSON 商品/價格資料；系統會嘗試連線並標示來源狀態，但不硬爬動態頁面避免錯誤資料。",
      "PChome 沒有公開實際成交件數，所以「銷售量最大」以熱銷排序分數呈現，不顯示假件數。",
      "生活小物分是依低單價、低售服、低成本高毛利、熱銷排序、回購與淨利率推估，適合找可測品，不等於保證出單。",
      "回購分與售服負擔是依商品分類、商品關鍵字、價格與耗材特徵推估；若要精準，需要接實際訂單回購率、客服工單與退貨資料。",
      "季節熱賣分是依目前月份、類別季節字、熱銷排序、折扣與成本效率推估；它是進貨輔助，不是平台保證銷量。",
      "低成本高毛利分是依毛利率、淨利率、售價門檻、熱銷分與售服負擔推估；真正獲利仍需要接真實進貨成本、廣告成本與退貨率。",
      "成本為模型估算，包含進貨成本、平台費、金流費、物流、廣告與退貨準備金；若要真正精準，必須接你的進貨成本與店鋪報表。",
      "預估下月/下季爆品使用熱銷排序、搜尋池、折扣、價格帶、分類成本與季節性，屬於決策輔助，不是保證銷售。"
    ]
  } satisfies CommerceRadarReport;
}
