// Vị trí file: app/api/admin/seed-logs/route.ts

import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/requireAdmin';
import { dbConnect } from '@/lib/mongodb';
import SeedLog from '@/models/SeedLog';
import mongoose from 'mongoose';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        await requireAdmin();
        await dbConnect();

        // Sử dụng aggregation để kết hợp thông tin từ SeedLog và Source
        const logs = await SeedLog.aggregate([
            // Sắp xếp các log mới nhất lên đầu
            { $sort: { createdAt: -1 } },
            // Kết hợp (join) với collection 'sources' để lấy tên file
            {
                $lookup: {
                    from: 'sources', // Tên collection của model Source
                    localField: 'sourceId',
                    foreignField: '_id',
                    as: 'sourceInfo'
                }
            },
            // Chuyển mảng sourceInfo (chỉ có 1 phần tử) thành object
            {
                $unwind: {
                    path: "$sourceInfo",
                    preserveNullAndEmptyArrays: true // Giữ lại log ngay cả khi source đã bị xóa
                }
            },
            // Định dạng lại các trường để trả về cho client
            {
                $project: {
                    _id: 1,
                    createdAt: 1,
                    status: { $cond: ["$success", "Thành công", "Thất bại"] },
                    chunkCount: 1,
                    durationMs: 1,
                    error: 1,
                    filename: "$sourceInfo.originalName"
                }
            }
        ]);

        return NextResponse.json(logs);

    } catch (e: any) {
        console.error("Lỗi khi lấy lịch sử xử lý:", e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
