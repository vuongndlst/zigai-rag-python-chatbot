// pages/api/admin/user-chats/[id].ts
import { NextApiRequest, NextApiResponse } from "next";
import { dbConnect } from "@/lib/mongodb";
import Chat from "@/models/Chat";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  await dbConnect();
  const { id } = req.query;

  try {
    const chats = await Chat.find({ userId: id }).sort({ createdAt: -1 });
    res.status(200).json(chats);
  } catch (error) {
    console.error("Failed to fetch chats:", error);
    res.status(500).json({ error: "Failed to fetch user chats." });
  }
}
