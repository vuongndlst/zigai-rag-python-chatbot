import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { requireAdmin } from '@/lib/requireAdmin';

// Bắt buộc có để Next.js xử lý route này một cách động
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    // 1. Xác thực quyền Admin
    await requireAdmin();

    // 2. Thiết lập stream để gửi log về client theo thời gian thực
    const stream = new ReadableStream({
      start(controller) {
        const encoder = new TextEncoder();
        
        const sendToClient = (message: string) => {
          try {
            controller.enqueue(encoder.encode(message));
          } catch (e) {
            console.error("Lỗi khi gửi dữ liệu stream (stream có thể đã đóng):", e);
          }
        };
        
        sendToClient("[INFO] Bắt đầu thực thi kịch bản test toàn diện...\n\n");

        // 3. Thực thi kịch bản testHallucination.ts
        // Lệnh này được tối ưu để hoạt động ổn định trong môi trường Next.js
        const command = `node --loader ts-node/esm scripts/testHallucination.ts`;
        const child = exec(command, { cwd: process.cwd() });

        child.stdout?.on('data', (data) => {
          sendToClient(data.toString());
        });

        child.stderr?.on('data', (data) => {
          sendToClient(`[LỖI] ${data.toString()}`);
        });

        child.on('error', (err) => {
          sendToClient(`[LỖI HỆ THỐNG] Không thể khởi chạy tiến trình: ${err.message}\n`);
          controller.close();
        });

        child.on('close', (code) => {
          sendToClient(`\n[INFO] Kịch bản kết thúc với mã: ${code}\n`);
          controller.close();
        });
      },
    });

    return new Response(stream, {
      headers: { 
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error) {
    console.error("💥 Lỗi nghiêm trọng trong API run-hallucination-test:", error);
    const errorMessage = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
