
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
export async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "admin") throw new Error("Forbidden");
  return session;
}
