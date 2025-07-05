import { Schema, model, models } from "mongoose";

const SeedLogSchema = new Schema({
  sourceId: { type: Schema.Types.ObjectId, ref: "Source" },
  type: String,               // file | url
  chunkCount: Number,
  tokensUsed: Number,         // 👈 tổng token embed
  durationMs: Number,
  success: Boolean,
  error: String,
  createdAt: { type: Date, default: Date.now },
});

export default models.SeedLog || model("SeedLog", SeedLogSchema);
