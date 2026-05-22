import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { buildWhatsAppUrl } from "@/lib/purchase-code";

const DEFAULT_WHATSAPP = "5491112345678";
const DEFAULT_PURCHASE_MESSAGE =
  "Hola The Gamer Shop! Compré en el local y quiero mi código para sumar puntos en el Prode Mundial 2026. Mi email de registro es: ";
const DEFAULT_VENUE_MESSAGE =
  "Hola The Gamer Shop! Estoy en el local viendo el partido y necesito info sobre el código exclusivo del Prode. Mi email es: ";

export async function GET() {
  try {
    const settings = await prisma.setting.findMany({
      where: {
        key: {
          in: [
            "whatsapp_number",
            "whatsapp_purchase_message",
            "whatsapp_venue_message",
            "instagram_url",
          ],
        },
      },
    });
    const map = Object.fromEntries(settings.map((s) => [s.key, s.value]));
    const whatsappNumber = map.whatsapp_number?.trim() || DEFAULT_WHATSAPP;
    const whatsappPurchaseMessage =
      map.whatsapp_purchase_message?.trim() || DEFAULT_PURCHASE_MESSAGE;
    const whatsappVenueMessage =
      map.whatsapp_venue_message?.trim() || DEFAULT_VENUE_MESSAGE;
    const whatsappUrl = buildWhatsAppUrl(whatsappNumber, whatsappPurchaseMessage);

    const instagramUrl =
      map.instagram_url?.trim() ||
      "https://www.instagram.com/thegamershop/";

    return NextResponse.json({
      whatsappNumber,
      whatsappMessage: whatsappPurchaseMessage,
      whatsappPurchaseMessage,
      whatsappVenueMessage,
      whatsappUrl,
      instagramUrl,
    });
  } catch (error) {
    console.error("Public contact GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
