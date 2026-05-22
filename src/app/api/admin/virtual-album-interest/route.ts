import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getAdminFromCookies } from "@/lib/cookies";

export async function GET() {
  try {
    const auth = await getAdminFromCookies();
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const interests = await prisma.virtualAlbumInterest.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
          },
        },
      },
    });

    return NextResponse.json({
      total: interests.length,
      interests,
    });
  } catch (error) {
    console.error("Admin virtual album interest GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
