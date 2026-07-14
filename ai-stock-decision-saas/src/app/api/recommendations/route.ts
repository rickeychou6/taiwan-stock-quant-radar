import { NextResponse } from "next/server";
import { runStockRecommendations } from "@/lib/recommendation-engine";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const symbols = searchParams.get("symbols")?.split(",").map((symbol) => decodeURIComponent(symbol.trim()));
    const scanLimit = Number(searchParams.get("scanLimit") || 10);
    const outputLimit = Number(searchParams.get("limit") || 10);

    const report = await runStockRecommendations({
      symbols,
      scanLimit,
      outputLimit,
      concurrency: 4
    });

    return NextResponse.json(report);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "推薦清單產生失敗" },
      { status: 502 }
    );
  }
}
