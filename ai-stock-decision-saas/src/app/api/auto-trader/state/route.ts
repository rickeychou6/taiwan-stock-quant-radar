import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

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

export async function GET() {
  const rawUrl = `https://raw.githubusercontent.com/${STATE_REPO}/${STATE_BRANCH}/${STATE_FILE}`;

  try {
    const response = await fetch(`${rawUrl}?ts=${Date.now()}`, {
      cache: "no-store",
      headers: {
        "User-Agent": "ai-stock-decision-saas"
      }
    });

    if (!response.ok) {
      return NextResponse.json({
        state: emptyState(),
        source: "not_started",
        message: "雲端自動交易紀錄尚未建立，等待 GitHub Actions 第一次排程執行。"
      });
    }

    const state = await response.json();
    return NextResponse.json({
      state,
      source: "github-actions",
      stateUrl: rawUrl,
      message: "已讀取 GitHub Actions 雲端自動交易紀錄。"
    });
  } catch (error) {
    return NextResponse.json(
      {
        state: emptyState(),
        source: "error",
        message: error instanceof Error ? error.message : "雲端自動交易紀錄讀取失敗"
      },
      { status: 502 }
    );
  }
}
