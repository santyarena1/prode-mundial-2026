import { NextResponse } from "next/server";
import prisma from "@/lib/db";

export async function GET() {
  try {
    const settings = await prisma.setting.findMany({
      where: {
        key: {
          in: [
            "store_1_name", "store_1_address", "store_1_maps_url",
            "store_1_instagram", "store_1_instagram_url",
            "store_1_phone", "store_1_phone_url",
            "store_2_name", "store_2_address", "store_2_maps_url",
            "store_2_instagram", "store_2_instagram_url",
            "store_2_phone", "store_2_phone_url",
          ],
        },
      },
    });
    const m = Object.fromEntries(settings.map((s) => [s.key, s.value]));

    return NextResponse.json({
      website: "https://www.thegamershop.com.ar",
      stores: [
        {
          name:         m.store_1_name         || "Local 1",
          address:      m.store_1_address       || "",
          mapsUrl:      m.store_1_maps_url      || "",
          instagram:    m.store_1_instagram     || "",
          instagramUrl: m.store_1_instagram_url || "",
          phone:        m.store_1_phone         || "",
          phoneUrl:     m.store_1_phone_url     || "",
        },
        {
          name:         m.store_2_name         || "Local 2",
          address:      m.store_2_address       || "",
          mapsUrl:      m.store_2_maps_url      || "",
          instagram:    m.store_2_instagram     || "",
          instagramUrl: m.store_2_instagram_url || "",
          phone:        m.store_2_phone         || "",
          phoneUrl:     m.store_2_phone_url     || "",
        },
      ],
    });
  } catch (error) {
    console.error("Company GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
