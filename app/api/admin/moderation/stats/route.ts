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
    let startDate = new Date();
    let endDate = new Date();

    // Cài đặt ngày bắt đầu và kết thúc dựa trên bộ lọc
    switch (period) {
        case 'today':
            startDate.setHours(0, 0, 0, 0);
            endDate.setHours(23, 59, 59, 999);
            break;
        case 'yesterday':
            startDate.setDate(startDate.getDate() - 1);
            startDate.setHours(0, 0, 0, 0);
            endDate.setDate(endDate.getDate() - 1);
            endDate.setHours(23, 59, 59, 999);
            break;
        case '30d':
            startDate.setDate(startDate.getDate() - 30);
            startDate.setHours(0, 0, 0, 0);
            break;
        case '90d':
            startDate.setDate(startDate.getDate() - 90);
            startDate.setHours(0, 0, 0, 0);
            break;
        default: // 7d
            startDate.setDate(startDate.getDate() - 7);
            startDate.setHours(0, 0, 0, 0);
            break;
    }

    const stats = await ModerationItem.aggregate([
      {
        $match: {
          updatedAt: { $gte: startDate, $lte: endDate },
          status: { $in: ['approved', 'rejected'] }
        }
      },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: "%Y-%m-%d", date: "$updatedAt" } },
            status: "$status"
          },
          count: { $sum: 1 }
        }
      },
      {
        $group: {
          _id: "$_id.date",
          approved: { $sum: { $cond: [{ $eq: ["$_id.status", "approved"] }, "$count", 0] } },
          rejected: { $sum: { $cond: [{ $eq: ["$_id.status", "rejected"] }, "$count", 0] } }
        }
      },
      { $sort: { _id: 1 } },
      { $project: { _id: 0, date: "$_id", approved: 1, rejected: 1 } }
    ]);

    return NextResponse.json(stats);

  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
