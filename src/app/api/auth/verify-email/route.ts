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

    const shouldAwardReferral = !!user.referredById && !user.referralBonusAwarded;

    // Resolve settings + bonus action BEFORE the transaction so the transaction stays short.
    let referralActionId: string | null = null;
    let REFERRAL_POINTS = 200;
    let NEW_USER_POINTS = 300;

    if (shouldAwardReferral) {
      const [referralSetting, newUserSetting] = await Promise.all([
        prisma.setting.findUnique({ where: { key: "referral_points" } }),
        prisma.setting.findUnique({ where: { key: "referral_new_user_points" } }),
      ]);
      REFERRAL_POINTS = parseInt(referralSetting?.value || "200") || 200;
      NEW_USER_POINTS = parseInt(newUserSetting?.value || "300") || 300;

      let referralAction = await prisma.bonusAction.findFirst({ where: { name: "Código de referido" } });
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
      referralActionId = referralAction.id;
    }

    // Atomic: mark verified AND credit the referral bonus in one transaction.
    // If anything fails, the user stays unverified so they (or admin) can retry.
    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: user.id },
        data: {
          emailVerified: true,
          emailVerificationToken: null,
          emailVerificationExpiry: null,
          ...(shouldAwardReferral ? { referralBonusAwarded: true } : {}),
        },
      });

      if (shouldAwardReferral && user.referredById && referralActionId) {
        await tx.user.update({
          where: { id: user.referredById },
          data: { referralPoints: { increment: REFERRAL_POINTS } },
        });
        await tx.userBonus.create({
          data: {
            userId: user.id,
            bonusActionId: referralActionId,
            status: "approved",
            pointsEarned: NEW_USER_POINTS,
          },
        });
      }
    });

    console.log(
      `[verify-email] user=${user.id} verified=true referralAwarded=${shouldAwardReferral} referredBy=${user.referredById ?? "-"}`
    );

    if (shouldAwardReferral && user.referredById) {
      calculateUserPoints(user.referredById).catch((e) =>
        console.error("[verify-email] recalc referrer failed", e)
      );
    }
    calculateUserPoints(user.id).catch((e) => console.error("[verify-email] recalc user failed", e));

    return NextResponse.json({ ok: true, referralAwarded: shouldAwardReferral });
  } catch (error) {
    console.error("[verify-email]", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
