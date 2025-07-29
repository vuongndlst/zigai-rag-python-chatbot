import { NextResponse } from "next/server";
import { promises as fsPromises } from "fs";
import { mkdir } from "fs/promises";
import path from "path";

import { requireAdmin } from "@/lib/requireAdmin";
import { dbConnect } from "@/lib/mongodb";
import SeedLog from "@/models/SeedLog";
import Source from "@/models/Source";

// LlamaIndex TS
import { Document, LlamaCloudIndex } from "llamaindex";
import { PDFReader } from "@llamaindex/readers/pdf";

export const dynamic = "force-dynamic";

const DOCS_FOLDER = path.join(process.cwd(), "docs");

export async function POST(req: Request) {
  // 1) Auth + DB
  try {
    await requireAdmin();
    await dbConnect();
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Authentication failed";
    return NextResponse.json({ error: msg }, { status: 401 });
  }

  // 2) Lấy file
  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) {
    return NextResponse.json({ error: "Không có file nào được cung cấp." }, { status: 400 });
  }

  // Tạo Source
  const source = await Source.create({
    type: "file",
    path: file.name,
    originalName: file.name,
    status: "processing",
  });

  // Luôn sanitize tên file để tránh absolute path
  const safeName = path.basename(file.name);
  const filePath = path.join(DOCS_FOLDER, safeName);

  try {
    await mkdir(DOCS_FOLDER, { recursive: true });
    const buffer = Buffer.from(await file.arrayBuffer());
    await fsPromises.writeFile(filePath, buffer);

    // 3) Stream log
    const stream = new ReadableStream({
      async start(controller) {
        const enc = new TextEncoder();
        const send = (s: string) => controller.enqueue(enc.encode(s));

        const t0 = Date.now();
        let chunkCount = 0;

        try {
          send(`[INFO] Bắt đầu xử lý: ${safeName}\n`);

          // Env check
          const {
            GEMINI_API_KEY,
            LLAMA_CLOUD_API_KEY,
            LLAMA_CLOUD_INDEX_NAME,
            LLAMA_CLOUD_PROJECT_NAME,
            LLAMA_CLOUD_ORGANIZATION_ID,
          } = process.env;

          if (
            !GEMINI_API_KEY ||
            !LLAMA_CLOUD_API_KEY ||
            !LLAMA_CLOUD_INDEX_NAME ||
            !LLAMA_CLOUD_PROJECT_NAME ||
            !LLAMA_CLOUD_ORGANIZATION_ID
          ) {
            throw new Error(
              "Thiếu biến môi trường: GEMINI_API_KEY, LLAMA_CLOUD_API_KEY, LLAMA_CLOUD_INDEX_NAME, LLAMA_CLOUD_PROJECT_NAME, LLAMA_CLOUD_ORGANIZATION_ID."
            );
          }

          // Đọc PDF bằng reader chính thức của LlamaIndex (tránh lỗi pdf-parse)
          send("📄 Đang đọc PDF bằng PDFReader...\n");
          const reader = new PDFReader();
          const docs = await reader.loadData(filePath); // trả về Document[]
          // Có thể gắn metadata nguồn
          const documents: Document[] = docs.map((d) =>
            new Document({
              text: d.text,
              metadata: { sourceId: String(source._id), filename: safeName },
            })
          );
          send(`   - ✅ Đã load ${documents.length} document.\n`);

          // Kết nối / tạo Index trên LlamaCloud và nạp tài liệu
          send(`🔗 Kết nối LlamaCloud Index '${LLAMA_CLOUD_INDEX_NAME}'...\n`);

          const index = await LlamaCloudIndex.fromDocuments(
            {
              documents,
              name: LLAMA_CLOUD_INDEX_NAME,
              projectName: LLAMA_CLOUD_PROJECT_NAME,
              organizationId: LLAMA_CLOUD_ORGANIZATION_ID,
              apiKey: LLAMA_CLOUD_API_KEY,
            },
            {
              // Cloud sẽ tự transform (chunk) + embed bằng Gemini
              embedding: {
                provider: "gemini",
                apiKey: GEMINI_API_KEY,
                model: "models/embedding-001",
              },
              transform: {
                mode: "auto",
                chunk_size: 512,
                chunk_overlap: 50,
              },
            }
          );

          // Nếu cần thêm log số chunk, có thể truy vấn qua retriever config sau khi index xong.
          // Ở đây đặt tạm bằng số node ước lượng = documents.length (Cloud sẽ chunk thêm).
          chunkCount = documents.length;
          send("   - ✅ Tải lên & index hoàn tất.\n");

          const durationMs = Date.now() - t0;
          await SeedLog.create({
            sourceId: source._id,
            type: "file",
            chunkCount,
            durationMs,
            success: true,
            error: null,
          });
          source.status = "done";
          await source.save();

          send("🎉 Hoàn tất xử lý thành công!\n");
        } catch (e: any) {
          const msg = e?.message ?? "Lỗi không xác định";
          console.error("Lỗi chi tiết trong quá trình xử lý:", e);
          send(`💥 Xử lý thất bại: ${msg}\n`);

          const durationMs = Date.now() - t0;
          await SeedLog.create({
            sourceId: source._id,
            type: "file",
            chunkCount,
            durationMs,
            success: false,
            error: msg,
          });
          source.status = "error";
          await source.save();
        } finally {
          try {
            await fsPromises.unlink(filePath);
            send(`[INFO] Đã xóa file tạm: ${safeName}\n`);
          } catch {
            send(`[LỖI] Không thể xóa file tạm: ${safeName}\n`);
          }
          controller.close();
        }
      },
    });

    return new Response(stream, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
  } catch (err) {
    source.status = "error";
    await source.save();
    console.error("💥 Lỗi nghiêm trọng trong API process-pdf:", err);
    const msg = err instanceof Error ? err.message : "Internal Server Error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
