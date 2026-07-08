import { NextResponse } from "next/server";
import { z } from "zod";
import { runRealFullAnalysis } from "@/lib/real-analysis-engine";

const bodySchema = z.object({ symbol: z.string().min(1) });

export async function POST(request: Request) {
  try {
    const body = bodySchema.parse(await request.json());
    return NextResponse.json(await runRealFullAnalysis(body.symbol));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "真實資料分析失敗" }, { status: 502 });
  }
}
