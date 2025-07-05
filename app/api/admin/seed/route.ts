
import { NextRequest, NextResponse } from "next/server";
import Source from "@/models/Source";
import { dbConnect } from "@/lib/mongodb";
import { requireAdmin } from "@/lib/requireAdmin";
import { seedSources } from "@/lib/seedService";
export async function POST(req:NextRequest){
  try{
    await requireAdmin(); await dbConnect();
    const {sourceIds}=await req.json();
    const filter=sourceIds?{_id:{$in:sourceIds}}:{status:"pending"};
    const sources=await Source.find(filter);
    if(!sources.length) return NextResponse.json({message:"No sources"},{status:400});
    const result=await seedSources(sources);
    return NextResponse.json({result});
  }catch(e:any){return NextResponse.json({error:e.message},{status:500});}
}
