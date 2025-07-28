import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/requireAdmin"; // Giả định bạn có hàm này
import { dbConnect } from "@/lib/mongodb";
import User from "@/models/User"; // Giả định bạn có model User
import { Chat } from "@/lib/chatModel";

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    // Xác thực quyền admin
    await requireAdmin();
    await dbConnect();

    const userId = params.id;

    // Tìm thông tin người dùng
    const user = await User.findById(userId).lean();
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Tìm tất cả các đoạn chat của người dùng đó
    const chats = await Chat.find({ userId }).sort({ createdAt: -1 }).lean();

    // Tính toán tổng số token đã sử dụng
    let totalPromptTokens = 0;
    let totalCompletionTokens = 0;

    chats.forEach(chat => {
      chat.messages.forEach((message: any) => {
        if (message.role === 'assistant' && message.tokenUsage) {
          totalPromptTokens += message.tokenUsage.prompt_tokens || 0;
          totalCompletionTokens += message.tokenUsage.completion_tokens || 0;
        }
      });
    });

    const totalTokens = totalPromptTokens + totalCompletionTokens;

    // Trả về dữ liệu tổng hợp
    return NextResponse.json({
      user,
      chats,
      tokenStats: {
        totalPromptTokens,
        totalCompletionTokens,
        totalTokens,
      }
    });

  } catch (e: any) {
    console.error(`GET /api/admin/users/${params.id} error:`, e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
