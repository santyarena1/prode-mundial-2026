import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getUserFromCookies } from "@/lib/cookies";

export async function GET() {
  const auth = await getUserFromCookies();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [notifications, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where: { userId: auth.userId },
      orderBy: { createdAt: "desc" },
      take: 40,
    }),
    prisma.notification.count({ where: { userId: auth.userId, read: false } }),
  ]);

  return NextResponse.json({ notifications, unreadCount });
}
