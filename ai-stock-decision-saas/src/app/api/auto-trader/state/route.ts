import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

const INITIAL_CAPITAL = 100_000;
const STATE_REPO = process.env.AUTO_TRADER_STATE_REPO || "rickeychou6/taiwan-stock-quant-radar";
const STATE_BRANCH = process.env.AUTO_TRADER_STATE_BRANCH || "auto-trader-state";
const STATE_FILE = process.env.AUTO_TRADER_STATE_FILE || "auto-trader/state.json";
const STATE_WRITE_TOKEN = process.env.AUTO_TRADER_STATE_TOKEN || process.env.GITHUB_STATE_TOKEN || process.env.GITHUB_TOKEN;
const ADMIN_KEY = process.env.AUTO_TRADER_ADMIN_KEY || "";

type AutoTraderSettings = {
  dayTradingEnabled: boolean;
  updatedAt: string;
  updatedBy: string;
};

type AutoTraderState = {
  initialCapital: number;
  cash: number;
  realizedPnl: number;
  positions: unknown[];
  trades: unknown[];
  decisions: unknown[];
  equity: unknown[];
  settings: AutoTraderSettings;
  lastRunAt: string;
};

function emptyState(): AutoTraderState {
  return {
    initialCapital: INITIAL_CAPITAL,
    cash: INITIAL_CAPITAL,
    realizedPnl: 0,
    positions: [],
    trades: [],
    decisions: [],
    equity: [],
    settings: {
      dayTradingEnabled: true,
      updatedAt: "",
      updatedBy: "system-default"
    },
    lastRunAt: ""
  };
}

function normalizeState(state: Partial<AutoTraderState> | null | undefined): AutoTraderState {
  const base = emptyState();
  return {
    ...base,
    ...(state || {}),
    positions: Array.isArray(state?.positions) ? state.positions : [],
    trades: Array.isArray(state?.trades) ? state.trades : [],
    decisions: Array.isArray(state?.decisions) ? state.decisions : [],
    equity: Array.isArray(state?.equity) ? state.equity : [],
    settings: {
      ...base.settings,
      ...(state?.settings || {}),
      dayTradingEnabled: state?.settings?.dayTradingEnabled ?? true
    }
  };
}

function encodedStatePath() {
  return STATE_FILE.split("/").map(encodeURIComponent).join("/");
}

function authHeaders(token?: string) {
  return {
    Accept: "application/vnd.github+json",
    "Cache-Control": "no-cache",
    "User-Agent": "ai-stock-decision-saas",
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };
}

async function fetchStateFromContentsApi(token?: string) {
  const apiUrl = `https://api.github.com/repos/${STATE_REPO}/contents/${encodedStatePath()}?ref=${encodeURIComponent(STATE_BRANCH)}`;
  const response = await fetch(apiUrl, {
    cache: "no-store",
    headers: authHeaders(token)
  });

  if (!response.ok) {
    throw new Error(`GitHub contents API returned ${response.status}`);
  }

  const payload = await response.json();
  if (!payload?.content || payload.encoding !== "base64") {
    throw new Error("GitHub state file response is not base64 content");
  }

  const content = Buffer.from(String(payload.content).replace(/\s/g, ""), "base64").toString("utf8");
  return {
    state: normalizeState(JSON.parse(content)),
    sha: String(payload.sha || "")
  };
}

async function fetchStateFromRaw() {
  const rawUrl = `https://raw.githubusercontent.com/${STATE_REPO}/${STATE_BRANCH}/${STATE_FILE}`;
  const response = await fetch(`${rawUrl}?ts=${Date.now()}`, {
    cache: "no-store",
    headers: {
      "Cache-Control": "no-cache",
      "User-Agent": "ai-stock-decision-saas"
    }
  });

  if (!response.ok) {
    throw new Error(`GitHub raw state returned ${response.status}`);
  }

  return normalizeState(await response.json());
}

function verifyAdminKey(request: Request) {
  if (!ADMIN_KEY) return true;
  return request.headers.get("x-auto-trader-admin-key") === ADMIN_KEY;
}

async function saveStateToGitHub(state: AutoTraderState, sha: string) {
  if (!STATE_WRITE_TOKEN) {
    throw new Error("AUTO_TRADER_STATE_TOKEN is not configured on the hosting environment.");
  }
  if (!sha) {
    throw new Error("Missing GitHub state file sha.");
  }

  const content = Buffer.from(`${JSON.stringify(state, null, 2)}\n`, "utf8").toString("base64");
  const response = await fetch(`https://api.github.com/repos/${STATE_REPO}/contents/${encodedStatePath()}`, {
    method: "PUT",
    cache: "no-store",
    headers: authHeaders(STATE_WRITE_TOKEN),
    body: JSON.stringify({
      message: `chore(auto-trader): ${state.settings.dayTradingEnabled ? "enable" : "disable"} day trading`,
      content,
      branch: STATE_BRANCH,
      sha
    })
  });

  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload?.message || `GitHub state update returned ${response.status}`);
  }
  return payload;
}

export async function GET() {
  try {
    const { state } = await fetchStateFromContentsApi();
    return NextResponse.json({
      state,
      source: "github-actions",
      fetchMode: "contents-api",
      canWriteSettings: Boolean(STATE_WRITE_TOKEN),
      fetchedAt: new Date().toISOString(),
      message: "Loaded latest AI paper trading state."
    });
  } catch (contentsError) {
    try {
      const state = await fetchStateFromRaw();
      return NextResponse.json({
        state,
        source: "github-actions",
        fetchMode: "raw-fallback",
        canWriteSettings: Boolean(STATE_WRITE_TOKEN),
        fetchedAt: new Date().toISOString(),
        message: "Loaded AI paper trading state from raw fallback."
      });
    } catch (rawError) {
      return NextResponse.json(
        {
          state: emptyState(),
          source: "error",
          fetchMode: "failed",
          canWriteSettings: Boolean(STATE_WRITE_TOKEN),
          fetchedAt: new Date().toISOString(),
          message:
            contentsError instanceof Error
              ? contentsError.message
              : rawError instanceof Error
                ? rawError.message
                : "Unable to load AI paper trading state."
        },
        { status: 502 }
      );
    }
  }
}

export async function PATCH(request: Request) {
  if (!verifyAdminKey(request)) {
    return NextResponse.json({ error: "Unauthorized auto-trader setting update." }, { status: 401 });
  }

  try {
    const body = await request.json();
    const dayTradingEnabled = body?.settings?.dayTradingEnabled;
    if (typeof dayTradingEnabled !== "boolean") {
      return NextResponse.json({ error: "settings.dayTradingEnabled must be boolean." }, { status: 400 });
    }

    const { state, sha } = await fetchStateFromContentsApi(STATE_WRITE_TOKEN);
    const nextState = normalizeState({
      ...state,
      settings: {
        ...state.settings,
        dayTradingEnabled,
        updatedAt: new Date().toISOString(),
        updatedBy: "web-switch"
      }
    });

    await saveStateToGitHub(nextState, sha);

    return NextResponse.json({
      state: nextState,
      source: "github-actions",
      fetchMode: "contents-api",
      canWriteSettings: Boolean(STATE_WRITE_TOKEN),
      fetchedAt: new Date().toISOString(),
      message: dayTradingEnabled ? "當沖開關已開啟，背景機器人可同日賣出。" : "當沖開關已關閉，當日買進持股會保留到下一個交易日再評估出場。"
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unable to update auto-trader settings."
      },
      { status: 502 }
    );
  }
}
