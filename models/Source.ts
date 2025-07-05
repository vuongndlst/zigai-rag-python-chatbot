
import { Schema, model, models } from "mongoose";
const SourceSchema = new Schema({
  type: { type: String, enum: ["file", "url"], required: true },
  path: String,
  originalName: String,
  status: { type: String, enum: ["pending", "seeded", "error"], default: "pending" },
  chunkCount: Number,
  error: String,
  createdAt: { type: Date, default: Date.now },
  updatedAt: Date,
});
export default models.Source || model("Source", SourceSchema);
