import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getAdminFromCookies } from "@/lib/cookies";

export async function GET() {
  try {
    const auth = await getAdminFromCookies();
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const messages = await prisma.contactMessage.findMany({
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ messages });
  } catch (error) {
    console.error("Contact messages GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const auth = await getAdminFromCookies();
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id, read } = await req.json();
    await prisma.contactMessage.update({ where: { id }, data: { read } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Contact messages PATCH error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const auth = await getAdminFromCookies();
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await req.json();
    await prisma.contactMessage.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Contact messages DELETE error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
