import { NextResponse } from "next/server";

type Context = { params: Promise<{ id: string }> };

export async function DELETE(_request: Request, context: Context) {
  const params = await context.params;
  return NextResponse.json({ ok: true, deletedId: params.id });
}
