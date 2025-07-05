import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createChat, getUserChats } from "@/lib/chatService"; // ⬅ đổi tên

/* GET /api/chats – lấy danh sách đoạn chat của user */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const chats = await getUserChats(session.user.id); // ⬅ gọi hàm đúng tên
  return NextResponse.json(chats);
}

/* POST /api/chats – tạo đoạn chat mới, trả về _id */
export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const chat = await createChat(session.user.id);
  return NextResponse.json(chat);
}
