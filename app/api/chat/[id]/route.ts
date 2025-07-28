import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getChatById, updateChatTitle, deleteChat } from '@/lib/chatService';

// Các dòng này rất quan trọng để ngăn lỗi 405 Method Not Allowed
export const dynamic = 'force-dynamic';
export const revalidate = 0;

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

    const chat = await getChatById(params.id, session.user.id);

    if (!chat) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    return NextResponse.json({ chat });

  } catch (err) {
    console.error(`GET /api/chats/${params.id} error`, err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * Cập nhật tiêu đề cuộc trò chuyện (Logic đầy đủ)
 */
export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  console.log(`--- TRIGGERED: PUT /api/chats/${params.id} ---`);
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
      console.log(`PUT /api/chats/${params.id}: No document was modified.`);
      return NextResponse.json({ error: 'Chat not found or no changes were made' }, { status: 404 });
    }
    
    console.log(`PUT /api/chats/${params.id}: Successfully updated.`);
    return NextResponse.json({ message: 'Updated successfully' });
  } catch (err) {
    console.error(`PUT /api/chats/${params.id} error`, err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * Xóa một cuộc trò chuyện (Logic đầy đủ)
 */
export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  console.log(`--- TRIGGERED: DELETE /api/chats/${params.id} ---`);
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const result = await deleteChat(params.id, session.user.id);

    if (result.deletedCount === 0) {
      console.log(`DELETE /api/chats/${params.id}: No document was deleted.`);
      return NextResponse.json({ error: 'Chat not found' }, { status: 404 });
    }

    console.log(`DELETE /api/chats/${params.id}: Successfully deleted.`);
    return NextResponse.json({ message: 'Deleted successfully' });
  } catch (err)
  {
    console.error(`DELETE /api/chats/${params.id} error`, err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
