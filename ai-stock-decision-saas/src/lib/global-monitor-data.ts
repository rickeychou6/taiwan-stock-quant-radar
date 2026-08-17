export type MonitorLayer = "market" | "policy" | "supply" | "energy" | "conflict" | "disaster" | "cyber";

export type MonitorRegion = "global" | "americas" | "europe" | "mena" | "asia" | "africa" | "latam" | "oceania";

export type MonitorSeverity = "critical" | "high" | "medium" | "watch";

export type MonitorEvent = {
  id: string;
  title: string;
  location: string;
  region: Exclude<MonitorRegion, "global">;
  layer: MonitorLayer;
  severity: MonitorSeverity;
  confidence: number;
  updatedAgo: string;
  x: number;
  y: number;
  summary: string;
  marketImpact: string;
  stockFocus: string[];
  sources: string[];
};

export type MonitorQuote = {
  symbol: string;
  label: string;
  price: string;
  changePct: number;
  source: string;
};

export const layerMeta: Record<MonitorLayer, { label: string; dot: string; text: string }> = {
  market: { label: "市場", dot: "bg-sky-300", text: "text-sky-200" },
  policy: { label: "政策", dot: "bg-violet-300", text: "text-violet-200" },
  supply: { label: "供應鏈", dot: "bg-amber-300", text: "text-amber-200" },
  energy: { label: "能源", dot: "bg-lime-300", text: "text-lime-200" },
  conflict: { label: "衝突", dot: "bg-rose-300", text: "text-rose-200" },
  disaster: { label: "天災", dot: "bg-orange-300", text: "text-orange-200" },
  cyber: { label: "網路", dot: "bg-cyan-300", text: "text-cyan-200" }
};

export const regionMeta: Record<MonitorRegion, { label: string; short: string }> = {
  global: { label: "全球", short: "全球" },
  americas: { label: "北美", short: "北美" },
  europe: { label: "歐洲", short: "歐洲" },
  mena: { label: "中東", short: "中東" },
  asia: { label: "亞洲", short: "亞洲" },
  africa: { label: "非洲", short: "非洲" },
  latam: { label: "拉美", short: "拉美" },
  oceania: { label: "大洋洲", short: "大洋洲" }
};

export const monitorEvents: MonitorEvent[] = [
  {
    id: "taiwan-semiconductor-risk",
    title: "台海與半導體運輸風險升溫",
    location: "台灣海峽",
    region: "asia",
    layer: "supply",
    severity: "high",
    confidence: 86,
    updatedAgo: "示範事件",
    x: 78,
    y: 44,
    summary: "航運保險、半導體出口與電子零組件交期同時被市場重新定價。",
    marketImpact: "台股電子、費半、晶圓代工與伺服器供應鏈波動放大。",
    stockFocus: ["2330.TW", "2317.TW", "2382.TW", "^SOX"],
    sources: ["公開新聞", "市場報價", "供應鏈訊號"]
  },
  {
    id: "red-sea-shipping",
    title: "紅海航線繞行維持高成本",
    location: "紅海 / 蘇伊士",
    region: "mena",
    layer: "conflict",
    severity: "high",
    confidence: 82,
    updatedAgo: "示範事件",
    x: 56,
    y: 45,
    summary: "船期延長、保費走高，對海運、零售庫存與能源交付形成連鎖壓力。",
    marketImpact: "貨櫃航運、油價、歐洲進口成本與通膨預期同步受影響。",
    stockFocus: ["2603.TW", "2609.TW", "CL=F", "EURUSD"],
    sources: ["航運公告", "能源價格", "區域新聞"]
  },
  {
    id: "us-rate-path",
    title: "美國利率路徑重新定價",
    location: "華盛頓 / 紐約",
    region: "americas",
    layer: "policy",
    severity: "medium",
    confidence: 78,
    updatedAgo: "示範事件",
    x: 24,
    y: 39,
    summary: "通膨與就業數據使市場調整降息時程，成長股估值敏感度上升。",
    marketImpact: "Nasdaq、美元、美債殖利率與高本益比科技股受壓。",
    stockFocus: ["^IXIC", "NQ=F", "DX-Y.NYB", "NVDA"],
    sources: ["央行訊號", "債券市場", "指數期貨"]
  },
  {
    id: "japan-yen-volatility",
    title: "日圓波動影響亞洲資金輪動",
    location: "東京",
    region: "asia",
    layer: "market",
    severity: "medium",
    confidence: 74,
    updatedAgo: "示範事件",
    x: 82,
    y: 37,
    summary: "匯率急動提高套息交易回補風險，亞洲股市資金節奏轉快。",
    marketImpact: "日經、韓股、台股大型電子與出口股需降低追價權重。",
    stockFocus: ["^N225", "^KS11", "^TWII", "JPY=X"],
    sources: ["外匯市場", "亞洲指數", "期貨盤"]
  },
  {
    id: "europe-gas-buffer",
    title: "歐洲天然氣庫存支撐能源風險",
    location: "西歐",
    region: "europe",
    layer: "energy",
    severity: "watch",
    confidence: 71,
    updatedAgo: "示範事件",
    x: 50,
    y: 35,
    summary: "庫存水位仍提供緩衝，但極端天候與地緣事件會放大短線波動。",
    marketImpact: "天然氣、化工、航運燃料與歐洲通膨預期維持觀察。",
    stockFocus: ["NG=F", "SHEL", "BASF.DE", "EURUSD"],
    sources: ["能源資料", "天氣模型", "歐洲市場"]
  },
  {
    id: "west-africa-mining",
    title: "西非礦業政策與政局變數",
    location: "西非",
    region: "africa",
    layer: "conflict",
    severity: "medium",
    confidence: 69,
    updatedAgo: "示範事件",
    x: 48,
    y: 52,
    summary: "礦權、出口管制與安全風險可能干擾黃金、鈾與電池材料供應。",
    marketImpact: "貴金屬、能源安全與原物料類股出現避險溢價。",
    stockFocus: ["GC=F", "URA", "RIO", "BHP"],
    sources: ["區域新聞", "商品價格", "政策公告"]
  },
  {
    id: "chile-copper-strike",
    title: "銅礦勞資談判牽動 AI 電力鏈",
    location: "智利北部",
    region: "latam",
    layer: "supply",
    severity: "medium",
    confidence: 73,
    updatedAgo: "示範事件",
    x: 32,
    y: 68,
    summary: "銅供應彈性下降會影響電網、資料中心與工業設備成本預期。",
    marketImpact: "銅價、電線電纜、電力設備與資料中心資本支出受關注。",
    stockFocus: ["HG=F", "FCX", "1605.TW", "2308.TW"],
    sources: ["商品交易", "礦業消息", "企業公告"]
  },
  {
    id: "cloud-service-outage",
    title: "雲端服務中斷監測",
    location: "美國西岸",
    region: "americas",
    layer: "cyber",
    severity: "watch",
    confidence: 64,
    updatedAgo: "示範事件",
    x: 18,
    y: 42,
    summary: "部分網路服務出現異常回報，需確認是否擴散到金融與電商交易。",
    marketImpact: "雲端、資安、支付與大型平台股短線情緒受影響。",
    stockFocus: ["MSFT", "AMZN", "NET", "CRWD"],
    sources: ["網路監測", "服務狀態頁", "社群回報"]
  },
  {
    id: "india-weather-logistics",
    title: "印度強降雨干擾物流與農產品",
    location: "印度西岸",
    region: "asia",
    layer: "disaster",
    severity: "medium",
    confidence: 77,
    updatedAgo: "示範事件",
    x: 67,
    y: 51,
    summary: "港口、鐵路與農產品出貨受天候拖累，區域食品價格需追蹤。",
    marketImpact: "農產品、保險、港口物流與新興市場通膨預期受牽動。",
    stockFocus: ["DBA", "INDA", "MAERSK-B.CO", "2615.TW"],
    sources: ["氣象警報", "港口資料", "商品價格"]
  },
  {
    id: "australia-lithium",
    title: "澳洲鋰礦供給與電池鏈去庫存",
    location: "西澳",
    region: "oceania",
    layer: "supply",
    severity: "watch",
    confidence: 68,
    updatedAgo: "示範事件",
    x: 79,
    y: 69,
    summary: "鋰價低檔與產能調整使電池材料股估值進入重估區。",
    marketImpact: "電池材料、EV 供應鏈與儲能題材需看庫存週期是否見底。",
    stockFocus: ["ALB", "LIT", "2308.TW", "3661.TW"],
    sources: ["礦商公告", "商品價格", "EV 銷售"]
  }
];

export const fallbackQuotes: MonitorQuote[] = [
  { symbol: "^TWII", label: "台股加權", price: "24,128.6", changePct: 0.42, source: "備援樣本" },
  { symbol: "^SOX", label: "費半", price: "5,214.9", changePct: -0.38, source: "備援樣本" },
  { symbol: "^IXIC", label: "Nasdaq", price: "18,922.4", changePct: 0.21, source: "備援樣本" },
  { symbol: "^VIX", label: "VIX", price: "17.8", changePct: 4.85, source: "備援樣本" },
  { symbol: "CL=F", label: "原油", price: "78.42", changePct: 1.14, source: "備援樣本" },
  { symbol: "GC=F", label: "黃金", price: "2,438.1", changePct: 0.56, source: "備援樣本" }
];

export const monitorSources = [
  { name: "市場報價", coverage: "指數、期貨、商品、匯率", status: "API 有回應即更新", reliability: 88 },
  { name: "公開新聞", coverage: "地緣、政策、企業事件", status: "待串接即時來源", reliability: 76 },
  { name: "供應鏈訊號", coverage: "航運、港口、能源、原物料", status: "目前為示範規則", reliability: 72 },
  { name: "網路狀態", coverage: "雲端、資安、服務中斷", status: "目前為示範規則", reliability: 69 }
];
