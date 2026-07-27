import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

const INITIAL_CAPITAL = 100_000;
const STATE_REPO = process.env.AUTO_TRADER_STATE_REPO || "rickeychou6/taiwan-stock-quant-radar";
const STATE_BRANCH = process.env.AUTO_TRADER_STATE_BRANCH || "auto-trader-state";
const STATE_FILE = process.env.AUTO_TRADER_STATE_FILE || "auto-trader/state.json";

function emptyState() {
  return {
    initialCapital: INITIAL_CAPITAL,
    cash: INITIAL_CAPITAL,
    realizedPnl: 0,
    positions: [],
    trades: [],
    decisions: [],
    equity: [],
    lastRunAt: ""
  };
}

async function fetchStateFromContentsApi() {
  const apiUrl = `https://api.github.com/repos/${STATE_REPO}/contents/${STATE_FILE}?ref=${STATE_BRANCH}`;
  const response = await fetch(apiUrl, {
    cache: "no-store",
    headers: {
      Accept: "application/vnd.github+json",
      "Cache-Control": "no-cache",
      "User-Agent": "ai-stock-decision-saas"
    }
  });

  if (!response.ok) {
    throw new Error(`GitHub contents API returned ${response.status}`);
  }

  const payload = await response.json();
  if (!payload?.content || payload.encoding !== "base64") {
    throw new Error("GitHub state file response is not base64 content");
  }

  const content = Buffer.from(String(payload.content).replace(/\s/g, ""), "base64").toString("utf8");
  return JSON.parse(content);
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

  return response.json();
}

export async function GET() {
  try {
    const state = await fetchStateFromContentsApi();
    return NextResponse.json({
      state,
      source: "github-actions",
      fetchMode: "contents-api",
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
        fetchedAt: new Date().toISOString(),
        message: "Loaded AI paper trading state from raw fallback."
      });
    } catch (rawError) {
      return NextResponse.json(
        {
          state: emptyState(),
          source: "error",
          fetchMode: "failed",
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
