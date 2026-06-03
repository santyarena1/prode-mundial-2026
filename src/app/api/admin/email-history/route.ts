import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getAdminFromCookies } from "@/lib/cookies";

export async function GET() {
  try {
    const auth = await getAdminFromCookies();
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const logs = await prisma.emailLog.findMany({
      orderBy: { sentAt: "desc" },
      take: 100,
    });

    return NextResponse.json({ logs });
  } catch (error) {
    console.error("Email history GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
