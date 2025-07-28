import { Schema, model, models } from 'mongoose';

const ModerationItemSchema = new Schema({
  prompt: { type: String, required: true },
  response: { type: String, required: true },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending',
  },
  // Trường mới để lưu vector embedding của câu hỏi
  promptEmbedding: {
    type: [Number],
  },
  chatId: { type: Schema.Types.ObjectId, ref: 'Chat' },
  userId: { type: String },
}, { timestamps: true });

export const ModerationItem = models.ModerationItem || model('ModerationItem', ModerationItemSchema);
