// app/api/chat/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

import OpenAI from "openai";
import { DataAPIClient } from "@datastax/astra-db-ts";
import {
  createChat,
  appendMessage,
  updateChatTitle,
} from "@/lib/chatService";

export const runtime = "nodejs";

/* ─── ENV ───────────────────────────── */
const {
  OPENAI_API_KEY,
  OPENAI_CHAT_MODEL = "gpt-4o-mini",
  OPENAI_FALLBACK_MODEL = "gpt-4o",
  ASTRA_DB_API_ENDPOINT,
  ASTRA_DB_APPLICATION_TOKEN,
  ASTRA_DB_NAMESPACE,
  ASTRA_DB_COLLECTION,
  EMBEDDING_MODEL = "text-embedding-3-small",
} = process.env;

if (!OPENAI_API_KEY) throw new Error("OPENAI_API_KEY missing");
if (!ASTRA_DB_API_ENDPOINT) throw new Error("ASTRA_DB_API_ENDPOINT missing");

const openai = new OpenAI({ apiKey: OPENAI_API_KEY });
const astra = new DataAPIClient(ASTRA_DB_APPLICATION_TOKEN!);
const vectorColl = astra
  .db(ASTRA_DB_API_ENDPOINT!, { namespace: ASTRA_DB_NAMESPACE })
  .collection(ASTRA_DB_COLLECTION!);

/* ─── Helpers ───────────────────────── */
async function createEmbedding(text: string) {
  const { data } = await openai.embeddings.create({
    model: EMBEDDING_MODEL,
    input: text,
    encoding_format: "float",
  });
  return data[0].embedding;
}

async function runChat(model: string, messages: any[]) {
  return openai.chat.completions.create({
    model,
    messages,
    stream: false,
    max_tokens: 4096,
  });
}

/* ─── POST /api/chat ────────────────── */
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const userId = session.user.id;

    const { messages, chatId: incomingId } = await req.json();
    if (!Array.isArray(messages) || messages.length === 0)
      return NextResponse.json({ error: "messages array required" }, { status: 400 });

    const latest = messages.at(-1).content as string;

    let chatId = incomingId;
    if (!chatId) {
      const chat = await createChat(userId);
      chatId = chat._id.toString();
      const title = latest.length > 30 ? latest.slice(0, 30).trimEnd() + "…" : latest;
      await updateChatTitle(chatId, userId, title);
    }

    await appendMessage(chatId, userId, "user", latest);

    // Vector search
    let docContext = "";
    let topChunks: any[] = [];
    try {
      const emb = await createEmbedding(latest);
      const docs = await vectorColl
        .find(null, { sort: { $vector: emb }, limit: 12 })
        .toArray();

      const uniqueSources = new Map<string, any>();
      for (const d of docs) {
        if (!uniqueSources.has(d.source)) {
          uniqueSources.set(d.source, {
            id: String(d._id),
            text: d.text,
            source: d.source,
          });
        }
      }
      topChunks = Array.from(uniqueSources.values()).slice(0, 8);

      docContext = topChunks.map((d, i) => `[${i + 1}] ${d.text}`).join("\n---\n");
    } catch (e) {
      console.error("Vector search error:", e);
    }

    const systemMsg = {
      role: "system" as const,
      content: `
Bạn là **ZigAI** – trợ lý dạy Python cho học sinh **THPT Việt Nam**.

🎯 Mỗi câu trả lời cần:
1. **Giải thích khái niệm** dễ hiểu, ví dụ gần gũi, tránh jargon.
2. **Code Python** ngắn (≤ 20 dòng), có chú thích tiếng Việt.
3. **Tóm tắt nhanh** (≤ 3 câu).
4. **Bài tập luyện tập**: 1 cơ bản + 1 vận dụng. **Không giải bài**, chỉ gợi ý cách làm.
5. **Câu hỏi tự kiểm tra** (Yes/No hoặc multiple choice A/B/C/D).

📌 Định dạng Markdown. Code đặt trong \`\`\`python. KHÔNG chèn hình ảnh.

--- NGUỒN
${docContext}
---`
    };

    // Gọi GPT
    let chatRes;
    try {
      chatRes = await runChat(OPENAI_CHAT_MODEL, [systemMsg, ...messages]);
    } catch (err) {
      console.warn("Model error – fallback:", err);
      chatRes = await runChat(OPENAI_FALLBACK_MODEL, [systemMsg, ...messages]);
    }

    const answer = chatRes.choices[0]?.message?.content ?? "(Không có câu trả lời)";

    // Trích citations [^n]
    const usedCitations = new Set<number>();
    for (const match of answer.matchAll(/\[\^(\d+)\]/g)) {
      const n = parseInt(match[1], 10);
      if (!isNaN(n)) usedCitations.add(n);
    }

    const sources = [...usedCitations]
      .filter((n) => n >= 1 && n <= topChunks.length)
      .map((n) => {
        const chunk = topChunks[n - 1];
        return {
          id: chunk.id,
          source: chunk.source,
          snippet: chunk.text.slice(0, 160) + "…"
        };
      });

    const fullAnswer = `${answer}`;

    await appendMessage(chatId, userId, "assistant", fullAnswer);
    return NextResponse.json({ answer: fullAnswer, chatId, sources });
  } catch (err) {
    console.error("Chat route error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}