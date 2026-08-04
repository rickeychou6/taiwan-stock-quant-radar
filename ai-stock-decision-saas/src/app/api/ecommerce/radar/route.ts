import { NextResponse } from "next/server";
import { runEcommerceRadar } from "@/lib/ecommerce-radar";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const keywords = searchParams.get("keywords");
  const perKeywordLimit = Number(searchParams.get("perKeywordLimit") || 8);

  try {
    const report = await runEcommerceRadar({ keywords, perKeywordLimit });
    return NextResponse.json(report, {
      headers: {
        "Cache-Control": "no-store"
      }
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "電商雷達讀取失敗",
        updatedAt: new Date().toISOString()
      },
      { status: 502 }
    );
  }
}

