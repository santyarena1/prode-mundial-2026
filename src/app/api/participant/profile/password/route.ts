import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import prisma from "@/lib/db";
import { getUserFromCookies } from "@/lib/cookies";

const passwordSchema = z
  .object({
    currentPassword: z.string().optional(),
    newPassword: z.string().min(6, { message: "Mínimo 6 caracteres" }),
    confirmPassword: z.string().min(6),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: "Las contraseñas no coinciden",
    path: ["confirmPassword"],
  });

export async function POST(request: NextRequest) {
  try {
    const auth = await getUserFromCookies();
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = passwordSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Datos inválidos" },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({ where: { id: auth.userId } });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const { currentPassword, newPassword } = parsed.data;

    if (user.passwordHash) {
      if (!currentPassword) {
        return NextResponse.json(
          { error: "Ingresá tu contraseña actual" },
          { status: 400 }
        );
      }
      const valid = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!valid) {
        return NextResponse.json({ error: "La contraseña actual no es correcta" }, { status: 401 });
      }
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash },
    });

    return NextResponse.json({
      message: user.passwordHash
        ? "¡Listo! Tu contraseña quedó actualizada."
        : "¡Listo! Ya tenés contraseña configurada.",
    });
  } catch (error) {
    console.error("Profile password POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
