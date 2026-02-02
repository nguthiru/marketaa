import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function isAdmin(): Promise<boolean> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return false;

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });

  return user?.role === "admin";
}

export async function requireAdmin() {
  const admin = await isAdmin();
  if (!admin) {
    throw new Error("Admin access required");
  }
}

export async function getAdminSession() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, email: true, name: true, role: true },
  });

  if (user?.role !== "admin") return null;

  return { ...session, user };
}
