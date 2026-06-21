import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { randomUUID } from "crypto";
import prisma from "@/lib/db";
import { getAdminFromCookies } from "@/lib/cookies";

const SETTING_KEY = "email_assets";

interface Asset { id: string; name: string; url: string }

async function getAssets(): Promise<Asset[]> {
  const setting = await prisma.setting.findUnique({ where: { key: SETTING_KEY } });
  try { return JSON.parse(setting?.value ?? "[]"); } catch { return []; }
}

async function saveAssets(assets: Asset[]) {
  await prisma.setting.upsert({
    where:  { key: SETTING_KEY },
    update: { value: JSON.stringify(assets) },
    create: { key: SETTING_KEY, value: JSON.stringify(assets) },
  });
}

export async function GET() {
  try {
    const auth = await getAdminFromCookies();
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const [sponsors, assets] = await Promise.all([
      prisma.sponsor.findMany({
        where:   { logoUrl: { not: null } },
        select:  { id: true, name: true, logoUrl: true },
        orderBy: { name: "asc" },
      }),
      getAssets(),
    ]);

    return NextResponse.json({ sponsors, assets });
  } catch (error) {
    console.error("Email assets GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getAdminFromCookies();
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const form = await request.formData();
    const file = form.get("file");
    const name = String(form.get("name") || "").trim() || "imagen";

    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json({ error: "No se recibió ningún archivo" }, { status: 400 });
    }

    const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "image/gif", "image/svg+xml"]);
    if (!ALLOWED.has(file.type)) {
      return NextResponse.json({ error: "Formato no permitido. Usá JPG, PNG, WebP, GIF o SVG." }, { status: 400 });
    }
    if (file.size > 2 * 1024 * 1024) {
      return NextResponse.json({ error: "La imagen no puede superar 2 MB." }, { status: 400 });
    }

    const ext  = file.type === "image/svg+xml" ? "svg" : (file.name.split(".").pop() || "png");
    const blob = await put(`email-assets/${randomUUID()}.${ext}`, Buffer.from(await file.arrayBuffer()), {
      access:      "public",
      contentType: file.type,
    });

    const assets = await getAssets();
    const newAsset: Asset = { id: randomUUID(), name, url: blob.url };
    assets.unshift(newAsset);
    await saveAssets(assets);

    return NextResponse.json({ asset: newAsset });
  } catch (error) {
    console.error("Email assets POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const auth = await getAdminFromCookies();
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await request.json();
    const assets = await getAssets();
    await saveAssets(assets.filter((a) => a.id !== id));
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Email assets DELETE error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export const maxDuration = 30;
