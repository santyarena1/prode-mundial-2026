import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/db";
import { getUserFromCookies } from "@/lib/cookies";

const createSchema = z.object({
  name: z.string().min(2).max(80),
  description: z.string().max(200).optional(),
  pointsCost: z.number().int().min(1),
  stock: z.number().int().min(-1).optional(),
});

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getUserFromCookies();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const member = await prisma.squadMember.findUnique({
    where: { squadId_userId: { squadId: id, userId: auth.userId } },
  });
  if (!member) return NextResponse.json({ error: "Not a member" }, { status: 403 });

  const prizes = await prisma.squadPrize.findMany({
    where: { squadId: id },
    include: { _count: { select: { redemptions: true } } },
    orderBy: { pointsCost: "asc" },
  });

  return NextResponse.json({ prizes });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getUserFromCookies();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const member = await prisma.squadMember.findUnique({
    where: { squadId_userId: { squadId: id, userId: auth.userId } },
  });
  if (!member || member.role !== "admin") {
    return NextResponse.json({ error: "Solo admins pueden crear premios" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Validation error" }, { status: 400 });

  const prize = await prisma.squadPrize.create({
    data: { squadId: id, ...parsed.data, stock: parsed.data.stock ?? -1 },
  });

  return NextResponse.json({ prize }, { status: 201 });
}
