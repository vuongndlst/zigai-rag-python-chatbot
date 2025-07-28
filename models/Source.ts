// models/Source.ts

import { Schema, model, models } from "mongoose";

const SourceSchema = new Schema({
  type: { type: String, enum: ["file", "url"], required: true },
  path: String,
  originalName: String,
  // CẬP NHẬT LẠI ENUM CHO TRƯỜNG STATUS
  status: { 
    type: String, 
    enum: ["pending", "processing", "done", "error"], // Thêm 'processing' và đổi 'seeded' thành 'done'
    default: "pending" 
  },
  chunkCount: Number,
  error: String,
  createdAt: { type: Date, default: Date.now },
  updatedAt: Date,
});

export default models.Source || model("Source", SourceSchema);