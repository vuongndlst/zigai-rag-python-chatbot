import { NextResponse, NextRequest } from 'next/server';
import { requireAdmin } from '@/lib/requireAdmin';
import { dbConnect } from '@/lib/mongodb';
import { ModerationItem } from '@/models/ModerationItem';
import OpenAI from "openai";
// CẬP NHẬT: Thêm import cho Gemini
import { GoogleGenerativeAI } from "@google/generative-ai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
// CẬP NHẬT: Khởi tạo client Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);


/**
 * Phân tích một cặp Q&A và đưa ra gợi ý kiểm duyệt chi tiết.
 * @param prompt - Câu hỏi của người dùng.
 * @param response - Câu trả lời của AI.
 * @returns Một đối tượng chứa quyết định và lý do chi tiết.
 */
async function getAISuggestion(prompt: string, response: string): Promise<{ decision: 'approve' | 'reject'; reasoning: { question_quality: string; answer_quality: string; relevance: string; } }> {
    // CẬP NHẬT: Sử dụng model Gemini để phân tích
    const model = genAI.getGenerativeModel({
        model: "gemini-1.5-flash",
        generationConfig: { responseMimeType: "application/json" },
    });

    const systemPrompt = `Bạn là một AI kiểm duyệt chất lượng cao, có nhiệm vụ đánh giá một cặp Câu hỏi - Câu trả lời dựa trên 3 tiêu chí sau:
1.  **Chất lượng câu hỏi (question_quality):** Câu hỏi có rõ ràng, phù hợp với chủ đề lập trình Python cho học sinh không?
2.  **Chất lượng câu trả lời (answer_quality):** Câu trả lời có chính xác, an toàn, và tuân thủ cấu trúc sư phạm (Giải thích, Ví dụ, Tóm tắt, Luyện tập) không?
3.  **Độ phù hợp (relevance):** Câu trả lời có phải là câu trả lời trực tiếp và đúng trọng tâm cho câu hỏi không?

Dựa trên đánh giá tổng thể, hãy đưa ra quyết định cuối cùng là "approve" (nếu tất cả đều tốt) hoặc "reject" (nếu có bất kỳ vấn đề nào).

Trả về kết quả dưới dạng một đối tượng JSON hợp lệ có cấu trúc: { "decision": "approve" | "reject", "reasoning": { "question_quality": "...", "answer_quality": "...", "relevance": "..." } }`;
    
    const userPrompt = `<Câu hỏi>:\n${prompt}\n\n<Câu trả lời>:\n${response}`;

    const defaultRejection = {
        decision: 'reject',
        reasoning: {
            question_quality: 'Không thể phân tích.',
            answer_quality: 'Không thể phân tích.',
            relevance: 'Không thể phân tích.'
        }
    };

    try {
        const result = await model.generateContent([systemPrompt, userPrompt]);
        const text = result.response.text();
        if (!text) return defaultRejection;
        
        return JSON.parse(text);
    } catch (error) {
        console.error("Lỗi khi lấy đề xuất từ Gemini:", error);
        return defaultRejection;
    }
}

// Lấy danh sách các mục (có gợi ý từ AI cho các mục đang chờ)
export async function GET(req: NextRequest) {
  try {
    await requireAdmin();
    await dbConnect();

    const status = req.nextUrl.searchParams.get('status');
    const page = Number(req.nextUrl.searchParams.get("page") || 1);
    const limit = 5;
    const skip = (page - 1) * limit;

    const filter: { status?: string } = {};
    if (status && ['pending', 'approved', 'rejected'].includes(status)) {
      filter.status = status;
    }
    
    const total = await ModerationItem.countDocuments(filter);
    const items = await ModerationItem.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean();

    if (filter.status === 'pending') {
        const itemsWithSuggestions = await Promise.all(
            items.map(async (item) => {
                const suggestion = await getAISuggestion(item.prompt, item.response);
                return { ...item, aiSuggestion: suggestion };
            })
        );
        return NextResponse.json({ items: itemsWithSuggestions, total });
    }

    return NextResponse.json({ items, total });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// Cập nhật trạng thái (duyệt/từ chối)
export async function PUT(req: Request) {
  try {
    await requireAdmin();
    await dbConnect();
    const { id, status } = await req.json();

    if (!['approved', 'rejected'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    const updatedItem = await ModerationItem.findById(id);

    if (!updatedItem) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    updatedItem.status = status;

    if (status === 'approved') {
        console.log(`✅ Creating embedding for prompt: "${updatedItem.prompt}"`);
        const embeddingResponse = await openai.embeddings.create({
            model: "text-embedding-3-small",
            input: updatedItem.prompt,
        });
        updatedItem.promptEmbedding = embeddingResponse.data[0].embedding;
    }

    await updatedItem.save();
    return NextResponse.json(updatedItem);

  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
