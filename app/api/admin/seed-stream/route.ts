import { NextRequest } from "next/server";
import Source from "@/models/Source";
import { dbConnect } from "@/lib/mongodb";
import { requireAdmin } from "@/lib/requireAdmin";
import { seedOne } from "@/lib/seedService";

export const runtime = "nodejs";

export async function GET(_req: NextRequest) {
  await requireAdmin();
  await dbConnect();

  /* ⚠️ bỏ .lean() để trả về Mongoose document có save() */
  const list = await Source.find({ status: "pending" });    // <— HERE

  const stream = new ReadableStream({
    async start(controller) {
      const send = (o: any) =>
        controller.enqueue(
          new TextEncoder().encode(`data:${JSON.stringify(o)}\n\n`)
        );

      for (const src of list) await seedOne(src, send);

      send({ type: "allDone" });
      controller.close();
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "text/event-stream" },
  });
}
