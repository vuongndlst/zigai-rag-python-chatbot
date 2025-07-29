import { NextResponse, NextRequest } from "next/server";
import { requireAdmin } from "@/lib/requireAdmin";
import { dbConnect } from "@/lib/mongodb";
import User from "@/models/User";
import { Chat } from "@/models/Chat"; 
import { IMessage } from "@/models/Chat";

// SỬA LỖI: Sử dụng chữ ký hàm chính xác và đầy đủ nhất cho Next.js App Router
// Bằng cách nhận toàn bộ context và destructure bên trong, chúng ta giúp trình biên dịch
// xác định kiểu dữ liệu một cách chính xác hơn.
export async function GET(request: NextRequest, context: { params: { id: string } }) {
    try {
        // Xác thực quyền admin
        await requireAdmin();
        await dbConnect();

        // Lấy userId từ context.params
        const { id: userId } = context.params;

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
            chat.messages.forEach((message: IMessage & { tokenUsage?: { prompt_tokens?: number, completion_tokens?: number } }) => {
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
        console.error(`GET /api/admin/users/${context.params.id} error:`, e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
