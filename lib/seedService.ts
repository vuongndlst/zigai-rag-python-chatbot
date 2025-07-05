/* -------------------------------------------------------------------------- */
/* 1. DEPENDENCIES                                                            */
/* -------------------------------------------------------------------------- */
import { DataAPIClient } from "@datastax/astra-db-ts";
import { PuppeteerWebBaseLoader } from "@langchain/community/document_loaders/web/puppeteer";
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import OpenAI from "openai";
import mammoth from "mammoth";

import fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "crypto";

import SeedLog from "@/models/SeedLog";            // 👈 NEW

/* -------------------------------------------------------------------------- */
/* 2. ENV & CLIENTS                                                           */
/* -------------------------------------------------------------------------- */
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

const astra = new DataAPIClient(process.env.ASTRA_DB_APPLICATION_TOKEN!);
const db = astra.db(process.env.ASTRA_DB_API_ENDPOINT!, {
  namespace: process.env.ASTRA_DB_NAMESPACE,
});
const collName = process.env.ASTRA_DB_COLLECTION!;

/* -------------------------------------------------------------------------- */
/* 3. ENSURE COLLECTION                                                       */
/* -------------------------------------------------------------------------- */
await (async () => {
  try {
    await db.createCollection(collName, {
      vector: { dimension: 1536, metric: "dot_product" },
    });
    console.log("✅ [Astra] collection created");
  } catch (e: any) {
    if (/already exists/i.test(e.message)) console.log("ℹ️  [Astra] collection existed");
    else throw e;
  }
})();
const vectorColl = db.collection(collName);

/* -------------------------------------------------------------------------- */
/* 4. SHARED HELPERS                                                          */
/* -------------------------------------------------------------------------- */
const splitter = new RecursiveCharacterTextSplitter({ chunkSize: 512, chunkOverlap: 100 });
const sha256 = (t: string) => createHash("sha256").update(t).digest("hex");

/* ---- Embedding returns vector + tokens ---------------------------------- */
async function embed(text: string) {
  const r = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: text,
    encoding_format: "float",
  });
  return { vec: r.data[0].embedding, tokens: r.usage?.total_tokens ?? 0 };
}

/* ---- Upsert ------------------------------------------------------------- */
async function upsertChunk(chunk: string, vec: number[], srcName: string) {
  const hash = sha256(chunk);
  await vectorColl.updateOne(
    { hash },
    {
      $setOnInsert: {
        hash,
        text: chunk,
        $vector: vec,
        source: srcName,
        createdAt: new Date(),
      },
    },
    { upsert: true }
  );
}

/* ---- Extract text (url / pdf / docx / txt) ------------------------------ */
async function scrapeUrl(url: string) {
  const loader = new PuppeteerWebBaseLoader(url, {
    launchOptions: { headless: true },
    gotoOptions: { waitUntil: "domcontentloaded", timeout: 15000 },
    evaluate: async (page, browser) => {
      const html = await page.evaluate(() => document.body.innerHTML);
      await browser.close();
      return html;
    },
  });
  const html = await loader.scrape();
  return html?.replace(/<[^>]*>?/gm, "") || "";
}

async function readPdf(p: string) {
  const loader = new PDFLoader(p, { splitPages: false });
  const [doc] = await loader.load();
  return doc.pageContent;
}
async function readDocx(p: string) {
  return (await mammoth.extractRawText({ buffer: await fs.readFile(p) })).value;
}

async function extractText(src: any) {
  if (src.type === "url") return { raw: await scrapeUrl(src.path), srcName: src.path };

  const full = path.join(process.cwd(), "docs", src.path);
  const ext = path.extname(full).toLowerCase();

  if (ext === ".pdf") return { raw: await readPdf(full), srcName: full };
  if (ext === ".docx") return { raw: await readDocx(full), srcName: full };

  return { raw: (await fs.readFile(full)).toString("utf8"), srcName: full };
}

/* -------------------------------------------------------------------------- */
/* 5. SEED ONE SOURCE                                                         */
/* -------------------------------------------------------------------------- */
export async function seedOne(
  src: any,
  send?: (ev: any) => void
) {
  const started = Date.now();
  let tokenSum = 0;

  try {
    const { raw, srcName } = await extractText(src);
    const chunks = await splitter.splitText(raw);

    send?.({ type: "start", id: src._id, total: chunks.length });

    for (let i = 0; i < chunks.length; i++) {
      const { vec, tokens } = await embed(chunks[i]);
      tokenSum += tokens;
      await upsertChunk(chunks[i], vec, srcName);

      send?.({
        type: "progress",
        id: src._id,
        pct: Math.round(((i + 1) / chunks.length) * 100),
      });
    }

    /* update Source */
    Object.assign(src, {
      status: "seeded",
      chunkCount: chunks.length,
      updatedAt: new Date(),
    });
    await src.save();

    /* log */
    await SeedLog.create({
      sourceId: src._id,
      type: src.type,
      chunkCount: chunks.length,
      tokensUsed: tokenSum,
      durationMs: Date.now() - started,
      success: true,
    });

    send?.({ type: "done", id: src._id });
    return { ok: true, id: src._id, chunks: chunks.length };
  } catch (err: any) {
    /* error path */
    send?.({ type: "error", id: src._id, message: err.message });

    Object.assign(src, { status: "error", error: err.message, updatedAt: new Date() });
    await src.save();

    await SeedLog.create({
      sourceId: src._id,
      type: src.type,
      success: false,
      error: err.message,
      tokensUsed: tokenSum,
      durationMs: Date.now() - started,
    });

    return { ok: false, id: src._id, error: err.message };
  }
}

/* -------------------------------------------------------------------------- */
/* 6. SEED MULTIPLE WRAPPER                                                   */
/* -------------------------------------------------------------------------- */
export async function seedSources(arr: any[]) {
  const out = [];
  for (const s of arr) out.push(await seedOne(s));
  return out;
}
