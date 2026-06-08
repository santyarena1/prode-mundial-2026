import { NextResponse } from "next/server";
import prisma from "@/lib/db";

const KEYS = [
  "sponsor_banner_dashboard_banners",
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
    const rows = await prisma.setting.findMany({ where: { key: { in: KEYS } } });
    const get = (k: string) => rows.find(r => r.key === k)?.value ?? "";

    const rawBanners = get("sponsor_banner_dashboard_banners");
    let dashboardBanners: Array<{ imageUrl: string; linkUrl: string; visible: boolean }> = [];
    if (rawBanners) {
      try { dashboardBanners = JSON.parse(rawBanners); } catch { dashboardBanners = []; }
    } else {
      const singleImage = get("sponsor_banner_dashboard_image_url");
      if (singleImage) {
        dashboardBanners = [{
          imageUrl: singleImage,
          linkUrl: get("sponsor_banner_dashboard_link_url"),
          visible: get("sponsor_banner_dashboard_visible") === "true",
        }];
      }
    }

    return NextResponse.json({
      dashboard: { banners: dashboardBanners },
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
