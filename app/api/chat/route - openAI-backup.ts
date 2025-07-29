/* --------------------------------------------------------------------------
   app/api/chat/route.ts · ZigAI – Python 10 KNTT (Bài 16 → 32)
   Version: v7.4 - Added User Query Logging
   -------------------------------------------------------------------------- */
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import OpenAI from "openai";
import { LlamaCloudIndex, NodeWithScore } from "llamaindex";
import { createChat, appendMessage, updateChatTitle } from "@/lib/chatService";
import { ModerationItem } from "@/models/ModerationItem";
import { CacheHit } from "@/models/CacheHit";
import { UserQuery } from "@/models/UserQuery";
import { dbConnect } from "@/lib/mongodb";

/* ------------------------------------------------------------------ */
/* 1. CONFIGURATION & ENVIRONMENT VARIABLES                           */
/* ------------------------------------------------------------------ */
const {
  OPENAI_API_KEY,
  EMBEDDING_MODEL = "text-embedding-3-small",
  OPENAI_CHAT_MODEL = "gpt-4o",
  OPENAI_FALLBACK_MODEL = "gpt-4o-mini",
  LLAMA_CLOUD_API_KEY,
  LLAMA_CLOUD_INDEX_NAME = "python 10", 
  LLAMA_CLOUD_PROJECT_NAME = "zigai",
  LLAMA_CLOUD_ORGANIZATION_ID,
} = process.env;

if (!OPENAI_API_KEY || !LLAMA_CLOUD_API_KEY || !LLAMA_CLOUD_INDEX_NAME || !LLAMA_CLOUD_PROJECT_NAME || !LLAMA_CLOUD_ORGANIZATION_ID) {
    throw new Error("Missing critical environment variables.");
}

const SIMILARITY_TOP_K = 8;
const CACHE_SIMILARITY_THRESHOLD = 0.9;

/* ------------------------------------------------------------------ */
/* 2. API CLIENTS INITIALIZATION                                      */
/* ------------------------------------------------------------------ */
const openai = new OpenAI({ apiKey: OPENAI_API_KEY });
const llamaCloudIndex = new LlamaCloudIndex({
  name: LLAMA_CLOUD_INDEX_NAME,
  projectName: LLAMA_CLOUD_PROJECT_NAME,
  organizationId: LLAMA_CLOUD_ORGANIZATION_ID,
  apiKey: LLAMA_CLOUD_API_KEY,
});
console.log(`✅ Connected to LlamaCloud index: ${LLAMA_CLOUD_INDEX_NAME}`);

/* ------------------------------------------------------------------ */
/* 3. HELPER FUNCTIONS                                                */
/* ------------------------------------------------------------------ */
async function getChatCompletion(messages: any[], model = OPENAI_CHAT_MODEL): Promise<{ answer: string; usage: { prompt_tokens: number; completion_tokens: number; } | null }> {
    try { const completion = await openai.chat.completions.create({ model, messages, max_tokens: 4096, temperature: 0.4, }); if (completion.usage) { console.log("✅ TOKEN USAGE:", { prompt_tokens: completion.usage.prompt_tokens, completion_tokens: completion.usage.completion_tokens, total_tokens: completion.usage.total_tokens, model }); } const answer = completion.choices[0]?.message?.content ?? "(Không có câu trả lời)"; return { answer, usage: completion.usage ? { prompt_tokens: completion.usage.prompt_tokens, completion_tokens: completion.usage.completion_tokens, } : null }; } catch (error: any) { console.warn(`⚠️ OpenAI API call with model ${model} failed: ${error.message}. Falling back...`); if (model !== OPENAI_FALLBACK_MODEL) { return getChatCompletion(messages, OPENAI_FALLBACK_MODEL); } return { answer: "Xin lỗi, đã có lỗi xảy ra khi kết nối đến trợ lý AI. Vui lòng thử lại sau.", usage: null }; }
}
const forbiddenKeywords = ["deepfake", "chính trị", "game", "tán gẫu", "giải trí", "hacking", "an ninh mạng"];
const cheatingKeywords = ["giải hộ", "làm giùm", "copy bài", "chép lời giải", "đáp án là gì"];
const contains = (text: string, keywords: string[]) => keywords.some(kw => new RegExp(`\\b${kw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i").test(text));
async function translateToVietnamese(text: string): Promise<string> {
    const vietnameseChars = /[àáâãèéêìíòóôõùúăđĩũơưạảấầẩẫậắằẳẵặẹẻẽếềểễệỉịọỏốồổỗộớờởỡợụủứừửữựỳýỵỷỹ]/; if (vietnameseChars.test(text)) { console.log("ℹ️ Query appears to be Vietnamese, skipping translation."); return text; } try { console.log(`TRANSLATING: "${text}" to Vietnamese.`); const completion = await openai.chat.completions.create({ model: "gpt-4o-mini", messages: [{ role: "system", content: "You are an expert translator. Translate the user's query into natural-sounding Vietnamese. Return only the translated text." }, { role: "user", content: text }], temperature: 0.1, max_tokens: 300, }); const translatedText = completion.choices[0]?.message?.content?.trim() || text; console.log(`TRANSLATED: to "${translatedText}"`); return translatedText; } catch (error) { console.error("❌ Translation to Vietnamese failed:", error); return text; }
}

/* ------------------------------------------------------------------ */
/* 4. API ROUTE HANDLER (POST)                                        */
/* ------------------------------------------------------------------ */
export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    // --- 1. Authentication and Input Validation ---
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;
    const { messages, chatId: existingChatId } = await req.json();
    const latestMessage: string = messages.at(-1)?.content ?? "";

    if (!latestMessage) { return NextResponse.json({ answer: "Câu hỏi không được để trống.", chatId: null, sources: [] }); }
    if (latestMessage.length > 3000) { return NextResponse.json({ answer: "Câu hỏi quá dài, vui lòng chia nhỏ.", chatId: null, sources: [] }); }
    if (contains(latestMessage, forbiddenKeywords)) { return NextResponse.json({ answer: "Xin lỗi, chủ đề này ngoài phạm vi hỗ trợ của ZigAI.", chatId: null, sources: [] }); }
    if (contains(latestMessage, cheatingKeywords)) { return NextResponse.json({ answer: "Hãy tự suy nghĩ! ZigAI chỉ gợi ý và giảng giải, không làm bài hộ.", chatId: null, sources: [] }); }

    // --- 2. Dịch và Tạo Embedding cho câu hỏi ---
    const translatedQuery = await translateToVietnamese(latestMessage);
    await dbConnect();
    const queryEmbedding = await openai.embeddings.create({
        model: EMBEDDING_MODEL,
        input: translatedQuery, 
    }).then(res => res.data[0].embedding);

    // --- 3. Ghi nhận câu hỏi của người dùng ---
    await UserQuery.create({
        prompt: latestMessage,
        promptEmbedding: queryEmbedding,
        userId: userId,
        chatId: existingChatId,
    });

    // --- 4. KIỂM TRA CACHE TRONG KNOWLEDGE BASE ---
    console.log("🔎 Đang tìm kiếm trong Knowledge Base Cache...");
    const cachedResults = await ModerationItem.aggregate([
        {
            "$vectorSearch": {
                "index": "prompt_embedding_index",
                "path": "promptEmbedding",
                "queryVector": queryEmbedding,
                "numCandidates": 1,
                "limit": 1
            }
        },
        { "$match": { "status": "approved" } },
        { "$project": { "_id": 1, "response": 1, "score": { "$meta": "vectorSearchScore" } } }
    ]);

    if (cachedResults.length > 0 && cachedResults[0].score > CACHE_SIMILARITY_THRESHOLD) {
        console.log(`✅ Cache hit! (Score: ${cachedResults[0].score})`);
        const cachedAnswer = cachedResults[0].response;

        let chatId = existingChatId;
        if (!chatId) {
            const newChat = await createChat(userId);
            chatId = newChat._id.toString();
            const title = latestMessage.slice(0, 40) + (latestMessage.length > 40 ? "…" : "");
            await updateChatTitle(chatId, userId, title);
        }
        await appendMessage(chatId, userId, "user", latestMessage);
        await appendMessage(chatId, userId, "assistant", cachedAnswer);

        await CacheHit.create({
            prompt: latestMessage,
            cachedItemId: cachedResults[0]._id,
            userId: userId,
            chatId: chatId,
        });

        return NextResponse.json({ answer: cachedAnswer, chatId, sources: [] });
    }

    console.log("ℹ️ Cache miss. Tiếp tục với RAG pipeline...");
    // --- KẾT THÚC KIỂM TRA CACHE ---


    // --- 5. RAG PIPELINE (nếu cache miss) ---
    let chatId = existingChatId;
    if (!chatId) {
      const newChat = await createChat(userId);
      chatId = newChat._id.toString();
      const title = latestMessage.slice(0, 40) + (latestMessage.length > 40 ? "…" : "");
      await updateChatTitle(chatId, userId, title);
    }
    await appendMessage(chatId, userId, "user", latestMessage);

    const retriever = llamaCloudIndex.asRetriever({ similarityTopK: SIMILARITY_TOP_K });
    const retrievedNodes: NodeWithScore[] = await retriever.retrieve(translatedQuery);
    const context = retrievedNodes.length > 0
      ? retrievedNodes.map(node => `<document>\n${node.node.text}\n</document>`).join("\n\n")
      : "(Không có tài liệu tham khảo nào phù hợp.)";

    // --- 6. RAG: Generation (với prompt đã được cải tiến) ---
    const systemPrompt = {
      role: "system" as const,
      content: `Bạn là **ZigAI**, một trợ giảng AI chuyên gia về lập trình Python dành cho học sinh Lớp 10, với kiến thức chuyên sâu từ Sách giáo khoa Kết Nối Tri Thức (từ Bài 16 đến 32). Phong cách của bạn là thân thiện, kiên nhẫn và luôn khuyến khích học sinh tự suy nghĩ.

**QUY TẮC VÀNG (BẮT BUỘC TUÂN THỦ):**
1.  **CHỈ DÙNG KIẾN THỨC ĐƯỢC CUNG CẤP:** Toàn bộ câu trả lời của bạn PHẢI dựa trên thông tin có trong các thẻ \`<document>\` dưới đây. Đây là nguồn kiến thức duy nhất và tối thượng của bạn.
2.  **KHÔNG SUY DIỄN:** Tuyệt đối không được bịa đặt thông tin hoặc sử dụng kiến thức bên ngoài không có trong thẻ \`<document>\`. Nếu thông tin không có, hãy trả lời theo quy tắc số 4.
3.  **KHÔNG GIẢI BÀI TẬP:** Tuyệt đối không đưa ra lời giải trực tiếp cho các bài tập cụ thể trong sách. Thay vào đó, hãy giảng giải kiến thức liên quan và hướng dẫn học sinh cách tự giải quyết vấn đề.

---
**NGUỒN KIẾN THỨC:**
<context>
${context}
</context>
---

**QUY TRÌNH TRẢ LỜI:**

1.  **PHÂN TÍCH YÊU CẦU:** Đọc thật kỹ câu hỏi của học sinh (luôn bằng Tiếng Việt và bắt đầu bằng từ để hỏi) để hiểu rõ họ đang muốn hỏi gì.
2.  **ĐỐI CHIẾU TÀI LIỆU:** Cẩn thận rà soát TOÀN BỘ nội dung trong các thẻ \`<document>\` để tìm kiếm thông tin liên quan.
3.  **TỔNG HỢP VÀ GIẢNG GIẢI (Nếu có thông tin):**
    * Sử dụng ngôn ngữ Tiếng Việt tự nhiên, dễ hiểu.
    * Trình bày câu trả lời theo cấu trúc sư phạm sau để giúp học sinh hiểu sâu nhất:
        * **Giải thích:** Giảng giải khái niệm một cách rõ ràng, logic, và đi thẳng vào vấn đề.
        * **Ví dụ Code:** Nếu phù hợp, hãy cung cấp một đoạn code Python ngắn gọn, sạch sẽ, và có chú thích rõ ràng để minh họa cho kiến thức chung, không phải cho bài tập cụ thể.
        * **Tóm tắt:** Chốt lại những điểm chính cần nhớ.
        * **Luyện tập:** Đưa ra một hoặc hai câu hỏi/bài tập nhỏ để học sinh có thể tự thực hành và củng cố kiến thức.
    * Luôn sử dụng định dạng Markdown để câu trả lời dễ đọc (in đậm, danh sách, khối code...).
    * **Quan trọng:** Cuối mỗi câu trả lời, hãy thêm một phần **"Gợi ý câu hỏi tiếp theo:"** để khuyến khích học sinh đào sâu kiến thức. Ví dụ: "Bạn có muốn tìm hiểu thêm về cách các kiểu dữ liệu khác nhau ảnh hưởng đến vòng lặp không?".

4.  **TRẢ LỜI KHI KHÔNG CÓ THÔNG TIN:**
    * Nếu sau khi đã tìm kiếm kỹ lưỡng mà không thấy thông tin trong tài liệu, hãy trả lời một cách thân thiện và duy nhất một câu: **"Xin lỗi, mình không tìm thấy thông tin về chủ đề này trong sách giáo khoa."**

5.  **TRƯỜNG HỢP ĐẶC BIỆT:**
    * Nếu học sinh hỏi về "mục lục", hãy liệt kê danh sách các bài từ 16 đến 32.`
    };

    const messagesForLLM = [...messages.slice(0, -1), { role: "user", content: translatedQuery }];
    const messagesForApi = [systemPrompt, ...messagesForLLM.slice(-10)];
    const { answer, usage } = await getChatCompletion(messagesForApi);

    await appendMessage(chatId, userId, "assistant", answer, usage || undefined);

    await ModerationItem.create({
        prompt: latestMessage,
        response: answer,
        chatId: chatId,
        userId: userId,
        status: 'pending'
    });

    const sources = retrievedNodes.map(node => ({
        id: node.node.id_, 
        source: (node.node.metadata as any)?.type || 'Tài liệu', 
        snippet: (node.node.text || "").slice(0, 200) + "…", 
    }));

    return NextResponse.json({ answer, chatId, sources });

  } catch (err: any) {
    console.error("❌ Critical error in chat route:", err);
    return NextResponse.json({ error: "Internal Server Error", details: err.message }, { status: 500 });
  }
}
