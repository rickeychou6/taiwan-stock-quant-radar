import { NextResponse } from "next/server";
import { watchlistSeed } from "@/lib/mock-data";

export async function GET() {
  return NextResponse.json(watchlistSeed);
}

export async function POST(request: Request) {
  const body = await request.json();
  return NextResponse.json({ id: crypto.randomUUID(), ...body }, { status: 201 });
}
