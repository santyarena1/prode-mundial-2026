import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/db";

const schema = z.object({
  name: z.string().min(2, "Nombre requerido"),
  brand: z.string().min(2, "Nombre de marca requerido"),
  email: z.string().email("Email inválido"),
  phone: z.string().optional(),
  instagram: z.string().optional(),
  reason: z.string().min(10, "Contanos un poco más"),
  offer: z.string().min(1, "Seleccioná una opción"),
  message: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      const first = parsed.error.issues[0]?.message ?? "Datos inválidos";
      return NextResponse.json({ error: first }, { status: 400 });
    }

    const inquiry = await prisma.sponsorInquiry.create({ data: parsed.data });
    return NextResponse.json({ ok: true, id: inquiry.id }, { status: 201 });
  } catch (error) {
    console.error("Sponsor inquiry POST error:", error);
    return NextResponse.json({ error: "Error al enviar consulta" }, { status: 500 });
  }
}
