// lib/chatModel.ts
import { Schema, model, models } from "mongoose";

const messageSchema = new Schema(
  {
    role: { type: String, enum: ["user", "assistant"], required: true },
    content: { type: String, required: true },
    createdAt: { type: Date, default: () => new Date() },
  },
  { _id: false }
);

const chatSchema = new Schema(
  {
    userId: { type: String, required: true },
    title: { type: String, default: "Đoạn chat mới" },
    messages: [messageSchema],
    createdAt: { type: Date, default: () => new Date() },
  },
  { timestamps: true }
);

export const Chat = models.Chat || model("Chat", chatSchema);
