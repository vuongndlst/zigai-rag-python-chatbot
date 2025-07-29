import { NextResponse, NextRequest } from 'next/server';
import { requireAdmin } from '@/lib/requireAdmin';
import { dbConnect } from '@/lib/mongodb';
import { ModerationItem } from '@/models/ModerationItem';

// SỬA LỖI: Đơn giản hóa kiểu dữ liệu của tham số thứ hai để khắc phục lỗi build
// trên các nền tảng như Vercel/Netlify.
export async function GET(req: NextRequest, context: { params: { id: string } }) {
    try {
        await requireAdmin();
        await dbConnect();

        // Lấy id từ context.params
        const { id } = context.params;

        const sourceItem = await ModerationItem.findById(id).lean();

        if (!sourceItem || !sourceItem.promptEmbedding) {
            return NextResponse.json({ error: "Source item or its embedding not found." }, { status: 404 });
        }

        const similarItems = await ModerationItem.aggregate([
            {
                "$vectorSearch": {
                    "index": "prompt_embedding_index", // Tên Vector Search Index của bạn
                    "path": "promptEmbedding",
                    "queryVector": sourceItem.promptEmbedding,
                    "numCandidates": 10,
                    "limit": 5
                }
            },
            {
                "$match": {
                    "status": "approved",
                    "_id": { "$ne": sourceItem._id }
                }
            },
            {
                "$project": {
                    "_id": 1,
                    "prompt": 1,
                    "response": 1,
                    "score": { "$meta": "vectorSearchScore" }
                }
            }
        ]);

        return NextResponse.json(similarItems);

    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
