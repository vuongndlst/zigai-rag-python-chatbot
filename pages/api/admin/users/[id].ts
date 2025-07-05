// pages/api/admin/users/[id].ts
import { NextApiRequest, NextApiResponse } from 'next';
import { dbConnect } from '@/lib/mongodb';
import User from '@/models/User';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  await dbConnect();
  const { id } = req.query;

  try {
    const user = await User.findById(id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.status(200).json(user);
  } catch (err) {
    console.error('Failed to get user:', err);
    res.status(500).json({ error: 'Failed to get user' });
  }
}
