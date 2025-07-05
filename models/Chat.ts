// models/Chat.ts
import mongoose, { Schema, model, models } from "mongoose";

const messageSchema = new Schema(
  {
    role: { type: String, enum: ["user", "assistant", "system"], required: true },
    content: { type: String, required: true },
  },
  { _id: false }
);

const chatSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    messages: { type: [messageSchema], required: true },
  },
  { timestamps: true }
);

// Nếu model đã tồn tại thì dùng lại, tránh lỗi khi hot reload trong Next.js
const Chat = models.Chat || model("Chat", chatSchema);

export default Chat;
