import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/requireAdmin';
import { dbConnect } from '@/lib/mongodb';
import { ModerationItem } from '@/models/ModerationItem';

export const dynamic = 'force-dynamic';

// Ngưỡng tương đồng để coi là một nhóm
const SIMILARITY_THRESHOLD = 0.92; 

export async function GET() {
  try {
    await requireAdmin();
    await dbConnect();

    // Lấy tất cả các mục đã duyệt và có embedding
    const allItems = await ModerationItem.find({ 
      status: 'approved', 
      promptEmbedding: { $exists: true } 
    }).lean();

    const processedIds = new Set();
    const groups = [];

    for (const item of allItems) {
      if (processedIds.has(item._id.toString())) {
        continue;
      }

      // Tìm các mục tương tự với mục hiện tại
      const similarItems = await ModerationItem.aggregate([
        {
          "$vectorSearch": {
            "index": "prompt_embedding_index",
            "path": "promptEmbedding",
            "queryVector": item.promptEmbedding,
            "numCandidates": 15,
            "limit": 15
          }
        },
        {
          "$match": {
            "status": "approved",
            "_id": { "$ne": item._id } // Loại bỏ chính nó
          }
        },
        {
          "$project": {
            prompt: 1,
            score: { "$meta": "vectorSearchScore" }
          }
        }
      ]);

      // Lọc các mục có điểm số cao hơn ngưỡng
      const highSimilarityGroup = similarItems.filter(sim => sim.score > SIMILARITY_THRESHOLD);

      if (highSimilarityGroup.length > 0) {
        const group = {
          mainItem: item,
          similarItems: highSimilarityGroup,
        };
        groups.push(group);

        // Đánh dấu tất cả các mục trong nhóm là đã xử lý
        processedIds.add(item._id.toString());
        highSimilarityGroup.forEach(sim => processedIds.add(sim._id.toString()));
      }
    }
    
    // Sắp xếp các nhóm theo số lượng mục tương đồng giảm dần
    groups.sort((a, b) => b.similarItems.length - a.similarItems.length);

    return NextResponse.json(groups);

  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
