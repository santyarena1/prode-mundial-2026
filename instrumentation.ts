export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { PrismaClient } = await import("@prisma/client");
    const { DEFAULT_ACHIEVEMENTS, DEFAULT_POINT_RULES } = await import("@/lib/points");
    const prisma = new PrismaClient();

    try {
      // Sync point rules
      for (const [key, rule] of Object.entries(DEFAULT_POINT_RULES)) {
        await prisma.pointRule.upsert({
          where:  { key },
          update: { label: rule.label, points: rule.points },
          create: { key, label: rule.label, points: rule.points },
        });
      }
      await prisma.pointRule.updateMany({
        where: { key: { notIn: Object.keys(DEFAULT_POINT_RULES) } },
        data:  { active: false },
      });

      // Sync achievement rules
      for (const [key, rule] of Object.entries(DEFAULT_ACHIEVEMENTS)) {
        await prisma.achievementRule.upsert({
          where:  { key },
          update: { name: rule.name, description: rule.description, points: rule.points, active: true },
          create: { key, name: rule.name, description: rule.description, points: rule.points, active: true },
        });
      }
      await prisma.achievementRule.updateMany({
        where: { key: { notIn: Object.keys(DEFAULT_ACHIEVEMENTS) } },
        data:  { active: false },
      });
    } catch {
      // Non-fatal: rules will work with whatever is already in DB
    } finally {
      await prisma.$disconnect();
    }
  }
}
