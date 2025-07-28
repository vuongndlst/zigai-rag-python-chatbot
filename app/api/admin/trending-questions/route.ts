import { NextResponse, NextRequest } from 'next/server';
import { requireAdmin } from '@/lib/requireAdmin';
import { dbConnect } from '@/lib/mongodb';
import { UserQuery } from '@/models/UserQuery';

export const dynamic = 'force-dynamic';
const SIMILARITY_THRESHOLD = 0.9; // Ngưỡng để gom nhóm

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();
    await dbConnect();

    const period = req.nextUrl.searchParams.get('period') || '7d';
    let days;
    switch (period) {
        case '30d': days = 30; break;
        case '90d': days = 90; break;
        default: days = 7;
    }
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    console.log(`[Trending API] Bắt đầu phân tích cho ${days} ngày qua...`);

    const allQueries = await UserQuery.find({ 
        createdAt: { $gte: startDate },
        promptEmbedding: { $exists: true, $ne: null } 
    });

    console.log(`[Trending API] Tìm thấy ${allQueries.length} câu hỏi để xử lý.`);

    const processedIds = new Set();
    const groups = [];

    for (const query of allQueries) {
        const queryIdString = query._id.toString();
        if (processedIds.has(queryIdString)) continue;

        // Bỏ qua nếu câu hỏi không có embedding
        if (!query.promptEmbedding || query.promptEmbedding.length === 0) {
            console.log(`   - ⚠️ Bỏ qua câu hỏi "${query.prompt}" vì không có embedding.`);
            continue;
        }

        console.log(`\n[Trending API] Đang tìm các câu hỏi tương tự cho: "${query.prompt}"`);

        const similarQueries = await UserQuery.aggregate([
            {
                "$vectorSearch": {
                    "index": "user_query_embedding_index",
                    "path": "promptEmbedding",
                    "queryVector": query.promptEmbedding,
                    "numCandidates": 150,
                    "limit": 50
                }
            },
            {
                "$project": { 
                    _id: 1, 
                    prompt: 1, 
                    score: { "$meta": "vectorSearchScore" } 
                }
            }
        ]);
        
        // Log kết quả thô từ vector search
        console.log(`   - Vector Search trả về ${similarQueries.length} kết quả.`);
        if (similarQueries.length > 0) {
            console.log(`     -> Điểm cao nhất: ${(similarQueries[0].score * 100).toFixed(1)}% cho câu hỏi: "${similarQueries[0].prompt}"`);
        }

        // Lọc lại theo ngưỡng tương đồng
        const filteredSimilarQueries = similarQueries.filter(q => q.score > SIMILARITY_THRESHOLD);
        
        console.log(`   - Sau khi lọc (ngưỡng > ${SIMILARITY_THRESHOLD}), còn lại ${filteredSimilarQueries.length} kết quả.`);
        
        if (filteredSimilarQueries.length > 1) {
            groups.push({
                mainPrompt: query.prompt,
                count: filteredSimilarQueries.length,
                variants: filteredSimilarQueries.map(q => ({ prompt: q.prompt, score: q.score }))
            });
            // Đánh dấu tất cả các câu hỏi trong nhóm là đã xử lý
            filteredSimilarQueries.forEach(q => processedIds.add(q._id.toString()));
            console.log(`   - ✅ Đã tạo nhóm với ${filteredSimilarQueries.length} thành viên.`);
        } else {
            // Đánh dấu câu hỏi này là đã xử lý để không lặp lại
            processedIds.add(queryIdString);
        }
    }

    groups.sort((a, b) => b.count - a.count);
    console.log(`\n[Trending API] Hoàn tất! Đã gom thành công ${groups.length} nhóm câu hỏi tương đồng.`);
    
    return NextResponse.json(groups);

  } catch (e: any) {
    console.error("[Trending API] Lỗi:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
