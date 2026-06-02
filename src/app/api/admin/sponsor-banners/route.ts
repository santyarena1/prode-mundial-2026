import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { randomUUID } from "crypto";
import prisma from "@/lib/db";
import { getAdminFromCookies } from "@/lib/cookies";

const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif", "image/svg+xml"]);
const MAX_BYTES = 2 * 1024 * 1024;

async function uploadBannerImage(file: File, folder: string): Promise<string> {
  if (!ALLOWED_TYPES.has(file.type)) throw new Error("Formato no permitido. Usá JPG, PNG, WebP, GIF o SVG.");
  if (file.size > MAX_BYTES) throw new Error("La imagen no puede superar 2 MB.");
  const ext = file.type === "image/svg+xml" ? "svg" : (file.name.split(".").pop() || "png");
  const filename = `sponsor-banners/${folder}/${randomUUID()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  const blob = await put(filename, buffer, { access: "public", contentType: file.type });
  return blob.url;
}

async function upsertSetting(key: string, value: string) {
  await prisma.setting.upsert({ where: { key }, update: { value }, create: { key, value } });
}

// GET — return current banner settings
export async function GET() {
  try {
    const auth = await getAdminFromCookies();
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const keys = [
      "sponsor_banner_dashboard_image_url",
      "sponsor_banner_dashboard_link_url",
      "sponsor_banner_dashboard_visible",
      "sponsor_banner_predictions_text",
      "sponsor_banner_predictions_button_label",
      "sponsor_banner_predictions_button_url",
      "sponsor_banner_predictions_button_logo_url",
      "sponsor_banner_predictions_bg_color",
      "sponsor_banner_predictions_button_color",
      "sponsor_banner_predictions_visible",
    ];
    const rows = await prisma.setting.findMany({ where: { key: { in: keys } } });
    const get = (k: string) => rows.find(r => r.key === k)?.value ?? "";

    return NextResponse.json({
      dashboard: {
        imageUrl: get("sponsor_banner_dashboard_image_url"),
        linkUrl: get("sponsor_banner_dashboard_link_url"),
        visible: get("sponsor_banner_dashboard_visible") === "true",
      },
      predictions: {
        text: get("sponsor_banner_predictions_text"),
        buttonLabel: get("sponsor_banner_predictions_button_label"),
        buttonUrl: get("sponsor_banner_predictions_button_url"),
        buttonLogoUrl: get("sponsor_banner_predictions_button_logo_url"),
        bgColor: get("sponsor_banner_predictions_bg_color") || "#1a1a1a",
        buttonColor: get("sponsor_banner_predictions_button_color") || "#dc2626",
        visible: get("sponsor_banner_predictions_visible") === "true",
      },
    });
  } catch (error) {
    console.error("Sponsor banners GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST — upload an image, returns { url }
export async function POST(request: NextRequest) {
  try {
    const auth = await getAdminFromCookies();
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const form = await request.formData();
    const file = form.get("image");
    const folder = String(form.get("folder") || "general");

    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json({ error: "No se recibió ningún archivo" }, { status: 400 });
    }

    try {
      const url = await uploadBannerImage(file, folder);
      return NextResponse.json({ url });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error al subir imagen";
      return NextResponse.json({ error: message }, { status: 400 });
    }
  } catch (error) {
    console.error("Sponsor banners POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PUT — save all banner settings
export async function PUT(request: NextRequest) {
  try {
    const auth = await getAdminFromCookies();
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();

    const pairs: [string, string][] = [
      ["sponsor_banner_dashboard_image_url", body.dashboard?.imageUrl ?? ""],
      ["sponsor_banner_dashboard_link_url", body.dashboard?.linkUrl ?? ""],
      ["sponsor_banner_dashboard_visible", String(body.dashboard?.visible ?? false)],
      ["sponsor_banner_predictions_text", body.predictions?.text ?? ""],
      ["sponsor_banner_predictions_button_label", body.predictions?.buttonLabel ?? ""],
      ["sponsor_banner_predictions_button_url", body.predictions?.buttonUrl ?? ""],
      ["sponsor_banner_predictions_button_logo_url", body.predictions?.buttonLogoUrl ?? ""],
      ["sponsor_banner_predictions_bg_color", body.predictions?.bgColor ?? "#1a1a1a"],
      ["sponsor_banner_predictions_button_color", body.predictions?.buttonColor ?? "#dc2626"],
      ["sponsor_banner_predictions_visible", String(body.predictions?.visible ?? false)],
    ];

    await Promise.all(pairs.map(([k, v]) => upsertSetting(k, v)));
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Sponsor banners PUT error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
