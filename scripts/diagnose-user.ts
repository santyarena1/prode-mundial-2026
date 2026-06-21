/**
 * Imprime el estado completo de un usuario y sus referidos.
 * Uso: npx tsx scripts/diagnose-user.ts <email>
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const email = (process.argv[2] || "").trim().toLowerCase();
  if (!email) {
    console.error("Falta el email. Uso: npx tsx scripts/diagnose-user.ts <email>");
    process.exit(1);
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      createdAt: true,
      totalPoints: true,
      predictionPoints: true,
      bonusPoints: true,
      achievementPoints: true,
      spentPoints: true,
      referralPoints: true,
      referralCode: true,
      referredById: true,
      emailVerified: true,
      referralBonusAwarded: true,
      emailVerificationToken: true,
      emailVerificationExpiry: true,
    },
  });

  if (!user) {
    console.error(`No existe usuario con email ${email}`);
    process.exit(1);
  }

  console.log("\n=== USUARIO ===");
  console.table([user]);

  if (user.referredById) {
    const refBy = await prisma.user.findUnique({
      where: { id: user.referredById },
      select: { id: true, email: true, firstName: true, referralCode: true, referralPoints: true, totalPoints: true, emailVerified: true },
    });
    console.log("\n=== REFERIDO POR ===");
    console.table([refBy]);
  }

  const referidos = await prisma.user.findMany({
    where: { referredById: user.id },
    select: {
      id: true,
      email: true,
      firstName: true,
      createdAt: true,
      emailVerified: true,
      referralBonusAwarded: true,
      totalPoints: true,
    },
    orderBy: { createdAt: "desc" },
  });
  console.log(`\n=== REFERIDOS POR ESTE USUARIO (${referidos.length}) ===`);
  if (referidos.length) console.table(referidos);

  // Resumen de puntos: cuánto le faltaría sumar de referidos no aplicados
  const pendingFromUnverified = referidos.filter((r) => !r.referralBonusAwarded).length;
  if (pendingFromUnverified > 0) {
    console.log(`\n⚠  ${pendingFromUnverified} referido(s) todavía no verificaron — el bonus para el referidor NO se acreditó.`);
  }

  const bonuses = await prisma.userBonus.findMany({
    where: { userId: user.id },
    include: { bonusAction: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  });
  console.log(`\n=== BONUSES (${bonuses.length}) ===`);
  if (bonuses.length) {
    console.table(
      bonuses.map((b) => ({
        action: b.bonusAction?.name ?? "?",
        status: b.status,
        pointsEarned: b.pointsEarned,
        createdAt: b.createdAt,
      }))
    );
  }

  const predictions = await prisma.prediction.count({ where: { userId: user.id } });
  const predWithPoints = await prisma.prediction.count({ where: { userId: user.id, pointsEarned: { gt: 0 } } });
  console.log(`\n=== PREDICCIONES ===`);
  console.log(`Total: ${predictions}  |  Con puntos > 0: ${predWithPoints}`);

  console.log("\nDiagnóstico:");
  console.log(`  emailVerified           = ${user.emailVerified}`);
  console.log(`  referralBonusAwarded    = ${user.referralBonusAwarded}`);
  console.log(`  referralPoints (campo)  = ${user.referralPoints}`);
  console.log(`  bonusPoints (computado) = ${user.bonusPoints}`);
  console.log(`  totalPoints             = ${user.totalPoints}`);
  if (user.emailVerified === false) {
    console.log("  → Este usuario tiene emailVerified=false. Si registró antes del deploy, algo lo cambió.");
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
