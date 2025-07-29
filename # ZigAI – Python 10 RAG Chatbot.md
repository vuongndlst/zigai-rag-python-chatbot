# ZigAI – Python 10 RAG Chatbot  
> Chatbot hỗ trợ học **Python lớp 10** (KNTT – Bài 16 → 32) với **RAG** trên tài liệu thật, kiểm duyệt sư phạm, **cache theo vector**, trang quản trị đầy đủ.

- **Frontend:** Next.js 15 (App Router) · TypeScript · Tailwind · shadcn/ui  
- **Auth:** NextAuth (Credentials)  
- **RAG:** LlamaIndex + **LlamaCloud Managed Index**  
- **DB:** MongoDB (Mongoose) + **Atlas Vector Search**  
- **LLM/Embed:** OpenAI (gpt-4o / gpt-4o-mini, **text-embedding-3-small – 1536 dims**)  
- **Gợi ý kiểm duyệt:** Google Gemini (tùy chọn) 

---

## Mục lục
- [Giới thiệu](#giới-thiệu)
- [Tính năng chính](#tính-năng-chính)
- [Kiến trúc](#kiến-trúc)
- [Công nghệ](#công-nghệ)
- [Bắt đầu nhanh](#bắt-đầu-nhanh)
- [Biến môi trường](#biến-môi-trường)
- [Thiết lập Atlas Vector Search](#thiết-lập-atlas-vector-search)
- [Thiết lập LlamaCloud](#thiết-lập-llamacloud)
- [Scripts tiện ích](#scripts-tiện-ích)
- [Cách sử dụng](#cách-sử-dụng)
- [Bảo mật & vận hành](#bảo-mật--vận-hành)
- [Triển khai Production](#triển-khai-production)
- [Cấu trúc thư mục](#cấu-trúc-thư-mục)
- [Giấy phép](#giấy-phép)

---

## Giới thiệu
ZigAI được thiết kế cho giáo viên và học sinh **Lớp 10** học Python qua sách kết nối tri thức với cuộc sống. Hệ thống kết hợp:
- **Truy hồi từ tài liệu gốc** (PDF/URL) qua **LlamaCloud**,
- **Sinh câu trả lời sư phạm** bằng GPT,
- **Cache câu trả lời đã duyệt** (Knowledge Base) để **giảm chi phí** và đảm bảo **độ nhất quán**.

---

## Tính năng chính
- **RAG chuẩn**: Truy hồi `top_k=8` từ **LlamaCloud Managed Index**, chunk 512/overlap 50.  
- **Cache theo vector (KB)**: Nếu câu hỏi tương tự (cosine ≥ **0.90**) → trả ngay câu trả lời **đã duyệt**.  
- **Moderation có AI gợi ý**: OpenAI + Gemini đề xuất sửa lỗi, phạm vi sư phạm, trùng lặp.  
- **Trending Questions**: Gom nhóm câu hỏi người dùng theo vector để phát hiện chủ đề “nóng”.  
- **Upload PDF & stream log**: Giao diện Admin → tải PDF, theo dõi log xử lý theo thời gian thực, **insert vào LlamaCloud**.  
- **Dashboard KPI**: Người dùng, số chat, cache‑hit, ước lượng token tiết kiệm.  
- **Chống “giải hộ”**: Bộ lọc từ khóa, giới hạn độ dài, hướng dẫn từng bước thay vì chép lời giải.

---

## Kiến trúc

```mermaid
flowchart TD
    A[Browser\nChat UI / Admin] -->|NextAuth| B(App Router APIs)
    B --> C[MongoDB\nMongoose]
    B --> D[LlamaIndex SDK]
    D --> E[LlamaCloud\nManaged Index]
    B --> F[OpenAI\nGPT-4o / 4o-mini]
    B --> G[OpenAI Embeddings\ntext-embedding-3-small (1536)]
    B --> H[Gemini\n(AI suggestion)]
    C <-->|$vectorSearch| B

    subgraph MongoDB
      C1[(Users)]
      C2[(Chats)]
      C3[(ModerationItem\n+ promptEmbedding)]
      C4[(UserQuery\n+ promptEmbedding)]
      C5[(CacheHit)]
      C6[(Source)]
      C7[(SeedLog)]
    end
```

**Luồng hỏi đáp tóm tắt**
1. User hỏi → kiểm tra đăng nhập, lọc nội dung, giới hạn độ dài.  
2. Dịch sang **tiếng Việt** nếu cần → **embed** (1536 dims).  
3. **Cache hit?** Tìm trong `ModerationItem` bằng `$vectorSearch` (cosine ≥ 0.90) → trả câu trả lời đã duyệt.  
4. **Cache miss** → RAG: truy hồi từ **LlamaCloud**, build prompt sư phạm, gọi GPT, trả lời + **sources**.  
5. Ghi log: `Chat`, `UserQuery`, (nếu có) `CacheHit`.

---

## Công nghệ
- **Next.js 15**, **TypeScript**, **Tailwind**, **shadcn/ui**, **Recharts**.  
- **NextAuth (Credentials)** – lưu `role` vào JWT/session.  
- **MongoDB Atlas Search** – `$vectorSearch` cho KB & Trending.  
- **LlamaIndex** + **LlamaCloud** – chỉ mục RAG chính.  
- **OpenAI** – LLM & Embedding. **Gemini** – gợi ý kiểm duyệt.  
- **(Tùy chọn)** Astra DB Vector – ingest/backup.

---

## Bắt đầu nhanh

```bash
# 1) Cài dependencies
npm install

# 2) Tạo tài khoản quản trị
npm run seed:admin

# 3) Chạy dev
npm run dev
# Mở http://localhost:3000
```

**Build & chạy production**
```bash
npm run build
npm start
```

---

## Biến môi trường

Tạo file `.env` (hoặc `.env.local`):

```env
# ===== Core =====
MONGODB_URI=mongodb+srv://<user>:<pass>@<cluster>/<db>?retryWrites=true&w=majority
NEXTAUTH_SECRET=<random_32+>
NEXTAUTH_URL=http://localhost:3000

# ===== OpenAI =====
OPENAI_API_KEY=sk-...
OPENAI_CHAT_MODEL=gpt-4o
OPENAI_FALLBACK_MODEL=gpt-4o-mini
EMBEDDING_MODEL=text-embedding-3-small

# ===== Gemini (tùy chọn – AI suggestion cho Moderation) =====
GEMINI_API_KEY=...

# ===== LlamaCloud (RAG chính) =====
LLAMA_CLOUD_API_KEY=...
LLAMA_CLOUD_ORGANIZATION_ID=...
LLAMA_CLOUD_PROJECT_NAME=zigai
LLAMA_CLOUD_INDEX_NAME=python-10-kntt

# ===== (Tùy chọn) Astra DB Vector =====
ASTRA_DB_API_ENDPOINT=https://<id>-us-east1.apps.astra.datastax.com
ASTRA_DB_APPLICATION_TOKEN=...
ASTRA_DB_NAMESPACE=default_keyspace
ASTRA_DB_COLLECTION=CL_PYTHON

# ===== Seed admin mặc định (có thể đổi) =====
ADMIN_USERNAME=admin
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=admin123
```

> **Lưu ý:** Dự án sử dụng **embeddings 1536 chiều** (text-embedding-3-small). Hãy đảm bảo mọi index vector đều khai báo **numDimensions: 1536** và **similarity: cosine**.

---

## Thiết lập Atlas Vector Search

Tạo **2 search index** trong MongoDB Atlas.

### 1) `prompt_embedding_index` cho **ModerationItem**
- Collection: `moderationitems`
- Mục đích: tìm câu hỏi tương tự trong **KB đã duyệt** để **cache hit**.

**JSON cấu hình:**
```json
{
  "mappings": {
    "dynamic": false,
    "fields": {
      "promptEmbedding": {
        "type": "vector",
        "numDimensions": 1536,
        "similarity": "cosine"
      },
      "prompt": { "type": "string" },
      "status": { "type": "string" }
    }
  }
}
```

### 2) `user_query_embedding_index` cho **UserQuery**
- Collection: `userqueries`
- Mục đích: gom nhóm câu hỏi người dùng → **Trending Questions**.

**JSON cấu hình:**
```json
{
  "mappings": {
    "dynamic": false,
    "fields": {
      "promptEmbedding": {
        "type": "vector",
        "numDimensions": 1536,
        "similarity": "cosine"
      },
      "prompt": { "type": "string" }
    }
  }
}
```

---

## Thiết lập LlamaCloud

1. Tạo **Organization**, **Project** và **Index** trong LlamaCloud.  
2. Lấy các biến:  
   - `LLAMA_CLOUD_ORGANIZATION_ID`  
   - `LLAMA_CLOUD_PROJECT_NAME`  
   - `LLAMA_CLOUD_INDEX_NAME`  
   - `LLAMA_CLOUD_API_KEY`  
3. Vào **Admin → Datasources** của ứng dụng:
   - **Upload PDF**, theo dõi **log stream**,
   - Hệ thống chunk → embed → **insertNodes** lên **LlamaCloud**,
   - Lưu **SeedLog** và cập nhật trạng thái **Source**.

---

## Scripts tiện ích

| Lệnh | Mô tả |
|---|---|
| `npm run seed:admin` | Tạo tài khoản quản trị mặc định (dùng biến ENV ở trên). |
| `npm run seed` | Chạy `scripts/loadDb.ts`: đọc tài liệu, **đề xuất Q&A**, **cross-check OpenAI + Gemini**, ghi vào **ModerationItem(status=pending)** để admin duyệt. |
| _`scripts/generateKB.ts`_ | Tạo Q&A từ thư mục tài liệu; phù hợp để mở rộng KB. |
| _`view-llama-cloud-data.mjs`_ | Đọc dữ liệu từ LlamaCloud Index và xuất CSV. |

> **Astra DB Vector (tùy chọn):** `lib/seedService.ts` chứa pipeline ingest (chunk 512/100, dim=1536, dot_product). Nếu muốn dùng Astra cho **truy hồi runtime**, cần sửa `/api/chat` để lấy ngữ cảnh từ Astra thay vì LlamaCloud.

---

## Cách sử dụng

### Người dùng
- Đăng nhập → nhập câu hỏi (có STT giọng nói `vi-VN`/`en-US`).  
- Nhận câu trả lời có **giải thích từng bước**, ví dụ code, và **nguồn tham chiếu** (tooltip).  

### Quản trị viên
- **/admin/Dashboard:** KPI tổng quan, biểu đồ hoạt động.  
- **/admin/Moderation:** Duyệt Q&A (pending/approved/rejected). Có **AI Suggestion** giúp rà soát.  
- **/admin/Knowledge‑Base:** CRUD, tìm kiếm văn bản & vector, gợi ý **merge/similarity report**.  
- **/admin/Trending‑Questions:** Nhóm câu hỏi tương tự để cập nhật giáo án/KB.  
- **/admin/Datasources:** Upload PDF, xem log xử lý, theo dõi trạng thái nguồn.  
- **/admin/Users:** Quản lý người dùng, đổi role, khóa/mở.  

---

## Bảo mật & vận hành
- **Kiểm soát nội dung:** Bộ lọc từ khóa, chống “giải hộ”. Khuyến nghị bổ sung **OpenAI Moderation API**.  
- **Giới hạn độ dài:** Câu hỏi ≤ 3000 ký tự; có thể thêm giới hạn tổng token.  
- **Tiết kiệm chi phí:** **Cache theo vector** cho các câu lặp; ghi `CacheHit` để ước lượng token tiết kiệm.  
- **Logging:** `SeedLog`, `UserQuery`, `CacheHit` phục vụ giám sát & tối ưu.  
- **Sao lưu chỉ mục:** Duy trì bản sao tài liệu, hoặc ingest song song sang Astra/PGVector.  
- **Email reset:** Hiện in link trong console → nên tích hợp Resend/SES và thêm **rate‑limit**.

---

## Triển khai Production
- **Vercel** hoặc **Node server** tự quản:
  1. Thiết lập đầy đủ biến môi trường.
  2. Tạo Atlas Search index như trên.
  3. Tạo LlamaCloud Project/Index và nạp tài liệu.
  4. `npm run build` → `npm start`.
- Bật **HTTPS**, **CORS** phù hợp nếu tách frontend/backend.
- Cân nhắc **SSE streaming** cho `/api/chat` để giảm độ trễ giao diện.

---

## Cấu trúc thư mục

```
rag-chatbot-python10-final/
├─ app/
│  ├─ (auth)/forgot|login|register|reset
│  ├─ admin/
│  │  ├─ datasources/
│  │  ├─ knowledge-base/
│  │  ├─ moderation/
│  │  ├─ users/
│  │  └─ page.tsx
│  ├─ api/
│  │  ├─ admin/
│  │  │  ├─ add-url/route.ts
│  │  │  ├─ dashboard/route.ts
│  │  │  ├─ knowledge-base/*        # CRUD, stats, similar, similarity-report
│  │  │  ├─ moderation/route.ts
│  │  │  ├─ process-pdf/route.ts    # Upload PDF → LlamaCloud (stream log)
│  │  │  └─ trending-questions/route.ts
│  │  ├─ auth/[...nextauth]/route.ts
│  │  ├─ chat/route.ts              # Chat RAG + cache
│  │  ├─ chat/list/route.ts
│  │  ├─ chat/[id]/route.ts
│  │  ├─ chats/*                    # CRUD chat
│  │  ├─ forgot/route.ts
│  │  ├─ register/route.ts
│  │  └─ reset/route.ts
│  ├─ components/ChatUI.tsx, Bubble.tsx
│  ├─ globals.css, layout.tsx, providers.tsx, page.tsx
├─ components/ui/                   # shadcn/ui
├─ docs/                            # PDF dùng để ingest
├─ lib/
│  ├─ auth.ts, mongodb.ts, db.ts
│  ├─ chatModel.ts, chatService.ts
│  ├─ requireAdmin.ts
│  ├─ astra.ts, seedService.ts      # ingest Astra (tùy chọn)
│  └─ utils.ts
├─ models/
│  ├─ User.ts, Chat.ts
│  ├─ ModerationItem.ts
│  ├─ UserQuery.ts, CacheHit.ts
│  ├─ Source.ts, SeedLog.ts
├─ scripts/
│  ├─ seedAdmin.js
│  ├─ loadDb.ts
│  └─ generateKB.ts
├─ view-llama-cloud-data.mjs
├─ .env.example
├─ package.json
├─ next.config.ts
├─ tailwind.config.js
└─ README.md
```

---

## Giấy phép
Sử dụng theo giấy phép đi kèm repository. Khi triển khai trong nhà trường, nên bổ sung điều khoản sử dụng, chính sách dữ liệu và ghi nhận nguồn tài liệu.