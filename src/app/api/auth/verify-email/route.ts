import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { calculateUserPoints } from "@/lib/points";

export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json();

    if (!token || typeof token !== "string") {
      return NextResponse.json({ error: "Token requerido" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { emailVerificationToken: token },
      select: {
        id: true,
        emailVerified: true,
        emailVerificationExpiry: true,
        referredById: true,
        referralBonusAwarded: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "Link inválido o ya usado" }, { status: 404 });
    }

    if (user.emailVerified) {
      return NextResponse.json({ ok: true, alreadyVerified: true });
    }

    if (user.emailVerificationExpiry && user.emailVerificationExpiry < new Date()) {
      return NextResponse.json(
        { error: "El link expiró. Pedí uno nuevo desde tu perfil." },
        { status: 410 }
      );
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        emailVerificationToken: null,
        emailVerificationExpiry: null,
      },
    });

    // Award deferred referral bonus
    if (user.referredById && !user.referralBonusAwarded) {
      const [referralSetting, newUserSetting] = await Promise.all([
        prisma.setting.findUnique({ where: { key: "referral_points" } }),
        prisma.setting.findUnique({ where: { key: "referral_new_user_points" } }),
      ]);
      const REFERRAL_POINTS = parseInt(referralSetting?.value || "200") || 200;
      const NEW_USER_POINTS = parseInt(newUserSetting?.value || "300") || 300;

      let referralAction = await prisma.bonusAction.findFirst({
        where: { name: "Código de referido" },
      });
      if (!referralAction) {
        referralAction = await prisma.bonusAction.create({
          data: {
            name: "Código de referido",
            description: "Puntos por registrarse con el código de un amigo",
            points: 0,
            requiresApproval: false,
            active: false,
            allowMultipleClaims: false,
          },
        });
      }

      await prisma.$transaction([
        prisma.user.update({
          where: { id: user.referredById },
          data: { referralPoints: { increment: REFERRAL_POINTS } },
        }),
        prisma.userBonus.create({
          data: {
            userId: user.id,
            bonusActionId: referralAction.id,
            status: "approved",
            pointsEarned: NEW_USER_POINTS,
          },
        }),
        prisma.user.update({
          where: { id: user.id },
          data: { referralBonusAwarded: true },
        }),
      ]);

      calculateUserPoints(user.referredById).catch(() => {});
    }

    calculateUserPoints(user.id).catch(() => {});

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[verify-email]", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
