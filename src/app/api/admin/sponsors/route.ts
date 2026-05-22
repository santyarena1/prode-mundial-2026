import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/db";
import { getAdminFromCookies } from "@/lib/cookies";
import { saveSponsorLogo } from "@/lib/sponsor-upload";

const createSponsorSchema = z.object({
  name: z.string().min(1),
  logoUrl: z.string().optional(),
  description: z.string().optional(),
  websiteUrl: z.string().optional(),
  instagramUrl: z.string().optional(),
  tiktokUrl: z.string().optional(),
  youtubeUrl: z.string().optional(),
  active: z.boolean().optional(),
});

export async function GET() {
  try {
    const auth = await getAdminFromCookies();
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const sponsors = await prisma.sponsor.findMany({ orderBy: { name: "asc" } });
    return NextResponse.json({ sponsors });
  } catch (error) {
    console.error("Sponsors GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getAdminFromCookies();
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const contentType = request.headers.get("content-type") || "";

    if (contentType.includes("multipart/form-data")) {
      const form = await request.formData();
      const name = String(form.get("name") || "").trim();
      const websiteUrl = String(form.get("websiteUrl") || form.get("website") || "").trim() || undefined;
      const logoFile = form.get("logo");

      if (!name) {
        return NextResponse.json({ error: "El nombre es requerido" }, { status: 400 });
      }

      let logoUrl: string | undefined;
      if (logoFile instanceof File && logoFile.size > 0) {
        try {
          logoUrl = await saveSponsorLogo(logoFile);
        } catch (err) {
          const message = err instanceof Error ? err.message : "Error al subir imagen";
          return NextResponse.json({ error: message }, { status: 400 });
        }
      }

      const sponsor = await prisma.sponsor.create({
        data: { name, logoUrl, websiteUrl, active: true },
      });
      return NextResponse.json({ sponsor }, { status: 201 });
    }

    const body = await request.json();
    const normalized = {
      ...body,
      websiteUrl: body.websiteUrl ?? body.website ?? undefined,
    };
    const parsed = createSponsorSchema.safeParse(normalized);
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation error", details: parsed.error.issues }, { status: 400 });
    }

    const sponsor = await prisma.sponsor.create({ data: parsed.data });
    return NextResponse.json({ sponsor }, { status: 201 });
  } catch (error) {
    console.error("Sponsors POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
