import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import prisma from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    const { token, password } = await request.json();

    if (!token || typeof token !== "string") {
      return NextResponse.json({ error: "Token inválido" }, { status: 400 });
    }
    if (!password || typeof password !== "string" || password.length < 6) {
      return NextResponse.json({ error: "La contraseña debe tener al menos 6 caracteres" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { passwordResetToken: token },
      select: { id: true, passwordResetExpiry: true },
    });

    if (!user) {
      return NextResponse.json({ error: "El link es inválido o ya fue usado" }, { status: 400 });
    }

    if (!user.passwordResetExpiry || user.passwordResetExpiry < new Date()) {
      return NextResponse.json({ error: "El link expiró. Pedí uno nuevo." }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        passwordResetToken: null,
        passwordResetExpiry: null,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[reset-password]", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
