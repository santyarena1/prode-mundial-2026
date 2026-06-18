import { PrismaClient } from "@prisma/client";
import { calculateUserPoints } from "../src/lib/points";

const prisma = new PrismaClient();

async function main() {
  const matches = await prisma.match.findMany({
    where: {
      status: "finished",
      homeScore: { not: null },
      awayScore: { not: null },
    },
    select: { id: true, homeScore: true, awayScore: true, realOutcome: true },
  });

  let fixed = 0;
  const affectedMatchIds: string[] = [];
  for (const m of matches) {
    const expected =
      m.homeScore! > m.awayScore!
        ? "home"
        : m.awayScore! > m.homeScore!
        ? "away"
        : "draw";
    if (m.realOutcome !== expected) {
      await prisma.match.update({
        where: { id: m.id },
        data: { realOutcome: expected },
      });
      affectedMatchIds.push(m.id);
      fixed++;
    }
  }

  console.log(`Fixed realOutcome on ${fixed} match(es).`);

  if (affectedMatchIds.length > 0) {
    const userIds = await prisma.prediction.findMany({
      where: { matchId: { in: affectedMatchIds } },
      select: { userId: true },
      distinct: ["userId"],
    });
    console.log(`Recalculating points for ${userIds.length} user(s)...`);
    for (const { userId } of userIds) {
      await calculateUserPoints(userId);
    }
  } else {
    console.log("Recalculating points for all users with predictions on finished matches (safety pass)...");
    const userIds = await prisma.prediction.findMany({
      where: { match: { status: "finished" } },
      select: { userId: true },
      distinct: ["userId"],
    });
    for (const { userId } of userIds) {
      await calculateUserPoints(userId);
    }
    console.log(`Recalculated ${userIds.length} user(s).`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
