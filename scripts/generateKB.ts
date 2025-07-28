/* --------------------------------------------------------------------------
 * 1. DEPENDENCIES
 * -------------------------------------------------------------------------- */
import {
  SimpleDirectoryReader,
  NodeParser,
} from "llamaindex";
import OpenAI from "openai";
import "dotenv/config";
// SỬA LỖI: Các import nội bộ sẽ được chuyển vào trong hàm main()
// import { dbConnect } from "@/lib/mongodb";
// import { ModerationItem } from "@/models/ModerationItem";

/* --------------------------------------------------------------------------
 * 2. ENV & CONFIGURATION
 * -------------------------------------------------------------------------- */
const {
  OPENAI_API_KEY,
  DATA_FOLDER = "./docs",
} = process.env;

if (!OPENAI_API_KEY) {
  throw new Error("❌ Thiếu biến môi trường quan trọng: OPENAI_API_KEY.");
}

const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

// CẤU HÌNH CHO VIỆC TẠO DỮ LIỆU
const MAX_QUESTIONS_PER_CHUNK = 3;
const CONCURRENCY_LIMIT = 5;

/* --------------------------------------------------------------------------
 * 3. HELPER FUNCTIONS
 * -------------------------------------------------------------------------- */

/**
 * Tự động sửa lỗi và chuẩn hóa văn bản tiếng Việt bằng AI.
 * @param text - Đoạn văn bản có thể bị lỗi.
 * @returns Đoạn văn bản đã được sửa lỗi.
 */
async function cleanVietnameseText(text: string): Promise<string> {
    const systemPrompt = `Bạn là một chuyên gia ngôn ngữ Tiếng Việt. Đoạn văn bản sau có thể bị lỗi font, sai ký tự hoặc lỗi encoding. Nhiệm vụ của bạn là đọc, hiểu và viết lại nó thành một đoạn văn bản Tiếng Việt chuẩn, tự nhiên và đúng chính tả. Chỉ trả về duy nhất nội dung đã được sửa.`;
    try {
        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: text },
            ],
            temperature: 0,
        });
        return response.choices[0].message.content || text;
    } catch (error) {
        console.error("Lỗi khi sửa văn bản Tiếng Việt:", error);
        return text; // Trả về văn bản gốc nếu có lỗi
    }
}


/**
 * Tạo các cặp Q&A từ một đoạn văn bản đã được làm sạch.
 * @param context - Đoạn văn bản (context) để tạo Q&A.
 * @returns Một mảng các đối tượng câu hỏi-câu trả lời.
 */
async function generateQAPairs(context: string): Promise<{ question: string; answer: string }[]> {
  const systemPrompt = `Bạn là một chuyên gia tạo dữ liệu. Dựa vào nội dung được cung cấp trong thẻ <context>, hãy tạo ra tối đa ${MAX_QUESTIONS_PER_CHUNK} cặp câu hỏi và câu trả lời chất lượng cao.

**QUY TẮC BẮT BUỘC:**
1.  Câu hỏi phải có thể được trả lời HOÀN TOÀN bằng thông tin trong <context>.
2.  Câu trả lời phải được rút gọn và trích xuất trực tiếp từ <context>.
3.  Trả về kết quả dưới dạng một đối tượng JSON hợp lệ có cấu trúc: { "qa_pairs": [{ "question": "...", "answer": "..." }] }
4.  Nếu context không đủ thông tin để tạo câu hỏi, trả về một mảng rỗng: { "qa_pairs": [] }`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `<context>${context}</context>` },
      ],
      response_format: { type: "json_object" },
    });

    const resultJson = response.choices[0].message.content;
    if (!resultJson) return [];

    const result = JSON.parse(resultJson);
    return result.qa_pairs || [];
  } catch (error) {
    console.error("Lỗi khi tạo Q&A:", error);
    return [];
  }
}

/* --------------------------------------------------------------------------
 * 4. MAIN EXECUTION
 * -------------------------------------------------------------------------- */
async function main() {
  console.log("🚀 Bắt đầu quá trình tự động tạo Knowledge Base...");
  console.time("⏱️  Tổng thời gian");

  // SỬA LỖI: Sử dụng dynamic import để phá vỡ chu trình phụ thuộc
  const { dbConnect } = await import("@/lib/mongodb");
  const { ModerationItem } = await import("@/models/ModerationItem");

  try {
    await dbConnect();

    // --- Step 1: Đọc và chia nhỏ tài liệu ---
    console.log(`\n📄 Đang đọc tài liệu từ thư mục: '${DATA_FOLDER}'`);
    const reader = new SimpleDirectoryReader();
    const documents = await reader.loadData(DATA_FOLDER);
    if (documents.length === 0) {
      console.log(`⚠️  Không tìm thấy tài liệu nào.`);
      return;
    }
    
    const nodeParser = new NodeParser({ chunkSize: 512, chunkOverlap: 50 });
    const nodes = nodeParser.getNodesFromDocuments(documents);
    console.log(`   - ✅ Tìm thấy ${nodes.length} đoạn văn bản (chunks) để xử lý.`);

    // --- Step 2: Xử lý các chunk theo từng lô ---
    let totalGenerated = 0;
    for (let i = 0; i < nodes.length; i += CONCURRENCY_LIMIT) {
      const batch = nodes.slice(i, i + CONCURRENCY_LIMIT);
      console.log(`\n🧠 Đang xử lý lô ${Math.floor(i / CONCURRENCY_LIMIT) + 1} (chunks từ ${i + 1} đến ${i + batch.length})...`);

      const promises = batch.map(async (node) => {
        const originalText = node.getText();
        
        // BƯỚC MỚI: Sửa lỗi tiếng Việt trước khi tạo Q&A
        const cleanedText = await cleanVietnameseText(originalText);
        
        const qaPairs = await generateQAPairs(cleanedText);

        if (qaPairs.length > 0) {
          for (const pair of qaPairs) {
            const existing = await ModerationItem.findOne({ prompt: pair.question });
            if (!existing) {
              await ModerationItem.create({
                prompt: pair.question,
                response: pair.answer,
                status: 'pending',
              });
            }
          }
        }
        return qaPairs.length;
      });

      const results = await Promise.allSettled(promises);
      
      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          console.log(`   - Chunk ${i + index + 1}: Tạo thành công ${result.value} cặp Q&A.`);
          totalGenerated += result.value;
        } else {
          console.error(`   - Chunk ${i + index + 1}: Xử lý thất bại. Lỗi:`, result.reason);
        }
      });
    }

    console.log(`\n\n🎉 Hoàn tất!`);
    console.log(`   - Tổng cộng đã tạo được ${totalGenerated} cặp Q&A mới.`);
    console.log('   - Vui lòng truy cập trang "Kiểm duyệt Q&A" trong khu vực admin để xem và duyệt.');

  } catch (e) {
    console.error("💥 Lỗi nghiêm trọng:", e);
    process.exit(1);
  } finally {
    console.timeEnd("⏱️  Tổng thời gian");
  }
}

/* -------------------------------------------------------------------------- */
main();
