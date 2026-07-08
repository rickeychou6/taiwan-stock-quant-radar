import { NextResponse } from "next/server";
import { marketOverviewQuotes } from "@/lib/real-data";

export async function GET() {
  try {
    return NextResponse.json(await marketOverviewQuotes());
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "真實市場資料取得失敗" }, { status: 502 });
  }
}
