import { NextResponse } from "next/server";
import { yahooSearchStocks } from "@/lib/real-data";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    return NextResponse.json(await yahooSearchStocks(searchParams.get("q") || ""));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "真實搜尋資料取得失敗" }, { status: 502 });
  }
}
