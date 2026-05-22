import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import prisma from "@/lib/db";
import { getAdminFromCookies } from "@/lib/cookies";

const passwordSchema = z.object({
  newPassword: z.string().min(6, { message: "La contraseña debe tener al menos 6 caracteres" }),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAdminFromCookies();
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const body = await request.json();
    const parsed = passwordSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Datos inválidos" },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    }

    const passwordHash = await bcrypt.hash(parsed.data.newPassword, 10);
    await prisma.user.update({
      where: { id },
      data: { passwordHash },
    });

    return NextResponse.json({
      success: true,
      message: `Contraseña actualizada para ${user.firstName} ${user.lastName}`,
    });
  } catch (error) {
    console.error("Admin set participant password error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
