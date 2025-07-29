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
            const results = await HallucinationTestResult.find({ batchId }).sort({ createdAt: -1 }).lean();
            return NextResponse.json(results);
        }

        // Nếu không, trả về danh sách tóm tắt của tất cả các lần chạy
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
                    createdAt: { $first: "$createdAt" },
                    // NÂNG CẤP: Gom tất cả các giá trị 'conclusion' vào một mảng
                    conclusions: { $push: "$conclusion" }
                }
            },
            // 2. Sắp xếp theo ngày chạy gần nhất
            { $sort: { createdAt: -1 } },
            // 3. Định dạng lại kết quả
            {
                $project: {
                    _id: 0,
                    batchId: "$_id",
                    totalTests: 1,
                    hallucinations: 1,
                    avgFaithfulness: 1,
                    avgRelevance: 1,
                    createdAt: 1,
                    hallucinationRate: {
                        $cond: [{ $eq: ["$totalTests", 0] }, 0, { $multiply: [{ $divide: ["$hallucinations", "$totalTests"] }, 100] }]
                    },
                    // NÂNG CẤP: Lọc mảng conclusions để chỉ lấy giá trị duy nhất (không phải null)
                    conclusion: {
                        $let: {
                            vars: {
                                filteredConclusions: {
                                    $filter: {
                                        input: "$conclusions",
                                        as: "c",
                                        cond: { $ne: ["$$c", null] }
                                    }
                                }
                            },
                            in: { $arrayElemAt: ["$$filteredConclusions", 0] }
                        }
                    }
                }
            }
        ]);

        return NextResponse.json(batchSummary);

    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
