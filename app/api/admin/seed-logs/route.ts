
import { NextRequest, NextResponse } from "next/server";
import SeedLog from "@/models/SeedLog";
import { dbConnect } from "@/lib/mongodb";
import { requireAdmin } from "@/lib/requireAdmin";
export async function GET(req:NextRequest){
  await requireAdmin(); await dbConnect();
  const page=Number(req.nextUrl.searchParams.get("page")||1); const limit=20;
  const logs=await SeedLog.find({}).sort({createdAt:-1}).skip((page-1)*limit).limit(limit).lean();
  const total=await SeedLog.countDocuments();
  return NextResponse.json({logs,total});
}
