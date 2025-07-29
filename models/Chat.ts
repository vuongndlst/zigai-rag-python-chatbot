// models/Chat.ts
import mongoose, { Schema, model, models, Document } from "mongoose";

// Định nghĩa interface cho Message
export interface IMessage extends Document {
    role: "user" | "assistant" | "system";
    content: string;
}

// Định nghĩa interface cho Chat
export interface IChat extends Document {
    userId: mongoose.Schema.Types.ObjectId;
    messages: IMessage[];
    createdAt: Date;
    updatedAt: Date;
}

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

// SỬA LỖI: Sử dụng export thông thường thay vì export default
// Điều này đảm bảo tính nhất quán khi import trong các file API.
export const Chat = models.Chat || model<IChat>("Chat", chatSchema);
