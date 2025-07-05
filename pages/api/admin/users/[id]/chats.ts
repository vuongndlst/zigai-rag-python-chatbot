import type { NextApiRequest, NextApiResponse } from 'next';
import { dbConnect } from '@/lib/mongodb';
import { Chat } from '@/models/Chat';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  await dbConnect();

  const {
    query: { id },
    method,
  } = req;

  if (method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const chats = await Chat.find({ userId: id }).sort({ createdAt: -1 });
    res.status(200).json(chats);
  } catch (error) {
    console.error('Chat fetch error:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
}
