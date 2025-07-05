import { NextApiRequest, NextApiResponse } from 'next';
import { dbConnect, User } from '@/lib/mongodb';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  await dbConnect();

  const total = await User.countDocuments();
  const active = await User.countDocuments({ isActive: true });
  const admins = await User.countDocuments({ role: 'admin' });

  const users = await User.find().select('createdAt').lean();

  const last30Days = Array.from({ length: 30 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (29 - i));
    const key = date.toISOString().slice(0, 10);
    return { date: key, count: 0 };
  });

  const dateMap = Object.fromEntries(last30Days.map(d => [d.date, 0]));

  for (const u of users) {
    if (!u.createdAt) continue;
    const d = new Date(u.createdAt).toISOString().slice(0, 10);
    if (d in dateMap) dateMap[d]++;
  }

  const userChartData = Object.entries(dateMap).map(([date, count]) => ({ date, count }));

  res.status(200).json({ total, active, admins, userChartData });
}
