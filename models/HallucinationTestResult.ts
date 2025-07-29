import { Schema, model, models } from 'mongoose';

const HallucinationTestResultSchema = new Schema({
  // Dùng để gom nhóm các kết quả thuộc cùng một lần chạy test
  batchId: { type: String, required: true, index: true }, 
  question: { type: String, required: true },
  groundTruthAnswer: { type: String, required: true },
  chatbotAnswer: { type: String, required: true },
  faithfulnessScore: { type: Number, required: true },
  relevanceScore: { type: Number, required: true },
  isHallucination: { type: String, enum: ['YES', 'NO'], required: true },
  explanation: { type: String },
}, { timestamps: true });

export const HallucinationTestResult = models.HallucinationTestResult || model('HallucinationTestResult', HallucinationTestResultSchema);
