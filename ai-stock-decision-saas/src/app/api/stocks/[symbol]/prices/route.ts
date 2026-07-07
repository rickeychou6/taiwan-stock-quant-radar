import { NextResponse } from "next/server";
import { generatePrices, getStock } from "@/lib/mock-data";

type Context = { params: Promise<{ symbol: string }> };

export async function GET(_request: Request, context: Context) {
  const params = await context.params;
  const stock = getStock(decodeURIComponent(params.symbol));
  return NextResponse.json(generatePrices(stock.symbol));
}
