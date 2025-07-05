import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { dbConnect, User } from "@/lib/mongodb";

async function isAdmin(session:any) {
  if (!session?.user?.id) return false;
  await dbConnect();
  const me = await User.findById(session.user.id).select("role");
  return me && me.role === "admin";
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!(await isAdmin(session))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }
  await dbConnect();
  const users = await User.find().select("username email role isActive createdAt");
  return NextResponse.json(users);
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!(await isAdmin(session))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }
  const { id, role, isActive } = await req.json();
  await dbConnect();
  const user = await User.findById(id);
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (role) user.role = role;
  if (typeof isActive === "boolean") user.isActive = isActive;
  await user.save();
  return NextResponse.json({ success: true });
}