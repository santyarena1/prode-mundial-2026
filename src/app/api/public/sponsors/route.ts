import { NextResponse } from "next/server";
import prisma from "@/lib/db";

export async function GET() {
  try {
    const sponsors = await prisma.sponsor.findMany({
      where: {
        active: true,
        logoUrl: { not: null },
      },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        logoUrl: true,
        websiteUrl: true,
      },
    });

    const withLogo = sponsors.filter((s) => s.logoUrl && s.logoUrl.trim().length > 0);

    return NextResponse.json({ sponsors: withLogo });
  } catch (error) {
    console.error("Public sponsors GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
