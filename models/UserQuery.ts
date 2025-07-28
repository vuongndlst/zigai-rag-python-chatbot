import { Schema, model, models } from 'mongoose';

const UserQuerySchema = new Schema({
  prompt: { type: String, required: true },
  // Vector embedding của câu hỏi để tìm kiếm tương đồng
  promptEmbedding: {
    type: [Number],
  },
  userId: { type: String },
  chatId: { type: Schema.Types.ObjectId, ref: 'Chat' },
}, { timestamps: true });

// **QUAN TRỌNG**: Bạn cần tạo một Vector Search Index trên trường `promptEmbedding`
// với tên là `user_query_embedding_index` để phân tích các câu hỏi tương đồng.

export const UserQuery = models.UserQuery || model('UserQuery', UserQuerySchema);
