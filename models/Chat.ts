// models/Chat.ts
import mongoose, { Schema, model, models, Document } from "mongoose";

/* ---------- Interfaces ---------- */
export interface IMessage extends Document {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface IChat extends Document {
  userId: mongoose.Schema.Types.ObjectId;
  messages: IMessage[];
  createdAt: Date;
  updatedAt: Date;
}

/* ---------- Schemas ---------- */
const messageSchema = new Schema<IMessage>(
  {
    role: { type: String, enum: ["user", "assistant", "system"], required: true },
    content: { type: String, required: true },
  },
  { _id: false }
);

const chatSchema = new Schema<IChat>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    messages: { type: [messageSchema], required: true },
  },
  { timestamps: true }
);

/* ---------- Model ---------- */
const ChatModel =
  models.Chat || model<IChat>("Chat", chatSchema);

/* 1️⃣ Named export (import { Chat })  */
export const Chat = ChatModel;

/* 2️⃣ Default export (import Chat from '@/models/Chat')  */
export default ChatModel;
