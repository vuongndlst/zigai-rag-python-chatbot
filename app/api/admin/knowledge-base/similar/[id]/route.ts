import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/requireAdmin";
import { dbConnect } from "@/lib/mongodb";
import { ModerationItem } from "@/models/ModerationItem";

export async function GET(
  req: Request,                                // ← Request gốc
  { params }: { params: { id: string } }       // ← ctx
) {
  try {
    await requireAdmin();
    await dbConnect();

    const sourceItem = await ModerationItem.findById(params.id).lean();
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
