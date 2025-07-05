import { NextApiRequest, NextApiResponse } from 'next';
import { dbConnect, User } from '@/lib/mongodb';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  await dbConnect();

  const { id } = req.query;

  try {
    const user = await User.findById(id).lean();

    if (!user) return res.status(404).json({ error: 'User not found' });

    res.status(200).json({
      _id: user._id,
      username: user.username,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      createdAt: user.createdAt,
      loginHistory: user.loginHistory || [], // nếu có
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
}
