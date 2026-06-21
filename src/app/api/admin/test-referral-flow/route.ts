/**
 * Endpoint TEMPORAL de self-test del flujo de verificación + bonus de referido.
 * Crea dos usuarios fake (referidor + referido), simula la verificación llamando
 * a la misma lógica que /api/auth/verify-email, asserts el resultado y limpia.
 *
 * Borrar este archivo una vez verificado el flujo en prod.
 */
import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import prisma from "@/lib/db";
import { getAdminFromCookies } from "@/lib/cookies";

interface StepResult { step: string; ok: boolean; detail?: unknown }

export async function POST() {
  const auth = await getAdminFromCookies();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const stamp = Date.now();
  const referrerEmail = `test-ref-${stamp}@selftest.local`;
  const referredEmail = `test-new-${stamp}@selftest.local`;
  const refCode = `TST${randomBytes(3).toString("hex").toUpperCase()}`;
  const verificationToken = randomBytes(32).toString("hex");

  const results: StepResult[] = [];
  let referrerId: string | null = null;
  let referredId: string | null = null;

  try {
    // 1. Crear referidor
    const referrer = await prisma.user.create({
      data: {
        firstName: "TestRef",
        lastName: "Self",
        email: referrerEmail,
        phone: `00000${stamp}`.slice(-12),
        passwordHash: "selftest",
        acceptedTerms: true,
        referralCode: refCode,
        emailVerified: true,
      },
    });
    referrerId = referrer.id;
    results.push({ step: "create_referrer", ok: true, detail: { id: referrer.id, referralPoints: referrer.referralPoints, code: refCode } });

    // 2. Crear referido (estado igual al que deja /api/auth/register con código válido)
    const referred = await prisma.user.create({
      data: {
        firstName: "TestNew",
        lastName: "Self",
        email: referredEmail,
        phone: `11111${stamp}`.slice(-12),
        passwordHash: "selftest",
        acceptedTerms: true,
        referralCode: `TS2${randomBytes(3).toString("hex").toUpperCase()}`,
        referredById: referrer.id,
        emailVerified: false,
        emailVerificationToken: verificationToken,
        emailVerificationExpiry: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        referralBonusAwarded: false,
      },
    });
    referredId = referred.id;
    results.push({ step: "create_referred", ok: true, detail: { id: referred.id, emailVerified: referred.emailVerified, referralBonusAwarded: referred.referralBonusAwarded } });

    // 3. Lanzar contra el endpoint público de verify-email con el token
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const verifyRes = await fetch(`${baseUrl}/api/auth/verify-email`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: verificationToken }),
    });
    const verifyJson = await verifyRes.json();
    results.push({ step: "call_verify_email", ok: verifyRes.ok, detail: { status: verifyRes.status, body: verifyJson } });

    if (!verifyRes.ok) throw new Error("verify-email no devolvió OK");

    // 4. Releer estado real desde DB
    const [referrerAfter, referredAfter] = await Promise.all([
      prisma.user.findUnique({ where: { id: referrer.id }, select: { referralPoints: true, totalPoints: true } }),
      prisma.user.findUnique({ where: { id: referred.id }, select: { emailVerified: true, referralBonusAwarded: true, totalPoints: true } }),
    ]);
    const referredBonus = await prisma.userBonus.findFirst({
      where: { userId: referred.id, bonusAction: { name: "Código de referido" } },
      select: { pointsEarned: true, status: true },
    });

    const referralPointsSetting = await prisma.setting.findUnique({ where: { key: "referral_points" } });
    const newUserPointsSetting = await prisma.setting.findUnique({ where: { key: "referral_new_user_points" } });
    const expectedReferrer = parseInt(referralPointsSetting?.value || "200") || 200;
    const expectedNewUser = parseInt(newUserPointsSetting?.value || "300") || 300;

    const assertions = {
      referredVerified: referredAfter?.emailVerified === true,
      referralBonusAwardedFlag: referredAfter?.referralBonusAwarded === true,
      referrerGotPoints: (referrerAfter?.referralPoints ?? 0) === expectedReferrer,
      referredBonusCreated: referredBonus?.pointsEarned === expectedNewUser,
      bonusApproved: referredBonus?.status === "approved",
    };
    const allOk = Object.values(assertions).every(Boolean);
    results.push({
      step: "assertions",
      ok: allOk,
      detail: {
        ...assertions,
        expectedReferrer,
        expectedNewUser,
        referrer: referrerAfter,
        referred: referredAfter,
        referredBonus,
      },
    });

    return NextResponse.json({
      ok: allOk,
      summary: allOk
        ? "🟢 Todo el flujo funciona: el referido quedó verificado, el referidor recibió los puntos, y el bonus del referido se creó."
        : "🔴 Hay algo mal — revisá las assertions en detalle.",
      steps: results,
    });
  } catch (error: unknown) {
    return NextResponse.json({
      ok: false,
      error: error instanceof Error ? error.message : String(error),
      steps: results,
    }, { status: 500 });
  } finally {
    // Cleanup: borrar usuarios y todo lo relacionado
    try {
      if (referredId) {
        await prisma.userBonus.deleteMany({ where: { userId: referredId } });
        await prisma.user.delete({ where: { id: referredId } });
      }
      if (referrerId) await prisma.user.delete({ where: { id: referrerId } });
    } catch (e) {
      console.error("[test-referral-flow] cleanup failed:", e);
    }
  }
}
