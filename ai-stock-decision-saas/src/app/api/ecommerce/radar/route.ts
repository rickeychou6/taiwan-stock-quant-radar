import { NextResponse } from "next/server";
import { runEcommerceRadar } from "@/lib/ecommerce-radar";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const keywords = searchParams.get("keywords");
  const perKeywordLimit = Number(searchParams.get("perKeywordLimit") || 8);
  const platformFeeRate = Number(searchParams.get("platformFeeRate") || 0.08);
  const paymentFeeRate = Number(searchParams.get("paymentFeeRate") || 0.02);
  const shippingCost = Number(searchParams.get("shippingCost") || 60);
  const adRate = Number(searchParams.get("adRate") || 0.06);
  const returnReserveRate = Number(searchParams.get("returnReserveRate") || 0.03);
  const includeExternalSources = searchParams.get("includeExternalSources") !== "0";

  try {
    const report = await runEcommerceRadar({
      keywords,
      perKeywordLimit,
      includeExternalSources,
      costSettings: {
        platformFeeRate,
        paymentFeeRate,
        shippingCost,
        adRate,
        returnReserveRate
      }
    });
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
