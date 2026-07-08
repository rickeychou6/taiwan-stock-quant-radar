import { NextResponse } from "next/server";
import { runRealFullAnalysis } from "@/lib/real-analysis-engine";

type Context = { params: Promise<{ symbol: string }> };

export async function GET(_request: Request, context: Context) {
  try {
    const params = await context.params;
    return NextResponse.json(await runRealFullAnalysis(decodeURIComponent(params.symbol)));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "真實資料分析失敗" }, { status: 502 });
  }
}
