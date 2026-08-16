export type ArchitectureQuery = {
  address: string;
  parcel: string;
  plannedHeightM: number | null;
  city: string;
  useType: string;
};

export type SourceStatus = {
  id: string;
  name: string;
  agency: string;
  url: string;
  ok: boolean;
  statusCode?: number;
  message: string;
  checkedAt: string;
};

export type RequiredApiCheck = {
  id: string;
  name: string;
  code: string;
  purpose: string;
  sourceUrl: string;
  requiresApplication: boolean;
  availableInOfficialList: boolean;
  status: "connected" | "requires_authorization" | "missing" | "not_checked";
  note: string;
};

export type LawLink = {
  id: string;
  title: string;
  agency: string;
  category: string;
  url: string;
  reason: string;
};

export type RiskItem = {
  id: string;
  title: string;
  level: "blocked" | "danger" | "warning" | "info" | "ok";
  status: string;
  detail: string;
  nextAction: string;
};

export type ArchitectureRadarResult = {
  updatedAt: string;
  query: ArchitectureQuery;
  verdict: {
    label: string;
    tone: "danger" | "warning" | "info" | "ok";
    summary: string;
    blockers: string[];
    nextActions: string[];
  };
  sourceStatuses: SourceStatus[];
  requiredApiChecks: RequiredApiCheck[];
  lawLinks: LawLink[];
  riskMatrix: RiskItem[];
  references: { label: string; url: string; note: string }[];
};

export const OFFICIAL_URLS = {
  mojHome: "https://law.moj.gov.tw/Index.aspx",
  mojApiOrder: "https://law.moj.gov.tw/api/ch/order/json",
  nlscApiList: "https://maps.nlsc.gov.tw/S09SOA/pro/Api_ajax_list.jsp",
  nlscServiceInfo: "https://maps.nlsc.gov.tw/pro/sysinfo.jsp",
  motcAviationHeightLaw: "https://law.moj.gov.tw/LawClass/LawAll.aspx?pcode=K0090016",
  caaLawFiles: "https://www.caa.gov.tw/ContentAndMorefiles.aspx?a=1309&lang=1"
} as const;

export const REQUIRED_NLSC_APIS = [
  {
    id: "cad-009",
    name: "指定門牌查詢地號",
    code: "CAD_009 / AddressQueryLand",
    purpose: "把地址轉成可查核的正式地號。",
    sourceUrl: OFFICIAL_URLS.nlscApiList
  },
  {
    id: "cad-010",
    name: "指定範圍查詢地號清單",
    code: "CAD_010 / CadasLandNoQuery",
    purpose: "補查基地周邊地號與鄰地風險。",
    sourceUrl: OFFICIAL_URLS.nlscApiList
  },
  {
    id: "map-001",
    name: "指定地號查詢地籍圖",
    code: "MAP_001 / CadasMapQuery",
    purpose: "取得地籍圖位置，才能疊合飛航限高與都市計畫圖資。",
    sourceUrl: OFFICIAL_URLS.nlscApiList
  }
] as const;

function lawSearchUrl(keyword: string) {
  return `https://law.moj.gov.tw/Law/LawSearchResult.aspx?ty=ONEBAR&kw=${encodeURIComponent(keyword)}`;
}

export const ARCHITECTURE_LAW_LINKS: LawLink[] = [
  {
    id: "building-act",
    title: "建築法",
    agency: "法務部全國法規資料庫",
    category: "建築許可與管理",
    url: lawSearchUrl("建築法"),
    reason: "確認建築執照、施工管理、使用執照與違建風險。"
  },
  {
    id: "building-technical-rules",
    title: "建築技術規則",
    agency: "法務部全國法規資料庫",
    category: "建築設計施工",
    url: lawSearchUrl("建築技術規則 建築設計施工編"),
    reason: "檢核建蔽率、容積、日照、停車、避難與高度相關設計條件。"
  },
  {
    id: "urban-planning-act",
    title: "都市計畫法",
    agency: "法務部全國法規資料庫",
    category: "土地使用管制",
    url: lawSearchUrl("都市計畫法"),
    reason: "確認使用分區、公共設施保留地與都市計畫限制。"
  },
  {
    id: "aviation-height-rule",
    title: "航空站飛行場助航設備四周禁止限制建築物及其他障礙物高度管理辦法",
    agency: "交通部 / 法務部",
    category: "飛航限高",
    url: OFFICIAL_URLS.motcAviationHeightLaw,
    reason: "判斷基地是否落入航空站、飛行場或助航設備禁止/限制建築範圍。"
  },
  {
    id: "regional-planning-act",
    title: "區域計畫法",
    agency: "法務部全國法規資料庫",
    category: "非都市土地",
    url: lawSearchUrl("區域計畫法"),
    reason: "非都市土地或特定農業區需檢查使用地編定與開發許可。"
  }
];

export function buildRiskMatrix(query: ArchitectureQuery, apiChecks: RequiredApiCheck[]): RiskItem[] {
  const hasAddress = query.address.trim().length > 0;
  const hasParcel = query.parcel.trim().length > 0;
  const hasHeight = typeof query.plannedHeightM === "number" && Number.isFinite(query.plannedHeightM);
  const hasCadastralAuthorization = apiChecks.every((item) => item.status === "connected");

  return [
    {
      id: "address-to-parcel",
      title: "地址轉地號",
      level: hasCadastralAuthorization && hasAddress ? "ok" : "blocked",
      status: hasCadastralAuthorization && hasAddress ? "可正式查核" : "尚未排除風險",
      detail: hasAddress
        ? "已取得地址輸入，但 NLSC 門牌轉地號 API 需要正式授權後才能自動驗證。"
        : "尚未輸入地址，無法定位基地與地號。",
      nextAction: hasCadastralAuthorization ? "送出正式查詢並保存回傳地號。" : "申請 NLSC CAD_009 授權。"
    },
    {
      id: "cadastral-map",
      title: "地籍圖與基地邊界",
      level: hasCadastralAuthorization && hasParcel ? "ok" : "blocked",
      status: hasCadastralAuthorization && hasParcel ? "可疊合圖資" : "禁止假判斷",
      detail: hasParcel
        ? "已提供地號，但地籍圖 API 未授權前不能用人工猜測邊界。"
        : "尚無正式地號，無法取得地籍圖與基地邊界。",
      nextAction: hasCadastralAuthorization ? "查詢 MAP_001 並疊合管制圖層。" : "申請 NLSC MAP_001 / CAD_010 授權。"
    },
    {
      id: "aviation-height",
      title: "飛航限高",
      level: hasHeight && (hasAddress || hasParcel) ? "warning" : "blocked",
      status: hasHeight ? "需官方圖資疊合" : "缺少預估高度",
      detail: hasHeight
        ? `預估高度 ${query.plannedHeightM} 公尺已可作為檢核條件，但仍需基地坐標、跑道/助航設備範圍與官方公告圖資才能判斷。`
        : "飛航限高必須同時有基地位置與建物高度，否則不能判斷安全。",
      nextAction: "取得正式地號與坐標後，比對交通部/民航局禁限建範圍與附圖。"
    },
    {
      id: "law-version",
      title: "法規版本",
      level: "info",
      status: "已連官方來源",
      detail: "法規文字以全國法規資料庫與主管機關公布版本為準；系統只做查核輔助。",
      nextAction: "送件前由建築師或主管機關複核最新條文與公告。"
    }
  ];
}

export function buildVerdict(riskMatrix: RiskItem[]) {
  const blockers = riskMatrix.filter((item) => item.level === "blocked");
  const warnings = riskMatrix.filter((item) => item.level === "warning" || item.level === "danger");

  if (blockers.length > 0) {
    return {
      label: "尚未排除風險",
      tone: "danger" as const,
      summary: "目前不能判斷可建、可蓋多高或飛航限高安全，因為地號/地籍圖授權或必要輸入仍不足。",
      blockers: blockers.map((item) => item.title),
      nextActions: [
        "先申請 NLSC 地籍 API 授權，取得地址轉地號與地籍圖。",
        "輸入完整地址、地號與預估建築高度。",
        "由建築師或主管機關用官方圖資複核後再做投資或送件決策。"
      ]
    };
  }

  if (warnings.length > 0) {
    return {
      label: "需人工複核",
      tone: "warning" as const,
      summary: "資料已可進入下一步，但飛航限高與都市計畫仍需要正式圖資疊合與主管機關確認。",
      blockers: [],
      nextActions: ["疊合禁限建圖資。", "輸出查核報告給建築師複核。"]
    };
  }

  return {
    label: "可進入送件前複核",
    tone: "ok" as const,
    summary: "必要資料已具備，但系統仍不會取代建築師簽證與主管機關審查。",
    blockers: [],
    nextActions: ["保存查核紀錄。", "送交專業人員複核。"]
  };
}
