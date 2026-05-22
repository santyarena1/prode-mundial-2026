import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/db";
import { getUserFromCookies } from "@/lib/cookies";
import {
  isValidCodeType,
  normalizePurchaseCode,
  redeemMessageForType,
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

    const redemptions = await prisma.purchaseCode.findMany({
      where: {
        userId: auth.userId,
        ...(typeFilter ? { type: typeFilter } : {}),
      },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        code: true,
        type: true,
        points: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        redeemedAt: true,
      },
    });

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

    if (purchaseCode.status === "redeemed") {
      return NextResponse.json({ error: "Este código ya fue utilizado" }, { status: 409 });
    }

    if (purchaseCode.status === "pending") {
      if (purchaseCode.userId === auth.userId) {
        return NextResponse.json({
          redemption: purchaseCode,
          message: "Tu código ya está en revisión",
        });
      }
      return NextResponse.json({ error: "Este código ya fue cargado por otro usuario" }, { status: 409 });
    }

    if (purchaseCode.status === "rejected") {
      return NextResponse.json(
        { error: "Este código fue rechazado. Consultá en The Gamer Shop." },
        { status: 409 }
      );
    }

    const updated = await prisma.purchaseCode.update({
      where: { id: purchaseCode.id },
      data: {
        status: "pending",
        userId: auth.userId,
      },
    });

    return NextResponse.json(
      {
        redemption: updated,
        message: redeemMessageForType(purchaseCode.type),
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Purchase codes POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
