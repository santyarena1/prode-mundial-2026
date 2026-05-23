import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getAdminFromCookies } from "@/lib/cookies";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAdminFromCookies();
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const body = await request.json();

    const inquiry = await prisma.sponsorInquiry.update({
      where: { id },
      data: {
        ...(body.status !== undefined && { status: body.status }),
        ...(body.adminNotes !== undefined && { adminNotes: body.adminNotes }),
      },
    });
    return NextResponse.json({ inquiry });
  } catch (error) {
    console.error("Sponsor inquiry PUT error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAdminFromCookies();
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    await prisma.sponsorInquiry.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Sponsor inquiry DELETE error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
