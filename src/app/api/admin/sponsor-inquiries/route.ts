import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getAdminFromCookies } from "@/lib/cookies";

export async function GET() {
  try {
    const auth = await getAdminFromCookies();
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const inquiries = await prisma.sponsorInquiry.findMany({
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ inquiries });
  } catch (error) {
    console.error("Sponsor inquiries GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
