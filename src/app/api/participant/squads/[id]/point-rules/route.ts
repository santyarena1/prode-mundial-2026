import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/db";
import { getUserFromCookies } from "@/lib/cookies";
import { DEFAULT_POINT_RULES } from "@/lib/points";
import { getSquadPointRules } from "@/lib/squad-points";

const VALID_KEYS = Object.keys(DEFAULT_POINT_RULES);

const updateSchema = z.object({
  rules: z.array(
    z.object({
      key: z.string(),
      points: z.number().int().min(0),
    })
  ),
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

  const rules = await getSquadPointRules(id);
  return NextResponse.json({ rules });
}

export async function PUT(
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
    return NextResponse.json({ error: "Solo admins pueden cambiar las reglas" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Validation error" }, { status: 400 });

  const validRules = parsed.data.rules.filter((r) => VALID_KEYS.includes(r.key));

  await prisma.$transaction(
    validRules.map((r) =>
      prisma.squadPointRule.upsert({
        where: { squadId_key: { squadId: id, key: r.key } },
        create: { squadId: id, key: r.key, points: r.points },
        update: { points: r.points },
      })
    )
  );

  const rules = await getSquadPointRules(id);
  return NextResponse.json({ rules });
}
