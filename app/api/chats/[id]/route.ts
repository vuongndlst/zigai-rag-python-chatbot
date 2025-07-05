import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getChatById } from "@/lib/chatService";

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  /* 1. Auth */
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  /* 2. Lấy id ra biến sync */
  const id = params.id;

  /* 3. Truy vấn Mongo */
  const chat = await getChatById(id, session.user.id);
  if (!chat) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ chat });
}
