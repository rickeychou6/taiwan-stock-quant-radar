import { NextResponse } from "next/server";
import { portfolioSeed } from "@/lib/mock-data";

export async function GET() {
  return NextResponse.json(portfolioSeed);
}

export async function POST(request: Request) {
  const body = await request.json();
  return NextResponse.json({ id: crypto.randomUUID(), ...body }, { status: 201 });
}
