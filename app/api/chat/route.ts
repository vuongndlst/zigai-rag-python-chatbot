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

function isOffTopic(message: string): boolean {
  const forbiddenKeywords = [
    "java", "c++", "c#", "hacking", "an ninh mạng", "thời sự", "tin tức", "deepfake",
    "AI nguy hiểm", "chính trị", "game", "chatbot tán gẫu","tán gẫu", "trò chuyện", "giải trí", "thư giãn", "vui chơi",
    "javascript","php", "ruby", "swift", "go", "kotlin", "typescript",
    "html", "css", "sql", "r", "matlab", "fortran", "assembly", "perl", "lua",
    "bash", "shell", "powershell", "dart", "elixir", "erlang", "haskell", "julia",
    "lisp", "clojure", "scala", "groovy", "objective-c", "visual basic", "delphi",
    "pascal", "f#", "cobol", "ada", "prolog", "smalltalk", "ocaml", "scheme",
    "tcl", "awk", "sed", "vhdl", "verilog", "assembly language", "machine learning", "deep learning", "neural networks",
    "data science", "big data", "cloud computing", "blockchain", "cryptocurrency", "web development", "mobile development",
    "game development", "artificial intelligence", "natural language processing", "computer vision", "augmented reality", "virtual reality",
    "internet of things", "iot", "cybersecurity", "penetration testing", "ethical hacking", "network security", "information security",
    "penetration testing", "ethical hacking", "network security", "information security", "security vulnerabilities", "malware analysis", "reverse engineering", "exploit development",
    "social engineering", "phishing", "ransomware", "denial of service", "ddos", "sql injection", "cross-site scripting", "xss", "buffer overflow",
    "code injection", "remote code execution", "web application security", "mobile application security", "cloud security", "data privacy", "data protection", "compliance",
    "gdpr", "hipaa", "pci dss", "iso 27001", "nist", "cis", "owasp", "security best practices", "incident response", "threat intelligence",
    "vulnerability management", "penetration testing tools", "network monitoring", "firewalls", "intrusion detection", "intrusion prevention", "security information and event management",
    "siem", "endpoint security", "antivirus", "malware protection", "data loss prevention", "encryption", "public key infrastructure", "pki", "digital certificates",
    "ssl", "tls", "https", "vpn", "virtual private network", "proxy", "web proxy", "reverse proxy", "load balancer", "content delivery network",
    "cdn", "web application firewall", "waf", "api security", "application security", "secure coding practices", "secure software development lifecycle", "devsecops", "security automation",
    "security orchestration", "security incident response", "threat hunting", "red teaming", "blue teaming", "purple teaming", "security awareness training", "phishing simulations",
    "social engineering attacks", "cybersecurity certifications", "cissp", "cisa", "ceh", "oscp", "gsec", "security+", "network+", "ccna", "ccnp", "microsoft security",
    "aws security", "azure security", "google cloud security", "kubernetes security", "docker security", "container security", "serverless security", "api security", "microservices security",
    "web security", "mobile security", "cloud security", "data security", "application security", "network security", "endpoint security", "identity and access management", "iam", "zero trust security",
    "security architecture", "security design", "security policies", "security standards", "security frameworks", "security compliance", "security audits", "security assessments", "penetration testing methodologies",
    "vulnerability scanning"
  ];
  const lower = message.toLowerCase();
  return forbiddenKeywords.some(keyword => lower.includes(keyword));
}

function isTooLong(message: string): boolean {
  return message.length > 2000;
}

function isCheatingPrompt(message: string): boolean {
  const cheatHints = ["giải hộ", "làm giùm", "copy bài", "chép lời giải", "đáp án là gì","giải bài này", "giúp làm bài", "giúp giải bài tập", "giúp làm bài tập","giúp làm bài này", "giúp giải bài này", "giúp giải bài tập này", "giúp làm bài tập này"
    , "giúp làm bài tập Python", "giúp giải bài tập Python", "giúp làm bài Python", "giúp giải bài Python", "giúp làm bài tập Python này", "giúp giải bài tập Python này", "giúp làm bài tập Python cho mình", "giúp giải bài tập Python cho mình"
    , "giúp làm bài Python cho mình", "giúp giải bài Python cho mình", "giúp làm bài tập Python cho mình này", "giúp giải bài tập Python cho mình này", "giúp làm bài Python cho mình này", "giúp giải bài Python cho mình này"
    , "giúp làm bài tập Python", "giúp giải bài tập Python", "giúp làm bài Python", "giúp giải bài Python", "giúp làm bài tập Python này", "giúp giải bài tập Python này", "giúp làm bài Python này", "giúp giải bài Python này"
    , "giúp làm bài tập Python cho mình", "giúp giải bài tập Python cho mình", "giúp làm bài Python cho mình", "giúp giải bài Python cho mình", "giúp làm bài tập Python cho mình này", "giúp giải bài tập Python cho mình này", "giúp làm bài Python cho mình này", "giúp giải bài Python cho mình này"
    , "giúp làm bài tập Python", "giúp giải bài tập Python", "giúp làm bài Python", "giúp giải bài Python", "giúp làm bài tập Python này", "giúp giải bài tập Python này", "giúp làm bài Python này", "giúp giải bài Python này"
    , "giúp làm bài tập Python cho mình", "giúp giải bài tập Python cho mình", "giúp làm bài Python cho mình", "giúp giải bài Python cho mình", "giúp làm bài tập Python cho mình này", "giúp giải bài tập Python cho mình này", "giúp làm bài Python cho mình này", "giúp giải bài Python cho mình này"
    , "giúp làm bài tập Python", "giúp giải bài tập Python", "giúp làm bài Python", "giúp giải bài Python", "giúp làm bài tập Python này", "giúp giải bài tập Python này", "giúp làm bài Python này", "giúp giải bài Python này", "giúp làm bài tập Python cho mình", "giúp giải bài tập Python cho mình"
    , "giúp làm bài Python cho mình", "giúp giải bài Python cho mình", "giúp làm bài tập Python cho mình này", "giúp giải bài tập Python cho mình này", "giúp làm bài Python cho mình này", "giúp giải bài Python cho mình này", "giúp làm bài tập Python", "giúp giải bài tập Python"
    , "giúp làm bài Python", "giúp giải bài Python", "giúp làm bài tập Python này", "giúp giải bài tập Python này", "giúp làm bài Python này", "giúp giải bài Python này", "giúp làm bài tập Python cho mình", "giúp giải bài tập Python cho mình"
    , "giúp làm bài Python cho mình", "giúp giải bài Python cho mình", "giúp làm bài tập Python cho mình này", "giúp giải bài tập Python cho mình này", "giúp làm bài Python cho mình này", "giúp giải bài Python cho mình này"
    , "giúp làm bài tập Python", "giúp giải bài tập Python", "giúp làm bài Python", "giúp giải bài Python", "giúp làm bài tập Python này", "giúp giải bài tập Python này", "giúp làm bài Python này", "giúp giải bài Python này"
    , "giúp làm bài tập Python cho mình", "giúp giải bài tập Python cho mình", "giúp làm bài Python cho mình", "giúp giải bài Python cho mình", "giúp làm bài tập Python cho mình này", "giúp giải bài tập Python cho mình này", "giúp làm bài Python cho mình này", "giúp giải bài Python cho mình này"
    , "giúp làm bài tập Python", "giúp giải bài tập Python", "giúp làm bài Python"  ];
  const lower = message.toLowerCase();
  return cheatHints.some(h => lower.includes(h));
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

    if (isTooLong(latest)) {
      return NextResponse.json({ answer: "Câu hỏi quá dài, bạn vui lòng chia nhỏ nội dung để ZigAI hỗ trợ tốt hơn nhé!", chatId: null, sources: [] });
    }

    if (isOffTopic(latest)) {
      const redir = `Xin lỗi, ZigAI hiện chỉ hỗ trợ các vấn đề liên quan đến **Python dành cho học sinh THPT**. Bạn có thể thử hỏi về biến, vòng lặp, hàm, xử lý file,... bằng Python nhé!`;
      return NextResponse.json({ answer: redir, chatId: null, sources: [] });
    }

    if (isCheatingPrompt(latest)) {
      return NextResponse.json({ answer: "ZigAI khuyến khích bạn tự suy nghĩ và rèn luyện. Nếu cần, mình có thể gợi ý cách tiếp cận hoặc giải thích lại kiến thức nhé!", chatId: null, sources: [] });
    }

    let chatId = incomingId;
    if (!chatId) {
      const chat = await createChat(userId);
      chatId = chat._id.toString();
      const title = latest.length > 30 ? latest.slice(0, 30).trimEnd() + "…" : latest;
      await updateChatTitle(chatId, userId, title);
    }

    await appendMessage(chatId, userId, "user", latest);

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
1. **Giải thích khái niệm** dễ hiểu, ví dụ gần gũi, tránh jargon, nếu có từ chuyên ngành thì viết song ngữ.
2. **Code Python** ngắn (≤ 20 dòng), có chú thích tiếng Việt.
3. **Tóm tắt nhanh** (≤ 3 câu).
4. **Bài tập luyện tập**: 1 cơ bản + 1 vận dụng. **Không giải bài**, chỉ gợi ý cách làm.
5. **Câu hỏi tự kiểm tra** (Yes/No hoặc multiple choice A/B/C/D).

📌 Định dạng Markdown. Code đặt trong \`\`\`python. KHÔNG chèn hình ảnh.

🔒 Không trả lời các chủ đề ngoài Python THPT ở Việt Nam. Không giúp làm bài hộ. Không hỗ trợ nội dung quá dài hay không phù hợp.
Nếu gặp bài tập, hãy **hướng dẫn chi tiết cách làm** trước khi đưa gợi ý.

--- NGUỒN
${docContext}
---`
    };

    let chatRes;
    try {
      chatRes = await runChat(OPENAI_CHAT_MODEL, [systemMsg, ...messages]);
    } catch (err) {
      console.warn("Model error – fallback:", err);
      chatRes = await runChat(OPENAI_FALLBACK_MODEL, [systemMsg, ...messages]);
    }

    const answer = chatRes.choices[0]?.message?.content ?? "(Không có câu trả lời)";

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

    await appendMessage(chatId, userId, "assistant", answer);
    return NextResponse.json({ answer, chatId, sources });
  } catch (err) {
    console.error("Chat route error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
