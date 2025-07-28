// lib/chatModel.ts
import { Schema, model, models } from "mongoose";

const messageSchema = new Schema(
  {
    role: { type: String, enum: ["user", "assistant"], required: true },
    content: { type: String, required: true },
    // ADD THIS FIELD
    tokenUsage: {
        prompt_tokens: { type: Number },
        completion_tokens: { type: Number },
    },
  },
  { _id: false, timestamps: { createdAt: true, updatedAt: false } } // Only add createdAt to messages
);

const chatSchema = new Schema(
  {
    userId: { type: String, required: true },
    title: { type: String, default: "Đoạn chat mới" },
    messages: [messageSchema],
  },
  { timestamps: true } // Adds createdAt and updatedAt to the chat document
);

export const Chat = models.Chat || model("Chat", chatSchema);
