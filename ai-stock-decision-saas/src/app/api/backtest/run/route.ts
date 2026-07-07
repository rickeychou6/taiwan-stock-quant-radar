import { NextResponse } from "next/server";
import { z } from "zod";
import { runFullAnalysis } from "@/lib/analysis-engine";

const bodySchema = z.object({ symbol: z.string().min(1), strategy: z.string().optional() });

export async function POST(request: Request) {
  const body = bodySchema.parse(await request.json());
  const result = runFullAnalysis(body.symbol);
  return NextResponse.json({ strategy: body.strategy ?? "multi-factor-default", ...result.backtest });
}
