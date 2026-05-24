import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/db";
import { getAdminFromCookies } from "@/lib/cookies";

const updateSchema = z.object({
  name: z.string().min(1).max(80).optional(),
  description: z.string().max(200).optional(),
  pointsCost: z.number().int().min(1).optional(),
  stock: z.number().int().min(-1).optional(),
  active: z.boolean().optional(),
});

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; prizeId: string }> }
) {
  const auth = await getAdminFromCookies();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { prizeId } = await params;
  const body = await request.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Validation error" }, { status: 400 });

  const prize = await prisma.squadPrize.update({ where: { id: prizeId }, data: parsed.data });
  return NextResponse.json({ prize });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; prizeId: string }> }
) {
  const auth = await getAdminFromCookies();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { prizeId } = await params;
  await prisma.squadPrize.delete({ where: { id: prizeId } });
  return NextResponse.json({ deleted: true });
}
