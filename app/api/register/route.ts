import { NextResponse } from "next/server";
import { createUser } from "@/lib/db";

export async function POST(request: Request) {
  const { username, email, password } = await request.json();
  try {
    await createUser(username, email, password);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, message: e.message }, { status: 400 });
  }
}
