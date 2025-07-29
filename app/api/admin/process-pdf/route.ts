import { NextResponse } from 'next/server';
// SỬA LỖI: Import thêm promises từ fs để đọc file
import { writeFile, mkdir, unlink, promises as fsPromises } from 'fs/promises';
import * as path from 'path';
import { requireAdmin } from '@/lib/requireAdmin';
import { dbConnect } from '@/lib/mongodb';
import SeedLog from '@/models/SeedLog';
import Source from '@/models/Source';

// SỬA LỖI: Import Document để tạo đối tượng tài liệu thủ công
import { Settings, NodeParser, Document } from "@llamaindex/core/global";
// SỬA LỖI: Bỏ SimpleDirectoryReader và thay bằng pdf-parse
import pdfParse from "pdf-parse";
import { LlamaCloudIndex } from "@llamaindex/cloud";
import { GeminiEmbedding } from "@llamaindex/google";
import "dotenv/config";

// Thư mục để lưu file PDF tạm thời.
const DOCS_FOLDER = path.join(process.cwd(), 'docs');

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
    // 1. Xác thực quyền Admin và kết nối DB
    try {
        await requireAdmin();
        await dbConnect();
    } catch (authError) {
        const errorMessage = authError instanceof Error ? authError.message : "Authentication failed";
        return NextResponse.json({ error: errorMessage }, { status: 401 });
    }

    // 2. Xử lý file tải lên
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
        return NextResponse.json({ error: "Không có file nào được cung cấp." }, { status: 400 });
    }

    // Tạo một bản ghi Source để lấy sourceId
    const source = await Source.create({
        type: 'file',
        path: file.name,
        originalName: file.name,
        status: 'processing',
    });

    const filePath = path.join(DOCS_FOLDER, file.name);

    try {
        // Đảm bảo thư mục `./docs` tồn tại và ghi file
        await mkdir(DOCS_FOLDER, { recursive: true });
        const buffer = Buffer.from(await file.arrayBuffer());
        await writeFile(filePath, buffer);

        // 3. Thiết lập stream để gửi log về client theo thời gian thực
        const stream = new ReadableStream({
            async start(controller) {
                const encoder = new TextEncoder();
                const startTime = Date.now();
                let isClosed = false;
                let chunkCount = 0;

                const sendToClient = (message: string) => {
                    if (isClosed) return;
                    controller.enqueue(encoder.encode(message));
                };
                
                try {
                    sendToClient(`[INFO] Bắt đầu quá trình xử lý file: ${file.name}\n`);

                    // --- LOGIC XỬ LÝ TRỰC TIẾP ---

                    // a. Cấu hình LlamaIndex Settings với Gemini
                    sendToClient("⚙️  Đang cấu hình LlamaIndex với Gemini Embedding...\n");
                    
                    Settings.embedModel = new GeminiEmbedding({
                        model: "models/embedding-001",
                        apiKey: process.env.GEMINI_API_KEY,
                    });

                    Settings.llm = null; // Không cần LLM cho việc indexing
                    Settings.chunkSize = 512;
                    Settings.chunkOverlap = 50;
                    sendToClient("   - ✅ Cấu hình hoàn tất.\n");

                    // b. Đọc và phân tích file PDF vừa tải lên
                    sendToClient(`📄 Đang đọc và phân tích tài liệu: ${file.name}...\n`);
                    // SỬA LỖI: Đọc và phân tích PDF thủ công để tránh lỗi import
                    const dataBuffer = await fsPromises.readFile(filePath);
                    const pdfData = await pdfParse(dataBuffer);
                    const documents = [new Document({ text: pdfData.text, id_: filePath })];
                    sendToClient(`   - ✅ Đã đọc và phân tích thành công 1 tài liệu.\n`);


                    // c. Chia tài liệu thành các chunk để đếm
                    const nodeParser = new NodeParser({
                        chunkSize: Settings.chunkSize,
                        chunkOverlap: Settings.chunkOverlap,
                    });
                    const nodes = nodeParser.getNodesFromDocuments(documents);
                    chunkCount = nodes.length;
                    sendToClient(`   - ℹ️  Tài liệu được chia thành ${chunkCount} chunks.\n`);

                    // d. Kết nối đến LlamaCloud Index
                    sendToClient(`🔗 Đang kết nối đến LlamaCloud Index: '${process.env.LLAMA_CLOUD_INDEX_NAME}'...\n`);
                    const llamaCloudIndex = new LlamaCloudIndex({
                        name: process.env.LLAMA_CLOUD_INDEX_NAME!,
                        apiKey: process.env.LLAMA_CLOUD_API_KEY,
                    });
                    sendToClient("   - ✅ Kết nối thành công.\n");

                    // e. Tải dữ liệu lên Index
                    sendToClient("🚀 Đang tải các chunk lên LlamaCloud...\n");
                    await llamaCloudIndex.insertNodes(nodes);
                    sendToClient("   - ✅ Tải lên hoàn tất.\n");

                    // Ghi nhận thành công
                    const durationMs = Date.now() - startTime;
                    await SeedLog.create({
                        sourceId: source._id, type: 'file', chunkCount,
                        durationMs, success: true, error: null,
                    });
                    source.status = 'done';
                    await source.save();
                    sendToClient(`🎉 Hoàn tất xử lý thành công!\n`);

                } catch (processingError: any) {
                    // Xử lý lỗi nếu có vấn đề trong quá trình
                    const errorMessage = processingError.message || "Lỗi không xác định";
                    sendToClient(`💥 Xử lý thất bại: ${errorMessage}\n`);
                    const durationMs = Date.now() - startTime;
                    await SeedLog.create({
                        sourceId: source._id, type: 'file', chunkCount,
                        durationMs, success: false, error: errorMessage,
                    });
                    source.status = 'error';
                    await source.save();
                } finally {
                    // Dọn dẹp file tạm bất kể thành công hay thất bại
                    try {
                        await unlink(filePath);
                        sendToClient(`[INFO] Đã xóa file tạm: ${file.name}\n`);
                    } catch (cleanupError) {
                        sendToClient(`[LỖI] Không thể xóa file tạm.\n`);
                    }
                    isClosed = true;
                    controller.close();
                }
            },
        });

        return new Response(stream, {
            headers: { 'Content-Type': 'text/plain; charset=utf-8' },
        });

    } catch (error) {
        // Xử lý lỗi nếu có vấn đề trước khi stream bắt đầu (ví dụ: upload lỗi)
        source.status = 'error';
        await source.save();
        console.error("💥 Lỗi nghiêm trọng trong API process-pdf:", error);
        const errorMessage = error instanceof Error ? error.message : "Internal Server Error";
        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
}
