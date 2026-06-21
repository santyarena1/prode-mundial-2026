import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getUserFromCookies } from "@/lib/cookies";

function generateReferralCode(): string {
  return Math.random().toString(36).substring(2, 10).toUpperCase();
}

export async function GET() {
  try {
    const auth = await getUserFromCookies();
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const selectShape = {
      referralCode: true,
      referralPoints: true,
      _count: { select: { referrals: true } },
      referrals: {
        select: { id: true, firstName: true, lastName: true, createdAt: true, emailVerified: true, referralBonusAwarded: true },
        orderBy: { createdAt: "desc" as const },
      },
    };

    let user = await prisma.user.findUnique({ where: { id: auth.userId }, select: selectShape });

    if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // Auto-generate referral code for existing users that don't have one
    if (!user.referralCode) {
      let code = generateReferralCode();
      while (await prisma.user.findUnique({ where: { referralCode: code } })) {
        code = generateReferralCode();
      }
      user = await prisma.user.update({ where: { id: auth.userId }, data: { referralCode: code }, select: selectShape });
    }

    const setting = await prisma.setting.findUnique({ where: { key: "referral_points" } });
    const pointsPerReferral = setting ? (parseInt(setting.value) || 200) : 200;

    // Cutoff: el flujo de verificación se deployó el 2026-06-19. Cualquier referido creado
    // antes de esa fecha pertenece al sistema viejo y se considera verificado por definición,
    // sin importar el valor de los flags.
    const VERIFICATION_DEPLOY = new Date("2026-06-19T20:30:00-03:00");
    const isVerified = (r: { createdAt: Date; emailVerified: boolean; referralBonusAwarded: boolean }) =>
      r.createdAt < VERIFICATION_DEPLOY || (r.emailVerified && r.referralBonusAwarded);

    const verifiedReferrals = user.referrals.filter(isVerified).length;
    const pendingReferrals = user.referrals.length - verifiedReferrals;

    return NextResponse.json({
      referralCode: user.referralCode,
      referralPoints: user.referralPoints,
      referralCount: user._count.referrals,
      verifiedReferrals,
      pendingReferrals,
      pointsPerReferral,
      referrals: user.referrals.map(r => ({
        id: r.id,
        name: `${r.firstName} ${r.lastName.charAt(0)}.`,
        joinedAt: r.createdAt,
        verified: isVerified(r),
      })),
    });
  } catch (error) {
    console.error("Referral GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
