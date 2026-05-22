import { NextRequest, NextResponse } from "next/server";
import { getAdminFromCookies } from "@/lib/cookies";
import { syncStandings } from "@/lib/sync";

export async function POST(request: NextRequest) {
  try {
    const cronSecret = request.headers.get("x-cron-secret");
    if (!cronSecret || cronSecret !== process.env.CRON_SECRET) {
      const auth = await getAdminFromCookies();
      if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const result = await syncStandings();
    return NextResponse.json(result);
  } catch (error) {
    console.error("Sync standings error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
