import { NextResponse, NextRequest } from 'next/server';
import { requireAdmin } from '@/lib/requireAdmin';
import { dbConnect } from '@/lib/mongodb';
import { HallucinationTestResult } from '@/models/HallucinationTestResult';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    try {
        await requireAdmin();
        await dbConnect();

        const batchId = req.nextUrl.searchParams.get('batchId');

        // Nếu có batchId, trả về chi tiết của lần chạy đó
        if (batchId) {
            const results = await HallucinationTestResult.find({ batchId }).sort({ createdAt: 1 }).lean();
            return NextResponse.json(results);
        }

        // NÂNG CẤP: Cập nhật pipeline để tính toán tất cả các chỉ số cần thiết
        const batchSummary = await HallucinationTestResult.aggregate([
            // 1. Gom nhóm theo batchId và tính toán các giá trị cơ bản
            {
                $group: {
                    _id: "$batchId",
                    totalTests: { $sum: 1 },
                    hallucinations: {
                        $sum: { $cond: [{ $eq: ["$isHallucination", "YES"] }, 1, 0] }
                    },
                    avgFaithfulness: { $avg: "$faithfulnessScore" },
                    avgRelevance: { $avg: "$relevanceScore" },
                    avgAnswerSimilarity: { $avg: "$answerSimilarity" }, // Tính Answer Similarity
                    avgLatency: { $avg: "$latencyMs" }, // Tính Latency
                    createdAt: { $first: "$createdAt" },
                    // Tính True Positives (TP), False Positives (FP), False Negatives (FN)
                    truePositives: {
                        $sum: { $cond: [{ $and: [{ $ne: ["$groundTruthAnswer", "Refusal"] }, { $eq: ["$isHallucination", "NO"] }] }, 1, 0] }
                    },
                    falsePositives: {
                        $sum: { $cond: [{ $and: [{ $ne: ["$groundTruthAnswer", "Refusal"] }, { $eq: ["$isHallucination", "YES"] }] }, 1, 0] }
                    },
                    falseNegatives: {
                        $sum: { $cond: [{ $and: [{ $eq: ["$groundTruthAnswer", "Refusal"] }, { $eq: ["$isHallucination", "YES"] }] }, 1, 0] }
                    }
                }
            },
            // 2. Sắp xếp theo ngày chạy gần nhất
            { $sort: { createdAt: -1 } },
            // 3. Định dạng lại kết quả và tính toán các chỉ số phức tạp hơn
            {
                $project: {
                    _id: 0,
                    batchId: "$_id",
                    totalTests: 1,
                    hallucinations: 1,
                    avgFaithfulness: 1,
                    avgRelevance: 1,
                    avgAnswerSimilarity: 1,
                    avgLatency: 1,
                    createdAt: 1,
                    hallucinationRate: {
                        $cond: [{ $eq: ["$totalTests", 0] }, 0, { $multiply: [{ $divide: ["$hallucinations", "$totalTests"] }, 100] }]
                    },
                    // Tính Precision, Recall, và F1-Score
                    precision: {
                        $cond: [{ $eq: [{ $add: ["$truePositives", "$falsePositives"] }, 0] }, 0, { $divide: ["$truePositives", { $add: ["$truePositives", "$falsePositives"] }] }]
                    },
                    recall: {
                        $cond: [{ $eq: [{ $add: ["$truePositives", "$falseNegatives"] }, 0] }, 0, { $divide: ["$truePositives", { $add: ["$truePositives", "$falseNegatives"] }] }]
                    }
                }
            },
            {
                $project: {
                    _id: 0,
                    batchId: 1,
                    totalTests: 1,
                    hallucinations: 1,
                    avgFaithfulness: 1,
                    avgRelevance: 1,
                    avgAnswerSimilarity: 1,
                    avgLatency: 1,
                    createdAt: 1,
                    hallucinationRate: 1,
                    f1Score: {
                        $cond: [{ $eq: [{ $add: ["$precision", "$recall"] }, 0] }, 0, { $divide: [{ $multiply: [2, "$precision", "$recall"] }, { $add: ["$precision", "$recall"] }] }]
                    }
                }
            }
        ]);

        return NextResponse.json(batchSummary);

    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
