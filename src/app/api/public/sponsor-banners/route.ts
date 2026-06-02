import { NextResponse } from "next/server";
import prisma from "@/lib/db";

export async function GET() {
  try {
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
      "sponsor_banner_predictions_text_color",
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
        bgColor: get("sponsor_banner_predictions_bg_color") || "#111111",
        buttonColor: get("sponsor_banner_predictions_button_color") || "#dc2626",
        textColor: get("sponsor_banner_predictions_text_color") || "#9ca3af",
        visible: get("sponsor_banner_predictions_visible") === "true",
      },
    });
  } catch (error) {
    console.error("Sponsor banners GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
