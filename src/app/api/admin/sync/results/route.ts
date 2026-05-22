import { NextRequest, NextResponse } from "next/server";
import { getAdminFromCookies } from "@/lib/cookies";
import { syncResults } from "@/lib/sync";

export async function POST(request: NextRequest) {
  try {
    const cronSecret = request.headers.get("x-cron-secret");
    const isValidCron = cronSecret && cronSecret === process.env.CRON_SECRET;
    if (!isValidCron) {
      const auth = await getAdminFromCookies();
      if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const result = await syncResults();
    return NextResponse.json(result);
  } catch (error) {
    console.error("Sync results error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
