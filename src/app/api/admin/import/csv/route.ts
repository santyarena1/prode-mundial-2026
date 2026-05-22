import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getAdminFromCookies } from "@/lib/cookies";

/**
 * POST /api/admin/import/csv
 * Body: { csv: string }
 * CSV format: matchCode,phase,groupName,homeCode,awayCode,startDate
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await getAdminFromCookies();
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { csv } = body;

    if (!csv || typeof csv !== "string") {
      return NextResponse.json({ error: "CSV content is required" }, { status: 400 });
    }

    const lines = csv.split("\n").map((l: string) => l.trim()).filter(Boolean);
    if (lines.length < 2) {
      return NextResponse.json({ error: "CSV must have a header row and at least one data row" }, { status: 400 });
    }

    const header = lines[0].split(",").map((h: string) => h.trim().toLowerCase());
    const getCol = (row: string[], colName: string) => {
      const idx = header.indexOf(colName);
      return idx >= 0 ? row[idx]?.trim() : "";
    };

    let created = 0;
    const errors: string[] = [];

    for (let i = 1; i < lines.length; i++) {
      const row = lines[i].split(",");
      try {
        const matchCode = getCol(row, "matchcode") || getCol(row, "match_code");
        const phase = getCol(row, "phase");
        const groupName = getCol(row, "groupname") || getCol(row, "group_name") || getCol(row, "group");
        const homeCode = getCol(row, "homecode") || getCol(row, "home_code") || getCol(row, "home");
        const awayCode = getCol(row, "awaycode") || getCol(row, "away_code") || getCol(row, "away");
        const startDate = getCol(row, "startdate") || getCol(row, "start_date") || getCol(row, "date");

        if (!matchCode || !phase) {
          errors.push(`Row ${i}: matchCode and phase are required`);
          continue;
        }

        // Find or create group
        let groupId: string | undefined;
        if (groupName) {
          let group = await prisma.worldCupGroup.findUnique({ where: { name: groupName } });
          if (!group) {
            group = await prisma.worldCupGroup.create({ data: { name: groupName } });
          }
          groupId = group.id;
        }

        // Find teams
        let homeTeamId: string | undefined;
        let awayTeamId: string | undefined;
        if (homeCode) {
          const team = await prisma.team.findUnique({ where: { code: homeCode.toUpperCase() } });
          homeTeamId = team?.id;
        }
        if (awayCode) {
          const team = await prisma.team.findUnique({ where: { code: awayCode.toUpperCase() } });
          awayTeamId = team?.id;
        }

        // Upsert match
        await prisma.match.upsert({
          where: { matchCode },
          update: {
            phase,
            groupId: groupId || null,
            homeTeamId: homeTeamId || null,
            awayTeamId: awayTeamId || null,
            homePlaceholder: homeTeamId ? null : homeCode || null,
            awayPlaceholder: awayTeamId ? null : awayCode || null,
            startDate: startDate ? new Date(startDate) : null,
          },
          create: {
            matchCode,
            phase,
            groupId: groupId || null,
            homeTeamId: homeTeamId || null,
            awayTeamId: awayTeamId || null,
            homePlaceholder: homeTeamId ? null : homeCode || null,
            awayPlaceholder: awayTeamId ? null : awayCode || null,
            startDate: startDate ? new Date(startDate) : null,
          },
        });
        created++;
      } catch (rowError) {
        errors.push(`Row ${i}: ${String(rowError)}`);
      }
    }

    return NextResponse.json({ created, errors, total: lines.length - 1 });
  } catch (error) {
    console.error("CSV import error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
