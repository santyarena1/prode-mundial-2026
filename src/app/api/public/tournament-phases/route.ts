import { NextResponse } from "next/server";
import { getTournamentPhaseState } from "@/lib/tournament-phase";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const state = await getTournamentPhaseState();
    return NextResponse.json(state);
  } catch (error) {
    console.error("tournament-phases GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
