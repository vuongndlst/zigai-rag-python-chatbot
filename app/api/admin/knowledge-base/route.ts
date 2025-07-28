import { NextResponse, NextRequest } from 'next/server';
import { requireAdmin } from '@/lib/requireAdmin';
import { dbConnect } from '@/lib/mongodb';
import { ModerationItem } from '@/models/ModerationItem';
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Lấy các mục đã duyệt (hỗ trợ tìm kiếm vector và phân trang)
export async function GET(req: NextRequest) {
  try {
    await requireAdmin();
    await dbConnect();

    const page = Number(req.nextUrl.searchParams.get("page") || 1);
    const limit = Number(req.nextUrl.searchParams.get("limit") || 5);
    const searchQuery = req.nextUrl.searchParams.get("search") || "";
    const skip = (page - 1) * limit;

    // Nếu có từ khóa tìm kiếm, thực hiện Vector Search
    if (searchQuery) {
      console.log(`🔎 Thực hiện Vector Search cho: "${searchQuery}"`);
      
      // 1. Tạo embedding cho từ khóa tìm kiếm
      const queryEmbedding = await openai.embeddings.create({
          model: "text-embedding-3-small",
          input: searchQuery,
      }).then(res => res.data[0].embedding);

      // 2. Xây dựng pipeline tổng hợp cho Vector Search
      const pipeline = [
        {
          "$vectorSearch": {
            "index": "prompt_embedding_index", // Đảm bảo bạn đã tạo index này trên MongoDB
            "path": "promptEmbedding",
            "queryVector": queryEmbedding,
            "numCandidates": 150,
            "limit": 100
          }
        },
        {
          "$match": { "status": "approved" }
        },
        {
          "$project": {
            "_id": 1, "prompt": 1, "response": 1, "updatedAt": 1,
            "score": { "$meta": "vectorSearchScore" }
          }
        }
      ];
      
      const results = await ModerationItem.aggregate(pipeline);
      const total = results.length;
      const items = results.slice(skip, skip + limit);

      return NextResponse.json({ items, total });

    } else {
      // Nếu không có từ khóa, thực hiện truy vấn thông thường
      const filter = { status: 'approved' };
      const total = await ModerationItem.countDocuments(filter);
      const items = await ModerationItem.find(filter)
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(limit);
      
      return NextResponse.json({ items, total });
    }

  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// Thêm một mục mới
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    await requireAdmin(session);
    await dbConnect();
    const { prompt, response } = await req.json();

    if (!prompt || !response) {
        return NextResponse.json({ error: 'Prompt and response are required' }, { status: 400 });
    }

    const embeddingResponse = await openai.embeddings.create({
        model: "text-embedding-3-small",
        input: prompt,
    });
    const promptEmbedding = embeddingResponse.data[0].embedding;

    const newItem = await ModerationItem.create({
        prompt, response, status: 'approved',
        userId: session?.user?.id, promptEmbedding,
    });

    return NextResponse.json(newItem);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// Cập nhật một mục
export async function PUT(req: Request) {
    try {
        await requireAdmin();
        await dbConnect();
        const { id, prompt, response } = await req.json();

        if (!id || !prompt || !response) {
            return NextResponse.json({ error: 'ID, prompt, and response are required' }, { status: 400 });
        }

        const embeddingResponse = await openai.embeddings.create({
            model: "text-embedding-3-small",
            input: prompt,
        });
        const promptEmbedding = embeddingResponse.data[0].embedding;

        const updatedItem = await ModerationItem.findByIdAndUpdate(
            id, { prompt, response, promptEmbedding }, { new: true }
        );

        if (!updatedItem) {
            return NextResponse.json({ error: 'Item not found' }, { status: 404 });
        }

        return NextResponse.json(updatedItem);
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

// Xóa một mục
export async function DELETE(req: Request) {
    try {
        await requireAdmin();
        await dbConnect();
        const { id } = await req.json();

        if (!id) {
            return NextResponse.json({ error: 'ID is required' }, { status: 400 });
        }

        const deletedItem = await ModerationItem.findByIdAndDelete(id);

        if (!deletedItem) {
            return NextResponse.json({ error: 'Item not found' }, { status: 404 });
        }

        return NextResponse.json({ message: 'Item deleted successfully' });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
