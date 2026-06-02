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

const PRED_KEYS = [
  "sponsor_banner_dashboard_image_url",
  "sponsor_banner_dashboard_link_url",
  "sponsor_banner_dashboard_visible",
  "sponsor_banner_predictions_text",
  "sponsor_banner_predictions_text_color",
  "sponsor_banner_predictions_text_accent",
  "sponsor_banner_predictions_text_accent_color",
  "sponsor_banner_predictions_button_label",
  "sponsor_banner_predictions_button_url",
  "sponsor_banner_predictions_button_text_color",
  "sponsor_banner_predictions_button_logo_url",
  "sponsor_banner_predictions_button_logo2_url",
  "sponsor_banner_predictions_logo_position",
  "sponsor_banner_predictions_bg_color",
  "sponsor_banner_predictions_button_color",
  "sponsor_banner_predictions_visible",
];

export async function GET() {
  try {
    const auth = await getAdminFromCookies();
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const rows = await prisma.setting.findMany({ where: { key: { in: PRED_KEYS } } });
    const get = (k: string) => rows.find(r => r.key === k)?.value ?? "";

    return NextResponse.json({
      dashboard: {
        imageUrl: get("sponsor_banner_dashboard_image_url"),
        linkUrl: get("sponsor_banner_dashboard_link_url"),
        visible: get("sponsor_banner_dashboard_visible") === "true",
      },
      predictions: {
        text: get("sponsor_banner_predictions_text"),
        textColor: get("sponsor_banner_predictions_text_color") || "#9ca3af",
        textAccent: get("sponsor_banner_predictions_text_accent"),
        textAccentColor: get("sponsor_banner_predictions_text_accent_color") || "#ffffff",
        buttonLabel: get("sponsor_banner_predictions_button_label"),
        buttonUrl: get("sponsor_banner_predictions_button_url"),
        buttonTextColor: get("sponsor_banner_predictions_button_text_color") || "#ffffff",
        buttonLogoUrl: get("sponsor_banner_predictions_button_logo_url"),
        buttonLogo2Url: get("sponsor_banner_predictions_button_logo2_url"),
        logoPosition: get("sponsor_banner_predictions_logo_position") || "left",
        bgColor: get("sponsor_banner_predictions_bg_color") || "#111111",
        buttonColor: get("sponsor_banner_predictions_button_color") || "#dc2626",
        visible: get("sponsor_banner_predictions_visible") === "true",
      },
    });
  } catch (error) {
    console.error("Sponsor banners GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

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

export async function PUT(request: NextRequest) {
  try {
    const auth = await getAdminFromCookies();
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const p = body.predictions ?? {};

    const pairs: [string, string][] = [
      ["sponsor_banner_dashboard_image_url", body.dashboard?.imageUrl ?? ""],
      ["sponsor_banner_dashboard_link_url", body.dashboard?.linkUrl ?? ""],
      ["sponsor_banner_dashboard_visible", String(body.dashboard?.visible ?? false)],
      ["sponsor_banner_predictions_text", p.text ?? ""],
      ["sponsor_banner_predictions_text_color", p.textColor ?? "#9ca3af"],
      ["sponsor_banner_predictions_text_accent", p.textAccent ?? ""],
      ["sponsor_banner_predictions_text_accent_color", p.textAccentColor ?? "#ffffff"],
      ["sponsor_banner_predictions_button_label", p.buttonLabel ?? ""],
      ["sponsor_banner_predictions_button_url", p.buttonUrl ?? ""],
      ["sponsor_banner_predictions_button_text_color", p.buttonTextColor ?? "#ffffff"],
      ["sponsor_banner_predictions_button_logo_url", p.buttonLogoUrl ?? ""],
      ["sponsor_banner_predictions_button_logo2_url", p.buttonLogo2Url ?? ""],
      ["sponsor_banner_predictions_logo_position", p.logoPosition ?? "left"],
      ["sponsor_banner_predictions_bg_color", p.bgColor ?? "#111111"],
      ["sponsor_banner_predictions_button_color", p.buttonColor ?? "#dc2626"],
      ["sponsor_banner_predictions_visible", String(p.visible ?? false)],
    ];

    await Promise.all(pairs.map(([k, v]) => upsertSetting(k, v)));
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Sponsor banners PUT error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
