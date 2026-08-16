import { NextResponse } from "next/server";
import {
  ARCHITECTURE_LAW_LINKS,
  OFFICIAL_URLS,
  REQUIRED_NLSC_APIS,
  buildRiskMatrix,
  buildVerdict,
  type ArchitectureQuery,
  type RequiredApiCheck,
  type SourceStatus
} from "@/lib/architecture-regulation";

export const dynamic = "force-dynamic";

const USER_AGENT =
  "Mozilla/5.0 (compatible; AI-Stock-Decision-SaaS/1.0; +https://ai-stock-decision-saas.vercel.app)";

function nowIso() {
  return new Date().toISOString();
}

function cleanText(value: string | null) {
  return (value || "").replace(/\s+/g, " ").trim();
}

function parseHeight(value: string | null) {
  if (!value) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

function normalizeQuery(searchParams: URLSearchParams): ArchitectureQuery {
  return {
    address: cleanText(searchParams.get("address")),
    parcel: cleanText(searchParams.get("parcel")),
    plannedHeightM: parseHeight(searchParams.get("height")),
    city: cleanText(searchParams.get("city")) || "未指定",
    useType: cleanText(searchParams.get("useType")) || "住宅/商業待確認"
  };
}

async function fetchText(url: string, timeoutMs = 6000) {
  const response = await fetch(url, {
    cache: "no-store",
    headers: { "User-Agent": USER_AGENT },
    signal: AbortSignal.timeout(timeoutMs)
  });
  const text = await response.text();
  return { response, text };
}

async function probeSource(input: {
  id: string;
  name: string;
  agency: string;
  url: string;
  expected?: string;
}): Promise<SourceStatus> {
  const checkedAt = nowIso();
  try {
    const response = await fetch(input.url, {
      method: "GET",
      cache: "no-store",
      headers: {
        "User-Agent": USER_AGENT,
        Range: "bytes=0-4096"
      },
      signal: AbortSignal.timeout(6500)
    });

    await response.body?.cancel();
    const contentType = response.headers.get("content-type") || "unknown";
    const contentLength = response.headers.get("content-length");
    const sizeNote = contentLength ? `，大小約 ${Number(contentLength).toLocaleString("zh-TW")} bytes` : "";
    const ok = response.ok;

    return {
      id: input.id,
      name: input.name,
      agency: input.agency,
      url: input.url,
      ok,
      statusCode: response.status,
      checkedAt,
      message: ok
        ? `官方網站可連線，回應 ${response.status}，格式 ${contentType}${sizeNote}。`
        : `官方網站回應 ${response.status}，請稍後重試或人工開啟來源。`
    };
  } catch (error) {
    return {
      id: input.id,
      name: input.name,
      agency: input.agency,
      url: input.url,
      ok: false,
      checkedAt,
      message: error instanceof Error ? `連線失敗：${error.message}` : "連線失敗。"
    };
  }
}

async function buildNlscApiChecks(): Promise<RequiredApiCheck[]> {
  let apiListText = "";
  try {
    const { text } = await fetchText(OFFICIAL_URLS.nlscApiList);
    apiListText = text;
  } catch {
    apiListText = "";
  }

  const hasNlscCredential =
    Boolean(process.env.NLSC_API_KEY || process.env.NLSC_TOKEN || process.env.NLSC_CLIENT_ID) &&
    Boolean(process.env.NLSC_API_BASE || process.env.NLSC_ENDPOINT);

  return REQUIRED_NLSC_APIS.map((api) => {
    const [primaryCode, apiCode] = api.code.split("/").map((part) => part.trim());
    const availableInOfficialList =
      apiListText.includes(primaryCode) || (apiCode ? apiListText.includes(apiCode) : false);

    return {
      ...api,
      requiresApplication: true,
      availableInOfficialList,
      status: hasNlscCredential ? "connected" : availableInOfficialList ? "requires_authorization" : "not_checked",
      note: hasNlscCredential
        ? "已偵測到 NLSC 授權設定，可接續實作正式參數呼叫。"
        : availableInOfficialList
          ? "官方 API 清單可查到此項目，但頁面標示 Image 者需申請後才能使用；目前尚未設定授權。"
          : "暫時無法從官方 API 清單確認，不能用猜測結果替代。"
    } satisfies RequiredApiCheck;
  });
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const query = normalizeQuery(url.searchParams);

  const [nlscApiChecks, sourceStatuses] = await Promise.all([
    buildNlscApiChecks(),
    Promise.all([
      probeSource({
        id: "moj-law-api",
        name: "全國法規資料庫 API",
        agency: "法務部",
        url: OFFICIAL_URLS.mojApiOrder
      }),
      probeSource({
        id: "moj-law-site",
        name: "全國法規資料庫",
        agency: "法務部",
        url: OFFICIAL_URLS.mojHome
      }),
      probeSource({
        id: "nlsc-api-list",
        name: "國土測繪中心 API 清單",
        agency: "內政部國土測繪中心",
        url: OFFICIAL_URLS.nlscApiList
      }),
      probeSource({
        id: "nlsc-map-service",
        name: "國土測繪圖資服務雲",
        agency: "內政部國土測繪中心",
        url: OFFICIAL_URLS.nlscServiceInfo
      }),
      probeSource({
        id: "motc-aviation-height",
        name: "飛航限高法規資訊",
        agency: "交通部",
        url: OFFICIAL_URLS.motcAviationHeightLaw
      }),
      probeSource({
        id: "caa-law-files",
        name: "民航局法規彙編附件",
        agency: "交通部民用航空局",
        url: OFFICIAL_URLS.caaLawFiles
      })
    ])
  ]);

  const riskMatrix = buildRiskMatrix(query, nlscApiChecks);
  const verdict = buildVerdict(riskMatrix);

  return NextResponse.json({
    updatedAt: nowIso(),
    query,
    verdict,
    sourceStatuses,
    requiredApiChecks: nlscApiChecks,
    lawLinks: ARCHITECTURE_LAW_LINKS,
    riskMatrix,
    references: [
      {
        label: "法規資料以主管機關公布文字為準",
        url: OFFICIAL_URLS.mojHome,
        note: "全國法規資料庫聲明其資料供檢索，若與主管機關公布文字不同，以主管機關公布資料為準。"
      },
      {
        label: "地籍 API 需依官方清單申請",
        url: OFFICIAL_URLS.nlscApiList,
        note: "NLSC API 清單標示 Image 的服務需申請後使用，本系統未授權前不產生假地號或假地籍圖。"
      },
      {
        label: "飛航限高需搭配公告附圖",
        url: OFFICIAL_URLS.motcAviationHeightLaw,
        note: "飛航禁限建判斷必須使用基地坐標、跑道/助航設備範圍與主管機關公告圖資。"
      }
    ]
  });
}
