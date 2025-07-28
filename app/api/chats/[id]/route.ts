import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getChatById, updateChatTitle, deleteChat } from '@/lib/chatService';
import { dbConnect } from '@/lib/mongodb';

// Bắt buộc có để Next.js xử lý route này một cách động
export const dynamic = 'force-dynamic';

/**
 * Lấy chi tiết một cuộc trò chuyện
 */
export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();
    const chat = await getChatById(params.id, session.user.id);

    if (!chat) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    return NextResponse.json({ chat });

  } catch (err: any) {
    console.error(`GET /api/chats/${params.id} error`, err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * Cập nhật tiêu đề cuộc trò chuyện
 */
export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  console.log(`[API] Nhận yêu cầu PUT để cập nhật tiêu đề cho chat ID: ${params.id}`);
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { title } = await req.json();
    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    const result = await updateChatTitle(params.id, session.user.id, title.trim());

    if (result.modifiedCount === 0) {
      console.warn(`[API] Không tìm thấy hoặc không có gì thay đổi cho chat ID: ${params.id}`);
      return NextResponse.json({ error: 'Chat not found or no changes were made' }, { status: 404 });
    }
    
    console.log(`[API] ✅ Cập nhật tiêu đề thành công cho chat ID: ${params.id}`);
    return NextResponse.json({ message: 'Updated successfully' });
  } catch (err: any) {
    console.error(`PUT /api/chats/${params.id} error`, err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * Xóa một cuộc trò chuyện
 */
export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  console.log(`[API] Nhận yêu cầu DELETE cho chat ID: ${params.id}`);
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const result = await deleteChat(params.id, session.user.id);

    if (result.deletedCount === 0) {
      console.warn(`[API] Không tìm thấy chat để xóa với ID: ${params.id}`);
      return NextResponse.json({ error: 'Chat not found' }, { status: 404 });
    }

    console.log(`[API] ✅ Xóa thành công chat ID: ${params.id}`);
    return NextResponse.json({ message: 'Deleted successfully' });
  } catch (err: any) {
    console.error(`DELETE /api/chats/${params.id} error`, err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
