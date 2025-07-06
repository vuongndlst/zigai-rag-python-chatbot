/* -------------------------------------------------------------------------- */
/*                               1. DEPENDENCIES                              */
/* -------------------------------------------------------------------------- */
import { DataAPIClient } from "@datastax/astra-db-ts";
import { PuppeteerWebBaseLoader } from "@langchain/community/document_loaders/web/puppeteer";
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import OpenAI from "openai";
import * as fs from "fs";
import * as path from "path";
import { createHash } from "crypto";
import "dotenv/config";

/* -------------------------------------------------------------------------- */
/*                               2. ENV CONFIG                                */
/* -------------------------------------------------------------------------- */
const {
  ASTRA_DB_API_ENDPOINT,
  ASTRA_DB_APPLICATION_TOKEN,
  ASTRA_DB_NAMESPACE,
  ASTRA_DB_COLLECTION,
  OPENAI_API_KEY,
  DATA_FOLDER = "./docs"           // thư mục PDF
} = process.env;

if (
  !ASTRA_DB_API_ENDPOINT ||
  !ASTRA_DB_APPLICATION_TOKEN ||
  !ASTRA_DB_NAMESPACE ||
  !ASTRA_DB_COLLECTION ||
  !OPENAI_API_KEY
)
  throw new Error("❌ Thiếu biến môi trường cấu hình");

const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

/* -------------------------------------------------------------------------- */
/*                         3. NGUỒN WEBSITE & PDF                             */
/* -------------------------------------------------------------------------- */
/** Nguồn quốc tế uy tín */
const pythonGlobalUrls: string[] = [
  // "https://www.python.org/",
  // "https://docs.python.org/3/",
];

/** Nguồn tiếng Việt phổ biến với học sinh THPT */
const pythonVnUrls: string[] = [
  "https://quantrimang.com/hoc/hon-100-bai-tap-python-co-loi-giai-code-mau-142456",
  "https://mr-school.xyz/grade-10/topic-F/getting-started-with-python/",
  "https://mr-school.xyz/grade-10/topic-F/conditional-statement-if/",
  "https://mr-school.xyz/grade-10/topic-F/for-loop/",
  "https://mr-school.xyz/grade-10/topic-F/while-loop/",
  "https://mr-school.xyz/grade-10/topic-F/list/",
  "https://mr-school.xyz/grade-10/topic-F/list-iterating-processing/",
  "https://mr-school.xyz/grade-10/topic-F/list-manipulating-functions/",
  "https://mr-school.xyz/grade-10/topic-F/string/",
  "https://mr-school.xyz/grade-11/topic-F2/array-1d/",
  "https://mr-school.xyz/grade-11/topic-F2/array-2d/",
  "https://mr-school.xyz/grade-11/topic-F2/linked-list/",
  "https://mr-school.xyz/grade-11/topic-F2/linear-search/",
  "https://mr-school.xyz/grade-11/topic-F2/binary-search/",
  "https://mr-school.xyz/grade-11/topic-F2/selection-sort/",
  "https://mr-school.xyz/grade-11/topic-F2/insertion-sort/",
  "https://mr-school.xyz/grade-11/topic-F2/bubble-sort/",
  "https://mr-school.xyz/grade-11/topic-F2/exchange-sort/",
  "https://mr-school.xyz/grade-11/topic-F2/algorithmic-complexity/",
  "https://mr-school.xyz/grade-11/topic-F2/programming-module/",
  "https://mr-school.xyz/special-topics/recursion/an-overview-of-recursion/",
  "https://mr-school.xyz/special-topics/recursion/factorial/",
  "https://mr-school.xyz/special-topics/recursion/fibonacci/",
  "https://mr-school.xyz/special-topics/recursion/hanoi-tower/",
  "https://mr-school.xyz/special-topics/divide-and-conquer/an-overview-of-divide-and-conquer/",
  "https://mr-school.xyz/special-topics/divide-and-conquer/merge-sort/",
  "https://mr-school.xyz/special-topics/divide-and-conquer/quick-sort/",
  "https://mr-school.xyz/special-topics/back-tracking/an-overview-of-back-tracking/",
  "https://mr-school.xyz/special-topics/back-tracking/binary-string/",
  "https://mr-school.xyz/special-topics/queue/an-overview-of-queue/",
  "https://mr-school.xyz/special-topics/queue/customer-service-simulation/",
  "https://mr-school.xyz/special-topics/stack/an-overview-of-stack/",
  "https://mr-school.xyz/special-topics/stack/balanced-parentheses-check/",
  "https://mr-school.xyz/special-topics/graph/an-overview-of-graph/",
  "https://mr-school.xyz/special-topics/graph/graph-representing/",
  "https://mr-school.xyz/special-topics/graph/bfs/",
  "https://mr-school.xyz/special-topics/graph/dfs/",
  "https://mr-school.xyz/special-topics/tree/an-overview-of-tree/",

];

const allWebUrls = [...pythonGlobalUrls, ...pythonVnUrls];

/** Lấy toàn bộ PDF trong DATA_FOLDER (đệ quy) */
const getAllPdfPaths = (dir: string): string[] =>
  fs.readdirSync(dir).flatMap((f) => {
    const full = path.join(dir, f);
    return fs.statSync(full).isDirectory()
      ? getAllPdfPaths(full)
      : f.toLowerCase().endsWith(".pdf")
      ? [full]
      : [];
  });

/* -------------------------------------------------------------------------- */
/*                         4. ASTRA DB INITIALIZATION                         */
/* -------------------------------------------------------------------------- */
const client = new DataAPIClient(ASTRA_DB_APPLICATION_TOKEN);
const db = client.db(ASTRA_DB_API_ENDPOINT, { namespace: ASTRA_DB_NAMESPACE });

/** Tạo collection nếu chưa có – idempotent */
async function ensureCollection() {
  try {
    await db.createCollection(ASTRA_DB_COLLECTION, {
      vector: { dimension: 1536, metric: "dot_product" }
    });
    console.log("✅ Collection created");
  } catch (err: any) {
    if (
      err?.name === "CollectionAlreadyExistsError" ||
      /already exists/i.test(String(err?.message))
    ) {
      console.log("ℹ️  Collection đã tồn tại – tiếp tục ghi thêm dữ liệu");
    } else {
      throw err;
    }
  }
}

/* -------------------------------------------------------------------------- */
/*                          5. TEXT SPLITTER & HELPERS                        */
/* -------------------------------------------------------------------------- */
const splitter = new RecursiveCharacterTextSplitter({
  chunkSize: 512,
  chunkOverlap: 100
});

const hashText = (txt: string) => createHash("sha256").update(txt).digest("hex");

async function upsertChunk(
  collection: any,
  chunk: string,
  vector: number[],
  source: string
) {
  const hash = hashText(chunk);
  await collection.updateOne(
    { hash },
    {
      $setOnInsert: {
        $vector: vector,
        text: chunk,
        source,
        hash,
        createdAt: new Date()
      }
    },
    { upsert: true }
  );
}

/* -------------------------------------------------------------------------- */
/*                             6. LOADER FUNCTIONS                            */
/* -------------------------------------------------------------------------- */
async function scrapePage(url: string): Promise<string> {
  const loader = new PuppeteerWebBaseLoader(url, {
    launchOptions: { headless: true },
    gotoOptions: { waitUntil: "domcontentloaded", timeout: 15000 },
    evaluate: async (page, browser) => {
      const html = await page.evaluate(() => document.body.innerHTML);
      await browser.close();
      return html;
    }
  });
  const html = await loader.scrape();
  return html?.replace(/<[^>]*>?/gm, "") || "";
}

async function loadWebSources(collection: any) {
  for (const url of allWebUrls) {
    try {
      console.log(`🌐 Crawling ${url}`);
      const raw = await scrapePage(url);
      if (!raw) {
        console.warn(`⚠️  Bỏ qua (rỗng) → ${url}`);
        continue;
      }
      const chunks = await splitter.splitText(raw);
      if (chunks.length === 0) {
        console.warn(`⚠️  Không tách được đoạn → ${url}`);
        continue;
      }
      for (const chunk of chunks) {
        const { data } = await openai.embeddings.create({
          model: "text-embedding-3-small",
          input: chunk,
          encoding_format: "float"
        });
        await upsertChunk(collection, chunk, data[0].embedding, url);
      }
      console.log(`✅ Indexed ${url}`);
    } catch (err) {
      console.warn(`❌ Lỗi, bỏ qua → ${url}:`, (err as Error).message);
    }
  }
}

async function loadPdfFile(filePath: string, collection: any) {
  try {
    console.log(`📄 Đang đọc ${filePath}`);
    const loader = new PDFLoader(filePath, { splitPages: false });
    const [doc] = await loader.load();
    const chunks = await splitter.splitText(doc.pageContent);
    for (const chunk of chunks) {
      const { data } = await openai.embeddings.create({
        model: "text-embedding-3-small",
        input: chunk,
        encoding_format: "float"
      });
      await upsertChunk(collection, chunk, data[0].embedding, filePath);
    }
    console.log(`✅ Indexed PDF: ${filePath}`);
  } catch (err) {
    console.warn(`❌ Lỗi PDF, bỏ qua → ${filePath}:`, (err as Error).message);
  }
}

async function loadPdfDirectory(collection: any) {
  const pdfPaths = getAllPdfPaths(DATA_FOLDER);
  if (pdfPaths.length === 0) {
    console.log("⚠️  Không tìm thấy file PDF nào trong thư mục", DATA_FOLDER);
    return;
  }
  for (const pdf of pdfPaths) {
    await loadPdfFile(pdf, collection);
  }
}

/* -------------------------------------------------------------------------- */
/*                               7. MAIN FLOW                                 */
/* -------------------------------------------------------------------------- */
(async () => {
  try {
    await ensureCollection();
    const collection = await db.collection(ASTRA_DB_COLLECTION);

    console.time("⏱  Tổng thời gian");

    await loadWebSources(collection);
    await loadPdfDirectory(collection);

    console.timeEnd("⏱  Tổng thời gian");
    console.log("🎉 Hoàn tất nạp dữ liệu!");
  } catch (err) {
    console.error("❌ Lỗi:", err);
  }
})();
