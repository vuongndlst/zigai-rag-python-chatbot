import { Schema, model, models } from 'mongoose';

const HallucinationTestResultSchema = new Schema({
    // Dùng để gom nhóm các kết quả thuộc cùng một lần chạy test
    batchId: { type: String, required: true, index: true }, 
    
    // NÂNG CẤP: Thêm trường để lưu loại test case
    testType: { type: String, required: true, index: true },

    question: { type: String, required: true },
    groundTruthAnswer: { type: String, required: true },
    chatbotAnswer: { type: String, required: true },
    faithfulnessScore: { type: Number, required: true },
    relevanceScore: { type: Number, required: true },
    isHallucination: { type: String, enum: ['YES', 'NO'], required: true },
    explanation: { type: String },
    
    // NÂNG CẤP MỚI: Thêm trường để lưu kết luận cho cả batch.
    // Trường này sẽ chỉ được điền cho một bản ghi đặc biệt hoặc bản ghi cuối cùng của batch.
    conclusion: { type: String, required: false },

}, { timestamps: true });

export const HallucinationTestResult = models.HallucinationTestResult || model('HallucinationTestResult', HallucinationTestResultSchema);
