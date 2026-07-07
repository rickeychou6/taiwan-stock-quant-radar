import { NextResponse } from "next/server";
import { mockNews } from "@/lib/mock-data";

export async function GET() {
  return NextResponse.json(mockNews);
}
