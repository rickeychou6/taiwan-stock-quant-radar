import { NextResponse } from "next/server";
import { getStockProfile } from "@/lib/real-data";

type Context = { params: Promise<{ symbol: string }> };

export async function GET(_request: Request, context: Context) {
  try {
    const params = await context.params;
    return NextResponse.json(await getStockProfile(decodeURIComponent(params.symbol)));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "真實股票資料取得失敗" }, { status: 502 });
  }
}
