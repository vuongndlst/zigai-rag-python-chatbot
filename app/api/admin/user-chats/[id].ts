import { NextApiRequest, NextApiResponse } from "next";
import { dbConnect } from "@/lib/mongodb";
import Chat from "@/models/Chat";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  await dbConnect();

  const {
    query: { id },
    method,
  } = req;

  if (method === "GET") {
    try {
      const chats = await Chat.find({ userId: id }).sort({ createdAt: -1 });
      res.status(200).json(chats);
    } catch (error) {
      res.status(500).json({ error: "Failed to load chat history." });
    }
  } else {
    res.setHeader("Allow", ["GET"]);
    res.status(405).end(`Method ${method} Not Allowed`);
  }
}
