/* --------------------------------------------------------------------------
 * 1. DEPENDENCIES
 * -------------------------------------------------------------------------- */
import OpenAI from "openai";
import { GoogleGenerativeAI } from "@google/generative-ai";
import "dotenv/config";
import * as fs from "fs";
import * as path from "path";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";
import { TokenTextSplitter } from "langchain/text_splitter";
import mongoose from "mongoose";

/* --------------------------------------------------------------------------
 * 2. ENV & CONFIGURATION
 * -------------------------------------------------------------------------- */
const {
  OPENAI_API_KEY,
  GEMINI_API_KEY, // Thêm key cho Gemini
  DATA_FOLDER = "./docs",
  MONGODB_URI,
} = process.env;

if (!OPENAI_API_KEY || !MONGODB_URI || !GEMINI_API_KEY) {
  throw new Error("❌ Thiếu các biến môi trường quan trọng: OPENAI_API_KEY, MONGODB_URI, GEMINI_API_KEY.");
}

const openai = new OpenAI({ apiKey: OPENAI_API_KEY });
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

// CONFIGURATIONS
const MAX_QUESTIONS_PER_CHUNK = 3;
const CONCURRENCY_LIMIT = 2;
const EMBEDDING_MODEL = "text-embedding-3-small";
const COMPLETION_MODEL = "gpt-4o";
const VERIFICATION_MODEL = "gemini-1.5-flash"; // Dùng Gemini để xác thực
const RELATED_CHUNKS_LIMIT = 3;

/* --------------------------------------------------------------------------
 * 3. MONGODB SETUP
 * -------------------------------------------------------------------------- */

const TempChunkSchema = new mongoose.Schema({
  content: { type: String, required: true },
  source: { type: String, required: true },
  embedding: { type: [Number], required: true },
});
const TempChunk = mongoose.models.TempChunk || mongoose.model("TempChunk", TempChunkSchema);


/* --------------------------------------------------------------------------
 * 4. HELPER FUNCTIONS
 * -------------------------------------------------------------------------- */

const splitter = new TokenTextSplitter({
  encodingName: "cl100k_base",
  chunkSize: 512,
  chunkOverlap: 50,
});

const clean = (text: string) => text.replace(/^\s*\d+\s*$/gm, " ").replace(/\u00AD/g, "-").replace(/\s+/g, " ").trim();

async function extractTextFromPdf(pdfPath: string) {
  const data = new Uint8Array(fs.readFileSync(pdfPath));
  const doc = await pdfjsLib.getDocument({ data, disableWorker: true }).promise;
  let fullText = "";
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items.map((item: any) => item.str).join(" ");
    fullText += clean(pageText) + " ";
  }
  return fullText;
}

async function withRetry(fn: () => Promise<any>, retries = 3) {
  let lastError;
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      if (error.status === 429) {
        const delay = Math.pow(2, i) * 1000 + Math.random() * 1000;
        console.warn(`   - ⏳ Rate limit hit. Đang thử lại sau ${Math.round(delay / 1000)} giây...`);
        await new Promise(res => setTimeout(res, delay));
      } else {
        throw error;
      }
    }
  }
  throw lastError;
}

async function getEmbedding(text: string) {
  const response = await withRetry(() => openai.embeddings.create({
    model: EMBEDDING_MODEL,
    input: text.replace(/\n/g, ' '),
  }));
  return response.data[0].embedding;
}

async function findRelatedChunks(embedding: number[]) {
  return TempChunk.aggregate([
    {
      $vectorSearch: {
        index: "vector_index",
        path: "embedding",
        queryVector: embedding,
        numCandidates: 100,
        limit: RELATED_CHUNKS_LIMIT,
      },
    },
    {
      $project: {
        _id: 0,
        content: 1,
        score: { $meta: "vectorSearchScore" },
      },
    },
  ]);
}

async function proposeQAPairs(context: string) {
    const systemPrompt = `Bạn là một chuyên gia sư phạm và biên soạn tài liệu học tập Tiếng Việt. Dựa vào nội dung được cung cấp, hãy tạo ra ${MAX_QUESTIONS_PER_CHUNK} cặp câu hỏi và câu trả lời chuyên sâu.

**QUY TẮC BẮT BUỘC:**

1.  **CÂU HỎI:**
    * Phải là Tiếng Việt, có văn phong tự nhiên, rõ ràng và sử dụng các từ để hỏi phù hợp..
    * Phải tập trung vào kiến thức chung về Python được cung cấp trong context, không hỏi về các bài tập cụ thể.

2.  **CÂU TRẢ LỜI:**
    * Phải được suy ra 100% từ nội dung trong thẻ <context>. Không tự ý thêm thông tin bên ngoài.
    * **BẮT BUỘC** phải tuân thủ nghiêm ngặt cấu trúc Markdown sau đây, bao gồm cả các dấu ** và xuống dòng:
        **Giải thích:**
        [Nội dung giải thích chi tiết, rõ ràng]

        **Ví dụ Code:**
        \`\`\`python
        # Code minh họa (nếu có)
        \`\`\`

        **Tóm tắt:**
        - [Điểm chính 1]
        - [Điểm chính 2]

        **Luyện tập:**
        1. [Bài tập/câu hỏi luyện tập 1]
        2. [Bài tập/câu hỏi luyện tập 2]

3.  **ĐỊNH DẠNG JSON:** Trả về kết quả dưới dạng một đối tượng JSON hợp lệ: \`{ "qa_pairs": [{ "question": "...", "answer": "..." }] }\`
4.  **TRƯỜNG HỢP KHÔNG ĐỦ THÔNG TIN:** Nếu context không đủ thông tin, trả về: \`{ "qa_pairs": [] }\``;
    
    const userPrompt = `<context>${context}</context>`;

    try {
        const response = await withRetry(() => openai.chat.completions.create({
            model: COMPLETION_MODEL,
            response_format: { type: "json_object" },
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt }
            ],
        }));
        const content = response.choices[0].message.content;
        if (!content) return [];
        const parsed = JSON.parse(content);
        return parsed.qa_pairs || [];
    } catch (error) {
        console.error("Lỗi khi tạo Q&A với OpenAI:", error);
        return [];
    }
}

// CẬP NHẬT: Sử dụng Gemini để xác thực
async function verifyQAPair(context: string, question: string, answer: string) {
    const model = genAI.getGenerativeModel({ model: VERIFICATION_MODEL });
    const prompt = `Bạn là một AI kiểm tra chất lượng dữ liệu. Dựa vào <context> được cung cấp, hãy cho biết câu trả lời trong <answer> có thể được suy ra một cách logic và hoàn toàn từ <context> để trả lời cho câu hỏi trong <question> hay không? Chỉ trả lời bằng một từ duy nhất: "YES" hoặc "NO".\n\n<context>${context}</context>\n<question>${question}</question>\n<answer>${answer}</answer>`;
    try {
        const result = await withRetry(() => model.generateContent(prompt));
        const decision = result.response.text().trim().toUpperCase();
        return decision === "YES";
    } catch (error) {
        console.error("Lỗi khi xác thực Q&A với Gemini:", error);
        return false;
    }
}

/* --------------------------------------------------------------------------
 * 5. MAIN EXECUTION
 * -------------------------------------------------------------------------- */
async function main() {
  console.log("🚀 Bắt đầu quá trình tạo KB với OpenAI & Gemini...");
  console.time("⏱️  Tổng thời gian");

  const { dbConnect, dbDisconnect } = await import("../lib/mongodb.js");
  const { ModerationItem } = await import("../models/ModerationItem.js");

  try {
    await dbConnect();

    // --- Step 1: Chuẩn bị Chunks ---
    console.log(`\n📄 Kiểm tra dữ liệu chunk đã có...`);
    let allTempChunks = await TempChunk.find({});
    
    if (allTempChunks.length > 0) {
        console.log(`   - ✅ Đã tìm thấy ${allTempChunks.length} chunks có sẵn. Bỏ qua bước tạo embedding.`);
    } else {
        console.log("   - ℹ️ Không có chunk nào. Bắt đầu đọc và tạo embedding cho tài liệu...");
        const pdfFiles = fs.readdirSync(DATA_FOLDER).filter((file) => path.extname(file).toLowerCase() === ".pdf");
        if (pdfFiles.length === 0) {
            console.log(`⚠️  Không tìm thấy tài liệu PDF nào.`);
            return;
        }

        for (const pdfFile of pdfFiles) {
            console.log(`     - Đang xử lý file: ${pdfFile}`);
            const pdfPath = path.join(DATA_FOLDER, pdfFile);
            const text = await extractTextFromPdf(pdfPath);
            const chunks = await splitter.splitText(text);
            
            for (const chunkContent of chunks) {
                const embedding = await getEmbedding(chunkContent);
                await TempChunk.create({
                    content: chunkContent,
                    source: pdfFile,
                    embedding: embedding,
                });
            }
        }
        allTempChunks = await TempChunk.find({});
        console.log(`   - ✅ Đã tạo và lưu ${allTempChunks.length} chunks với embeddings.`);
    }

    // --- Step 2: Xử lý từng chunk với context được làm giàu ---
    let totalProposed = 0;
    let totalVerified = 0;
    
    for (let i = 0; i < allTempChunks.length; i += CONCURRENCY_LIMIT) {
        const batch = allTempChunks.slice(i, i + CONCURRENCY_LIMIT);
        console.log(`\n🧠 Đang xử lý lô ${Math.floor(i / CONCURRENCY_LIMIT) + 1} (chunks từ ${i + 1} đến ${i + batch.length})...`);

        const promises = batch.map(async (chunk, indexInBatch) => {
            const chunkIndex = i + indexInBatch + 1;
            const relatedChunks = await findRelatedChunks(chunk.embedding);
            const enrichedContext = [
                `Nội dung chính: ${chunk.content}`,
                ...relatedChunks.map(c => `Nội dung liên quan: ${c.content}`)
            ].join("\n\n---\n\n");

            const proposedPairs = await proposeQAPairs(enrichedContext);
            
            let verifiedCountInChunk = 0;
            if (proposedPairs.length > 0) {
                totalProposed += proposedPairs.length;
                console.log(`   - Chunk ${chunkIndex}: Đề xuất ${proposedPairs.length} cặp. Bắt đầu xác thực...`);
                
                for (const pair of proposedPairs) {
                    const isVerified = await verifyQAPair(enrichedContext, pair.question, pair.answer);
                    if (isVerified) {
                        const existing = await ModerationItem.findOne({ prompt: pair.question });
                        if (!existing) {
                            await ModerationItem.create({
                                prompt: pair.question,
                                response: pair.answer,
                                status: 'pending',
                            });
                            verifiedCountInChunk++;
                        }
                    }
                }
            }
            return { chunkIndex, count: verifiedCountInChunk };
        });

        const results = await Promise.allSettled(promises);
        results.forEach((result) => {
            if (result.status === 'fulfilled') {
                console.log(`   - Chunk ${result.value.chunkIndex}: Xác thực và lưu thành công ${result.value.count} cặp Q&A.`);
                totalVerified += result.value.count;
            } else {
                console.error(`   - Một chunk trong lô xử lý thất bại. Lỗi:`, result.reason);
            }
        });
    }

    console.log(`\n\n🎉 Hoàn tất!`);
    console.log(`   - Tổng số đề xuất: ${totalProposed} cặp Q&A.`);
    console.log(`   - Tổng số đã xác thực và lưu: ${totalVerified} cặp Q&A mới.`);
    console.log('   - Vui lòng truy cập trang "Kiểm duyệt Q&A" trong khu vực admin để xem và duyệt.');

  } catch (e) {
    console.error("💥 Lỗi nghiêm trọng:", e);
    process.exit(1);
  } finally {
    await dbDisconnect();
    console.timeEnd("⏱️  Tổng thời gian");
  }
}

/* -------------------------------------------------------------------------- */
main();
