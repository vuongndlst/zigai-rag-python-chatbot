import { NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";
import Source from "@/models/Source";
import { dbConnect } from "@/lib/mongodb";
import { requireAdmin } from "@/lib/requireAdmin";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    /* chỉ admin */
    await requireAdmin();

    /* đọc multipart */
    const form = await req.formData();
    const file = form.get("file") as File | null;
    if (!file)
      return NextResponse.json({ error: "No file" }, { status: 400 });

    const buf = Buffer.from(await file.arrayBuffer());

    /* → “1690485999000_Kế_hoạch_2025.pdf” */
    const safe = file.name.replace(/\s+/g, "_");
    const filename = `${Date.now()}_${safe}`;

    await fs.mkdir("docs", { recursive: true });
    await fs.writeFile(path.join("docs", filename), buf);

    await dbConnect();
    const src = await Source.create({
      type: "file",
      path: filename,      // tên thực
      originalName: file.name, // tên gốc
    });

    return NextResponse.json({ id: src._id });
  } catch (e: any) {
    console.error("Upload error:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
