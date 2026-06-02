import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/db";
import { getAdminFromCookies } from "@/lib/cookies";
import { deleteSponsorLogoFile, saveSponsorLogo } from "@/lib/sponsor-upload";

const updateSponsorSchema = z.object({
  name: z.string().optional(),
  logoUrl: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  websiteUrl: z.string().nullable().optional(),
  instagramUrl: z.string().nullable().optional(),
  tiktokUrl: z.string().nullable().optional(),
  youtubeUrl: z.string().nullable().optional(),
  active: z.boolean().optional(),
  showInHome: z.boolean().optional(),
});

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAdminFromCookies();
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const contentType = request.headers.get("content-type") || "";

    if (contentType.includes("multipart/form-data")) {
      const form = await request.formData();
      const logoFile = form.get("logo");

      if (!(logoFile instanceof File) || logoFile.size === 0) {
        return NextResponse.json({ error: "Seleccioná una imagen" }, { status: 400 });
      }

      const existing = await prisma.sponsor.findUnique({ where: { id } });
      if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

      let logoUrl: string;
      try {
        logoUrl = await saveSponsorLogo(logoFile);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Error al subir imagen";
        return NextResponse.json({ error: message }, { status: 400 });
      }

      await deleteSponsorLogoFile(existing.logoUrl);

      const sponsor = await prisma.sponsor.update({
        where: { id },
        data: { logoUrl },
      });
      return NextResponse.json({ sponsor });
    }

    const body = await request.json();
    const parsed = updateSponsorSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation error", details: parsed.error.issues }, { status: 400 });
    }

    const sponsor = await prisma.sponsor.update({ where: { id }, data: parsed.data });
    return NextResponse.json({ sponsor });
  } catch (error) {
    console.error("Sponsor PUT error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAdminFromCookies();
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const existing = await prisma.sponsor.findUnique({ where: { id } });
    if (existing) await deleteSponsorLogoFile(existing.logoUrl);

    await prisma.sponsor.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Sponsor DELETE error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
