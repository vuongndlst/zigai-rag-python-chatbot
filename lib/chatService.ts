import { Types } from "mongoose";
import { dbConnect } from "@/lib/mongodb";
import { Chat } from "@/lib/chatModel";

type Role = "user" | "assistant";

/* Tạo đoạn chat mới */
export async function createChat(userId: string) {
  await dbConnect();
  console.log(`[DB] Đang tạo chat mới cho userId: ${userId}`);
  return Chat.create({ userId });
}

/* Thêm tin nhắn vào đoạn chat */
export async function appendMessage(
  chatId: string,
  userId: string,
  role: Role,
  content: string,
  tokenUsage?: { prompt_tokens: number; completion_tokens: number }
) {
  await dbConnect();
  const messageData: any = { role, content };
  if (role === 'assistant' && tokenUsage) {
    messageData.tokenUsage = tokenUsage;
  }
  return Chat.updateOne(
    { _id: new Types.ObjectId(chatId), userId },
    { $push: { messages: messageData } }
  );
}

/* Lấy danh sách các chat của người dùng */
export async function getUserChats(userId: string) {
  await dbConnect();
  return Chat.find({ userId })
    .select("title createdAt")
    .sort({ createdAt: -1 })
    .lean();
}

/* Lấy chi tiết một đoạn chat */
export async function getChatById(chatId: string, userId: string) {
  await dbConnect();
  return Chat.findOne({ _id: new Types.ObjectId(chatId), userId }).lean();
}

/* Đổi tiêu đề đoạn chat */
export async function updateChatTitle(
  chatId: string,
  userId: string,
  title: string
) {
  await dbConnect();
  console.log(`[DB] Đang cập nhật tiêu đề cho chatId: ${chatId} của userId: ${userId}`);
  return Chat.updateOne(
    { _id: new Types.ObjectId(chatId), userId },
    { $set: { title } }
  );
}

/* Xoá đoạn chat */
export async function deleteChat(chatId: string, userId: string) {
  await dbConnect();
  console.log(`[DB] Đang xóa chatId: ${chatId} của userId: ${userId}`);
  return Chat.deleteOne({ _id: new Types.ObjectId(chatId), userId });
}
