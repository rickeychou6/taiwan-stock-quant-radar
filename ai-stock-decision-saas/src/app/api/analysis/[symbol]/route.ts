import { NextResponse } from "next/server";
import { runFullAnalysis } from "@/lib/analysis-engine";

type Context = { params: Promise<{ symbol: string }> };

export async function GET(_request: Request, context: Context) {
  const params = await context.params;
  return NextResponse.json(runFullAnalysis(decodeURIComponent(params.symbol)));
}
