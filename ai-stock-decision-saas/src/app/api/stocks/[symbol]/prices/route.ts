import { NextResponse } from "next/server";
import { downloadPriceBars, resolveStock } from "@/lib/real-data";

type Context = { params: Promise<{ symbol: string }> };

export async function GET(_request: Request, context: Context) {
  try {
    const params = await context.params;
    const stock = await resolveStock(decodeURIComponent(params.symbol));
    return NextResponse.json(await downloadPriceBars(stock.symbol));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "真實價格資料取得失敗" }, { status: 502 });
  }
}
