import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getUserFromCookies } from "@/lib/cookies";

export async function GET() {
  try {
    const auth = await getUserFromCookies();
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const interest = await prisma.virtualAlbumInterest.findUnique({
      where: { userId: auth.userId },
    });

    return NextResponse.json({ interested: !!interest });
  } catch (error) {
    console.error("Virtual album interest GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST() {
  try {
    const auth = await getUserFromCookies();
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const existing = await prisma.virtualAlbumInterest.findUnique({
      where: { userId: auth.userId },
    });

    if (existing) {
      return NextResponse.json({
        interested: true,
        message: "¡Ya estabas en la lista! Te avisamos cuando salga el álbum virtual.",
      });
    }

    await prisma.virtualAlbumInterest.create({
      data: { userId: auth.userId },
    });

    return NextResponse.json(
      {
        interested: true,
        message: "¡Listo! Te avisamos apenas esté el álbum virtual.",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Virtual album interest POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
