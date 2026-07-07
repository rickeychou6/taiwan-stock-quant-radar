import { NextResponse } from "next/server";
import { mockMacro } from "@/lib/mock-data";

export async function GET() {
  return NextResponse.json(mockMacro);
}
