import { NextResponse } from "next/server";
import { marketSnapshot } from "@/lib/real-data";

export async function GET() {
  try {
    return NextResponse.json(await marketSnapshot());
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "真實市場資料取得失敗" }, { status: 502 });
  }
}
