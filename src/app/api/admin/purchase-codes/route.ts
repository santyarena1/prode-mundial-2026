import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/db";
import { getAdminFromCookies } from "@/lib/cookies";
import {
  CODE_TYPE_VALUES,
  generatePurchaseCode,
  isValidCodeType,
  normalizePurchaseCode,
  type CodeType,
} from "@/lib/purchase-code";

const createSchema = z.object({
  code: z.string().min(4).max(32).optional(),
  type: z.enum(CODE_TYPE_VALUES).default("purchase"),
  points: z.number().int().min(1).max(10000),
  notes: z.string().max(500).optional(),
});

export async function GET(request: NextRequest) {
  try {
    const auth = await getAdminFromCookies();
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const typeParam = request.nextUrl.searchParams.get("type");
    const typeFilter =
      typeParam && isValidCodeType(typeParam) ? (typeParam as CodeType) : undefined;

    const purchaseCodes = await prisma.purchaseCode.findMany({
      where: typeFilter ? { type: typeFilter } : undefined,
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });

    return NextResponse.json({ purchaseCodes });
  } catch (error) {
    console.error("Admin purchase codes GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getAdminFromCookies();
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation error", details: parsed.error.issues }, { status: 400 });
    }

    const codeType = parsed.data.type as CodeType;
    let code = parsed.data.code
      ? normalizePurchaseCode(parsed.data.code)
      : generatePurchaseCode(codeType);
    let attempts = 0;
    while (attempts < 5) {
      const exists = await prisma.purchaseCode.findUnique({ where: { code } });
      if (!exists) break;
      code = generatePurchaseCode(codeType);
      attempts++;
    }

    const purchaseCode = await prisma.purchaseCode.create({
      data: {
        code,
        type: codeType,
        points: parsed.data.points,
        notes: parsed.data.notes || null,
        status: "available",
      },
    });

    return NextResponse.json({ purchaseCode }, { status: 201 });
  } catch (error) {
    console.error("Admin purchase codes POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
