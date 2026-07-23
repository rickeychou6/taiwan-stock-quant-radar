import { NextResponse } from "next/server";
import { runStockRecommendations } from "@/lib/recommendation-engine";
import { loadWholeMarketRecommendationUniverse } from "@/lib/real-data";
import {
  RADAR_LABELS,
  STOCK_FUTURES_CODES,
  staticRadarSymbols,
  stockCode,
  type RadarMode,
  uniqueSymbols
} from "@/lib/special-radars";

export const dynamic = "force-dynamic";

const RADAR_MODES = new Set<RadarMode>(["next-jump", "tw50", "non-futures", "photo", "low-price"]);

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const symbols = searchParams.get("symbols")?.split(",").map((symbol) => decodeURIComponent(symbol.trim()));
    const scanLimit = Number(searchParams.get("scanLimit") || 30);
    const outputLimit = Number(searchParams.get("limit") || 18);
    const modeParam = searchParams.get("mode") as RadarMode | null;
    const mode = modeParam && RADAR_MODES.has(modeParam) ? modeParam : null;

    let targetSymbols = symbols?.filter(Boolean);

    if (!targetSymbols?.length && (mode === "tw50" || mode === "photo")) {
      targetSymbols = staticRadarSymbols(mode);
    }

    if (!targetSymbols?.length && (mode === "low-price" || mode === "non-futures")) {
      try {
        const universe = await loadWholeMarketRecommendationUniverse(Math.max(scanLimit * 4, 120));
        const filtered = universe.candidates
          .filter((item) => {
            if (mode === "low-price") return item.price > 0 && item.price < 100;
            return !STOCK_FUTURES_CODES.has(stockCode(item.symbol));
          })
          .map((item) => item.symbol);
        targetSymbols = uniqueSymbols([...filtered, ...staticRadarSymbols(mode)]);
      } catch {
        targetSymbols = staticRadarSymbols(mode);
      }
    }

    const report = await runStockRecommendations({
      symbols: targetSymbols,
      scanLimit,
      outputLimit,
      concurrency: 4
    });

    if (mode === "next-jump") {
      report.recommendations = report.recommendations.sort(
        (a, b) =>
          b.probabilityUp3To5 - a.probabilityUp3To5 ||
          b.forecastDay5Pct - a.forecastDay5Pct ||
          b.rankScore - a.rankScore
      );
      report.source = `${report.source}，${RADAR_LABELS[mode].title}`;
    } else if (mode) {
      report.source = `${RADAR_LABELS[mode].source}，${RADAR_LABELS[mode].title}`;
    }

    return NextResponse.json({ ...report, mode });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "推薦清單產生失敗" },
      { status: 502 }
    );
  }
}
