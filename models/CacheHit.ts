import { Schema, model, models } from 'mongoose';

const CacheHitSchema = new Schema({
  prompt: { type: String, required: true },
  cachedItemId: { type: Schema.Types.ObjectId, ref: 'ModerationItem' },
  userId: { type: String },
  chatId: { type: Schema.Types.ObjectId, ref: 'Chat' },
}, { timestamps: true });

export const CacheHit = models.CacheHit || model('CacheHit', CacheHitSchema);
