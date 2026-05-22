/**
 * Clears all match/team/group data and re-syncs from API.
 * Run with: npx ts-node --esm prisma/reset-and-sync.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Clearing old fixture/team/group data...");

  // Order matters for FK constraints
  await prisma.syncLog.deleteMany({});
  await prisma.prediction.deleteMany({});
  await prisma.groupPrediction.deleteMany({});
  await prisma.bracketPrediction.deleteMany({});
  await (prisma as any).matchEvent.deleteMany({});
  await prisma.match.deleteMany({});
  await prisma.team.deleteMany({});
  await prisma.worldCupGroup.deleteMany({});

  console.log("All cleared. Now re-create 12 groups...");
  const letters = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L"];
  for (const name of letters) {
    await prisma.worldCupGroup.create({ data: { name } });
  }

  console.log("Done. Now call /api/admin/sync/fixtures from the running dev server.");
  console.log("e.g.: curl -X POST http://localhost:3000/api/admin/sync/fixtures -H 'x-cron-secret: change-this-cron-secret-in-production'");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
