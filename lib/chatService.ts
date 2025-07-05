// lib/chatService.ts
import { Types } from "mongoose";
import { dbConnect } from "@/lib/mongodb";
import { Chat } from "@/lib/chatModel";

type Role = "user" | "assistant";

/* Tạo đoạn chat mới */
export async function createChat(userId: string) {
  await dbConnect();
  return Chat.create({ userId });
}

/* Thêm tin nhắn vào đoạn chat */
export async function appendMessage(
  chatId: string,
  userId: string,
  role: Role,
  content: string
) {
  await dbConnect();
  return Chat.updateOne(
    { _id: new Types.ObjectId(chatId), userId },
    { $push: { messages: { role, content } } }
  );
}

/* Danh sách chat (metadata) của user */
export async function getUserChats(userId: string) {
  await dbConnect();
  return Chat.find({ userId })
    .select("title createdAt")
    .sort({ createdAt: -1 })
    .lean();
}

/* Lấy toàn bộ nội dung 1 chat */
export async function getChatById(chatId: string, userId: string) {
  await dbConnect();
  return Chat.findOne({ _id: new Types.ObjectId(chatId), userId }).lean();
}

/* Đổi tiêu đề chat */
export async function updateChatTitle(
  chatId: string,
  userId: string,
  title: string
) {
  await dbConnect();
  return Chat.updateOne(
    { _id: new Types.ObjectId(chatId), userId },
    { title }
  );
}

/* Xoá chat */
export async function deleteChat(chatId: string, userId: string) {
  await dbConnect();
  return Chat.deleteOne({ _id: new Types.ObjectId(chatId), userId });
}
