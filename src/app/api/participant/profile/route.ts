import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/db";
import { getUserFromCookies } from "@/lib/cookies";

const updateSchema = z.object({
  instagram: z
    .string()
    .max(64)
    .optional()
    .transform((v) => (v === undefined ? undefined : v.trim() || null)),
  hardcoreMode: z.boolean().optional(),
});

export async function PATCH(request: NextRequest) {
  try {
    const auth = await getUserFromCookies();
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
    }

    const { instagram, hardcoreMode } = parsed.data;
    if (instagram === undefined && hardcoreMode === undefined) {
      return NextResponse.json({ error: "Nada para actualizar" }, { status: 400 });
    }

    const data: Record<string, unknown> = {};
    if (instagram !== undefined) data.instagram = instagram;
    if (hardcoreMode !== undefined) data.hardcoreMode = hardcoreMode;

    const user = await prisma.user.update({
      where: { id: auth.userId },
      data,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        instagram: true,
        hardcoreMode: true,
        totalPoints: true,
        predictionPoints: true,
        bonusPoints: true,
        spentPoints: true,
        createdAt: true,
        passwordHash: true,
      },
    });

    const { passwordHash, ...safe } = user;
    return NextResponse.json({
      user: { ...safe, hasPassword: !!passwordHash },
      message: "Perfil actualizado",
    });
  } catch (error) {
    console.error("Profile PATCH error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
