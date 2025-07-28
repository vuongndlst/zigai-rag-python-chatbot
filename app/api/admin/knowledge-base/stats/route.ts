import { NextResponse, NextRequest } from 'next/server';
import { requireAdmin } from '@/lib/requireAdmin';
import { dbConnect } from '@/lib/mongodb';
import { ModerationItem } from '@/models/ModerationItem';

export const dynamic = 'force-dynamic';

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
    const totalApproved = await ModerationItem.countDocuments({ status: 'approved' });
    const newApproved = await ModerationItem.countDocuments({ 
        status: 'approved',
        updatedAt: { $gte: startDate } 
    });

    // --- Lấy dữ liệu cho biểu đồ ---
    const newItemsByDate = await ModerationItem.aggregate([
      {
        $match: {
          status: 'approved',
          updatedAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$updatedAt" } },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } },
      { $project: { _id: 0, date: "$_id", "Mục mới": "$count" } }
    ]);

    return NextResponse.json({
        kpis: {
            totalApproved,
            newApproved,
        },
        chartData: newItemsByDate
    });

  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
