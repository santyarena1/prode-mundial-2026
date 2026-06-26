import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/db";
import { getUserFromCookies } from "@/lib/cookies";
import { calculateUserPoints } from "@/lib/points";
import {
  isValidCodeType,
  normalizePurchaseCode,
  type CodeType,
} from "@/lib/purchase-code";

const redeemSchema = z.object({
  code: z.string().min(4).max(32),
});

export async function GET(request: NextRequest) {
  try {
    const auth = await getUserFromCookies();
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const typeParam = request.nextUrl.searchParams.get("type");
    const typeFilter = typeParam && isValidCodeType(typeParam) ? (typeParam as CodeType) : undefined;

    const [singleUse, multiUse] = await Promise.all([
      prisma.purchaseCode.findMany({
        where: {
          userId: auth.userId,
          maxUses: null,
          ...(typeFilter ? { type: typeFilter } : {}),
        },
        orderBy: { updatedAt: "desc" },
        select: { id: true, code: true, type: true, points: true, status: true, createdAt: true, updatedAt: true, redeemedAt: true },
      }),
      prisma.purchaseCodeRedemption.findMany({
        where: {
          userId: auth.userId,
          ...(typeFilter ? { purchaseCode: { type: typeFilter } } : {}),
        },
        orderBy: { redeemedAt: "desc" },
        include: { purchaseCode: { select: { code: true, type: true } } },
      }),
    ]);

    const redemptions = [
      ...singleUse,
      ...multiUse.map((r) => ({
        id: r.id,
        code: r.purchaseCode.code,
        type: r.purchaseCode.type,
        points: r.pointsEarned,
        status: "redeemed",
        createdAt: r.redeemedAt.toISOString(),
        updatedAt: r.redeemedAt.toISOString(),
        redeemedAt: r.redeemedAt.toISOString(),
      })),
    ].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

    return NextResponse.json({ redemptions });
  } catch (error) {
    console.error("Purchase codes GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getUserFromCookies();
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const parsed = redeemSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Código inválido" }, { status: 400 });
    }

    const code = normalizePurchaseCode(parsed.data.code);
    const purchaseCode = await prisma.purchaseCode.findUnique({ where: { code } });

    if (!purchaseCode) {
      return NextResponse.json(
        {
          error:
            "Código no encontrado. Revisá las historias de The Gamer Shop, el local o pedilo por WhatsApp según corresponda.",
        },
        { status: 404 }
      );
    }

    // ── Multi-use code (story codes with maxUses set) ────────────────────────
    if (purchaseCode.maxUses != null) {
      if (purchaseCode.status !== "available") {
        return NextResponse.json({ error: "Este código ya agotó todos sus usos disponibles" }, { status: 409 });
      }

      const alreadyUsed = await prisma.purchaseCodeRedemption.findUnique({
        where: { purchaseCodeId_userId: { purchaseCodeId: purchaseCode.id, userId: auth.userId } },
      });
      if (alreadyUsed) {
        return NextResponse.json({ error: "Ya usaste este código" }, { status: 409 });
      }

      try {
        await prisma.$transaction(async (tx) => {
          await tx.purchaseCodeRedemption.create({
            data: { purchaseCodeId: purchaseCode.id, userId: auth.userId, pointsEarned: purchaseCode.points },
          });
          const updated = await tx.purchaseCode.updateMany({
            where: { id: purchaseCode.id, status: "available" },
            data: { useCount: { increment: 1 } },
          });
          if (updated.count === 0) throw new Error("EXHAUSTED");
          // Mark exhausted if this was the last use
          await tx.purchaseCode.updateMany({
            where: { id: purchaseCode.id, useCount: { gte: purchaseCode.maxUses! } },
            data: { status: "redeemed" },
          });
        });
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "";
        if (msg === "EXHAUSTED") {
          return NextResponse.json({ error: "Este código ya agotó todos sus usos disponibles" }, { status: 409 });
        }
        throw e;
      }

      await calculateUserPoints(auth.userId);
      return NextResponse.json(
        { message: "¡Código válido! Tus puntos fueron acreditados automáticamente." },
        { status: 201 }
      );
    }

    // ── Single-use code ──────────────────────────────────────────────────────
    if (purchaseCode.status === "redeemed") {
      return NextResponse.json({ error: "Este código ya fue utilizado" }, { status: 409 });
    }

    if (purchaseCode.status === "pending") {
      if (purchaseCode.userId === auth.userId) {
        // Atomic: only update if still pending and owned by this user
        const result = await prisma.purchaseCode.updateMany({
          where: { id: purchaseCode.id, status: "pending", userId: auth.userId },
          data: { status: "redeemed", redeemedAt: new Date() },
        });
        if (result.count === 0) {
          return NextResponse.json({ error: "Este código ya fue utilizado" }, { status: 409 });
        }
        const updated = await prisma.purchaseCode.findUnique({ where: { id: purchaseCode.id } });
        await calculateUserPoints(auth.userId);
        return NextResponse.json({ redemption: updated, message: "¡Puntos acreditados!" });
      }
      return NextResponse.json({ error: "Este código ya fue cargado por otro usuario" }, { status: 409 });
    }

    if (purchaseCode.status === "rejected") {
      return NextResponse.json(
        { error: "Este código fue rechazado. Consultá en The Gamer Shop." },
        { status: 409 }
      );
    }

    // Atomic: only update if still available (prevents double-redemption under concurrent requests)
    const result = await prisma.purchaseCode.updateMany({
      where: { id: purchaseCode.id, status: "available" },
      data: { status: "redeemed", userId: auth.userId, redeemedAt: new Date() },
    });
    if (result.count === 0) {
      return NextResponse.json({ error: "Este código ya fue utilizado" }, { status: 409 });
    }

    const updated = await prisma.purchaseCode.findUnique({ where: { id: purchaseCode.id } });
    await calculateUserPoints(auth.userId);

    return NextResponse.json(
      {
        redemption: updated,
        message: "¡Código válido! Tus puntos fueron acreditados automáticamente.",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Purchase codes POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
