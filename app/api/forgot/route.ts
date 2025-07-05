import { NextResponse } from "next/server";
import { createResetToken } from "@/lib/db";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const { email } = await request.json();
  try {
    const token = await createResetToken(email);
    const resetUrl = \`\${process.env.NEXTAUTH_URL}/reset?token=\${token}\`;
    console.log("Password reset link:", resetUrl);
    // TODO: send email with resetUrl
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, message: e.message }, { status: 400 });
  }
}
