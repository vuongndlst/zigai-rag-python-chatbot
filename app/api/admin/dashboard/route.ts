import { NextResponse, NextRequest } from 'next/server';
import { requireAdmin } from '@/lib/requireAdmin';
import { dbConnect } from '@/lib/mongodb';
import User from '@/models/User';
import { Chat } from '@/lib/chatModel';
import { CacheHit } from '@/models/CacheHit';

export const dynamic = 'force-dynamic';

// Ước tính số token trung bình cho một truy vấn không có cache
const AVG_TOKENS_PER_RAG_QUERY = 2500; 

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

    // --- Tính toán các chỉ số KPI ---
    const totalUsers = await User.countDocuments();
    const newUsers = await User.countDocuments({ createdAt: { $gte: startDate } });
    const totalChats = await Chat.countDocuments();
    const newChats = await Chat.countDocuments({ createdAt: { $gte: startDate } });
    const totalCacheHits = await CacheHit.countDocuments();
    const newCacheHits = await CacheHit.countDocuments({ createdAt: { $gte: startDate } });

    // Tính tổng token đã sử dụng
    const tokenUsageAggregation = await Chat.aggregate([
        { $unwind: "$messages" },
        { $match: { "messages.role": "assistant", "messages.tokenUsage": { $exists: true } } },
        { $group: { 
            _id: null, 
            totalPrompt: { $sum: "$messages.tokenUsage.prompt_tokens" },
            totalCompletion: { $sum: "$messages.tokenUsage.completion_tokens" }
        }}
    ]);
    const totalTokensUsed = (tokenUsageAggregation[0]?.totalPrompt || 0) + (tokenUsageAggregation[0]?.totalCompletion || 0);

    // Ước tính token tiết kiệm được
    const tokensSaved = totalCacheHits * AVG_TOKENS_PER_RAG_QUERY;

    // --- Lấy dữ liệu cho biểu đồ ---
    const userActivity = await User.aggregate([
        { $match: { createdAt: { $gte: startDate } } },
        { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
        { $project: { _id: 0, date: "$_id", "Người dùng mới": "$count" } }
    ]);

    const chatActivity = await Chat.aggregate([
        { $match: { createdAt: { $gte: startDate } } },
        { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
        { $project: { _id: 0, date: "$_id", "Đoạn chat mới": "$count" } }
    ]);

    return NextResponse.json({
        kpis: {
            totalUsers, newUsers,
            totalChats, newChats,
            totalTokensUsed,
            totalCacheHits, tokensSaved
        },
        charts: {
            userActivity,
            chatActivity
        }
    });

  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
