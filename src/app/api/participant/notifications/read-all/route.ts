import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getUserFromCookies } from "@/lib/cookies";

export async function PUT() {
  const auth = await getUserFromCookies();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await prisma.notification.updateMany({
    where: { userId: auth.userId, read: false },
    data: { read: true },
  });

  return NextResponse.json({ updated: true });
}
