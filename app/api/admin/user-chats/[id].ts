import { NextApiRequest, NextApiResponse } from "next";
import { dbConnect } from "@/lib/mongodb";
// Sử dụng named import thay vì default import để khớp với cách export của model
import { Chat } from "@/models/Chat";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    await dbConnect();

    const {
        query: { id },
        method,
    } = req;

    if (method === "GET") {
        try {
            // Tìm tất cả các cuộc trò chuyện của một người dùng cụ thể và sắp xếp theo ngày tạo mới nhất
            const chats = await Chat.find({ userId: id }).sort({ createdAt: -1 });
            res.status(200).json(chats);
        } catch (error) {
            console.error("Lỗi khi tải lịch sử trò chuyện:", error);
            res.status(500).json({ error: "Không thể tải lịch sử trò chuyện." });
        }
    } else {
        // Nếu phương thức không phải là GET, trả về lỗi "Method Not Allowed"
        res.setHeader("Allow", ["GET"]);
        res.status(405).end(`Method ${method} Not Allowed`);
    }
}
