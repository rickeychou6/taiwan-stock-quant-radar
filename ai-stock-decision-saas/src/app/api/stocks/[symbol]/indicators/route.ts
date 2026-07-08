import { NextResponse } from "next/server";
import { runRealFullAnalysis } from "@/lib/real-analysis-engine";

type Context = { params: Promise<{ symbol: string }> };

export async function GET(_request: Request, context: Context) {
  try {
    const params = await context.params;
    const result = await runRealFullAnalysis(decodeURIComponent(params.symbol));
    return NextResponse.json(result.scores);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "真實指標資料取得失敗" }, { status: 502 });
  }
}
