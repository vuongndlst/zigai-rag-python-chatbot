import { NextResponse, NextRequest } from 'next/server';
import { requireAdmin } from '@/lib/requireAdmin';
import { dbConnect } from '@/lib/mongodb';
import { ModerationItem } from '@/models/ModerationItem';

// SỬA LỖI: Đảm bảo sử dụng NextRequest để cung cấp kiểu dữ liệu chính xác cho App Router,
// khắc phục lỗi "invalid 'GET' export" trong quá trình build.
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
    try {
        await requireAdmin();
        await dbConnect();

        const sourceItem = await ModerationItem.findById(params.id).lean();

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
