import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/requireAdmin';
import { dbConnect } from '@/lib/mongodb';
import { ModerationItem } from '@/models/ModerationItem';

export async function POST(req: Request) {
  try {
    await requireAdmin();
    await dbConnect();

    const { mainItemId, similarItemIds } = await req.json();

    if (!mainItemId || !Array.isArray(similarItemIds) || similarItemIds.length === 0) {
      return NextResponse.json({ error: "ID của mục chính và danh sách các mục tương đồng là bắt buộc." }, { status: 400 });
    }

    // Giữ lại mục chính và xóa các mục tương tự
    const deleteResult = await ModerationItem.deleteMany({
      _id: { $in: similarItemIds }
    });

    if (deleteResult.deletedCount === 0) {
        return NextResponse.json({ message: "Không có mục nào được gộp, có thể chúng đã bị xóa trước đó." }, { status: 200 });
    }

    return NextResponse.json({ message: `Đã gộp thành công ${deleteResult.deletedCount} mục.` });

  } catch (e: any) {
    console.error("Lỗi khi gộp Knowledge Base:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
