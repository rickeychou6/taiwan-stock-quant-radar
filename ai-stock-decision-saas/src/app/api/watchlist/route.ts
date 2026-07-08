import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json([]);
}

export async function POST(request: Request) {
  const body = await request.json();
  return NextResponse.json({ id: crypto.randomUUID(), ...body }, { status: 201 });
}
