import { NextResponse } from "next/server";
import { getStockNews, resolveStock } from "@/lib/real-data";

type Context = { params: Promise<{ symbol: string }> };

export async function GET(_request: Request, context: Context) {
  try {
    const params = await context.params;
    const stock = await resolveStock(decodeURIComponent(params.symbol));
    return NextResponse.json(await getStockNews(stock));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "真實新聞資料取得失敗" }, { status: 502 });
  }
}
