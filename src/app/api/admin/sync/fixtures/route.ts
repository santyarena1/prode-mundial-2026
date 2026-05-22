import { NextRequest, NextResponse } from "next/server";
import { getAdminFromCookies } from "@/lib/cookies";
import { syncFixtures, syncTeams } from "@/lib/sync";

export async function POST(request: NextRequest) {
  try {
    const cronSecret = request.headers.get("x-cron-secret");
    const isValidCron = cronSecret && cronSecret === process.env.CRON_SECRET;
    if (!isValidCron) {
      const auth = await getAdminFromCookies();
      if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Sync teams first so fixture can resolve team IDs, then sync fixtures
    const teamsResult = await syncTeams();
    const fixturesResult = await syncFixtures();

    return NextResponse.json({ teams: teamsResult, fixtures: fixturesResult });
  } catch (error) {
    console.error("Sync fixtures error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
