import { NextResponse } from "next/server";
import { z } from "zod";
import { runFullAnalysis } from "@/lib/analysis-engine";

const bodySchema = z.object({ symbol: z.string().min(1) });

export async function POST(request: Request) {
  const body = bodySchema.parse(await request.json());
  return NextResponse.json(runFullAnalysis(body.symbol));
}
