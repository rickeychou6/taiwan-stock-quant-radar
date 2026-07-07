import { NextResponse } from "next/server";
import { searchStocks } from "@/lib/mock-data";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  return NextResponse.json(searchStocks(searchParams.get("q") || ""));
}
