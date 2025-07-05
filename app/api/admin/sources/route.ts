
import { NextResponse } from "next/server";
import Source from "@/models/Source";
import { dbConnect } from "@/lib/mongodb";
import { requireAdmin } from "@/lib/requireAdmin";
export async function GET(){
  await requireAdmin();
  await dbConnect();
  const sources=await Source.find({}).sort({createdAt:-1}).lean();
  return NextResponse.json({sources});
}
