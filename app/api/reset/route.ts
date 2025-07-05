import { NextResponse } from "next/server";
import { resetPassword } from "@/lib/db";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const { token, password } = await request.json();
  try {
    await resetPassword(token, password);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, message: e.message }, { status: 400 });
  }
}
