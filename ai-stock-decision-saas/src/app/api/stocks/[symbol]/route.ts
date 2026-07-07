import { NextResponse } from "next/server";
import { getStock } from "@/lib/mock-data";

type Context = { params: Promise<{ symbol: string }> };

export async function GET(_request: Request, context: Context) {
  const params = await context.params;
  return NextResponse.json(getStock(decodeURIComponent(params.symbol)));
}
