import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/db";
import { getAdminFromCookies } from "@/lib/cookies";

const updateSchema = z.object({ status: z.enum(["pending", "approved", "rejected"]) });

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; redemptionId: string }> }
) {
  const auth = await getAdminFromCookies();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { redemptionId } = await params;
  const body = await request.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Validation error" }, { status: 400 });

  const redemption = await prisma.squadRedemption.update({
    where: { id: redemptionId },
    data: { status: parsed.data.status },
  });

  return NextResponse.json({ redemption });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; redemptionId: string }> }
) {
  const auth = await getAdminFromCookies();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { redemptionId } = await params;
  await prisma.squadRedemption.delete({ where: { id: redemptionId } });
  return NextResponse.json({ deleted: true });
}
