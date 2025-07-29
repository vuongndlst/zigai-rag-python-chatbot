import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/requireAdmin";
import { dbConnect } from "@/lib/mongodb";
import { ModerationItem } from "@/models/ModerationItem";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }   // 🟢 dùng Promise
) {
  try {
    await requireAdmin();
    await dbConnect();

    // Giải nén id sau khi await
    const { id } = await params;

    const sourceItem = await ModerationItem.findById(id).lean();
    if (!sourceItem?.promptEmbedding) {
      return NextResponse.json(
        { error: "Source item or its embedding not found." },
        { status: 404 }
      );
    }

    const similarItems = await ModerationItem.aggregate([
      {
        $vectorSearch: {
          index: "prompt_embedding_index",
          path: "promptEmbedding",
          queryVector: sourceItem.promptEmbedding,
          numCandidates: 10,
          limit: 5,
        },
      },
      { $match: { status: "approved", _id: { $ne: sourceItem._id } } },
      {
        $project: {
          _id: 1,
          prompt: 1,
          response: 1,
          score: { $meta: "vectorSearchScore" },
        },
      },
    ]);

    return NextResponse.json(similarItems);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
