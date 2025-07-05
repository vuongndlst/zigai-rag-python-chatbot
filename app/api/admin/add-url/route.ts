
import { NextRequest, NextResponse } from "next/server";
import Source from "@/models/Source";
import { dbConnect } from "@/lib/mongodb";
import { requireAdmin } from "@/lib/requireAdmin";
export async function POST(req:NextRequest){
  try{
    await requireAdmin();
    const {url}=await req.json();
    if(!url?.startsWith("http")) return NextResponse.json({error:"Invalid URL"},{status:400});
    await dbConnect();
    const src=await Source.create({type:"url",path:url});
    return NextResponse.json({id:src._id});
  }catch(e:any){return NextResponse.json({error:e.message},{status:500});}
}
