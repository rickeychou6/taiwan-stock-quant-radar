import { NextResponse } from "next/server";
import { z } from "zod";
import { runRealFullAnalysis } from "@/lib/real-analysis-engine";

const bodySchema = z.object({ symbol: z.string().min(1), strategy: z.string().optional() });

export async function POST(request: Request) {
  try {
    const body = bodySchema.parse(await request.json());
    const result = await runRealFullAnalysis(body.symbol);
    return NextResponse.json({ strategy: body.strategy ?? "multi-factor-default", ...result.backtest });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "真實回測資料取得失敗" }, { status: 502 });
  }
}
