import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const ACHIEVEMENTS = {
  A1_MATCH:      { name: "Buen arranque",         description: "Acertar 28 o más partidos de fase de grupos",                          points: 2000  },
  A2_MATCH:      { name: "Especialista",           description: "Acertar 40 o más partidos de fase de grupos",                          points: 9000  },
  A3_MATCH:      { name: "Máquina de grupos",      description: "Acertar 54 o más partidos de fase de grupos",                          points: 22000 },
  B1_CLASSIFIED: { name: "Ojo de halcón",          description: "Acertar 14 o más equipos clasificados de grupos",                      points: 3000  },
  B2_CLASSIFIED: { name: "Ojo clínico",            description: "Acertar 19 o más equipos clasificados de grupos",                      points: 10000 },
  B3_CLASSIFIED: { name: "Tabla casi perfecta",    description: "Acertar 22 o más equipos clasificados de grupos",                      points: 25000 },
  C1_BRACKET:    { name: "Bracket fuerte",         description: "Acertar el 65% o más de las predicciones de eliminatorias",            points: 6000  },
  C2_BRACKET:    { name: "Bracket experto",        description: "Acertar el 80% o más de las predicciones de eliminatorias",            points: 18000 },
  C3_BRACKET:    { name: "Bracket perfecto",       description: "Acertar toda la llave eliminatoria",                                   points: 48000 },
  D_PERFECT_TABLE: { name: "Tabla perfecta",       description: "Acertar el 1° y 2° exacto en los 12 grupos",                          points: 28000 },
  X1_SOLIDO:     { name: "Prode sólido",           description: "Ser Especialista + Ojo clínico + Bracket fuerte (o superior)",         points: 20000 },
  X2_EXPERTO:    { name: "Prode experto",          description: "Ser Máquina + Tabla casi perfecta + Bracket experto (o superior)",     points: 50000 },
  X3_PERFECTO:   { name: "Prode perfecto",         description: "Máquina + Tabla casi perfecta + Bracket perfecto + Tabla perfecta",    points: 80000 },
};

async function main() {
  console.log("Seeding achievement rules...");

  for (const [key, rule] of Object.entries(ACHIEVEMENTS)) {
    await prisma.achievementRule.upsert({
      where: { key },
      update: { name: rule.name, description: rule.description, points: rule.points, active: true },
      create: { key, name: rule.name, description: rule.description, points: rule.points, active: true },
    });
  }

  // Deactivate old keys no longer in use
  const activeKeys = Object.keys(ACHIEVEMENTS);
  const deactivated = await prisma.achievementRule.updateMany({
    where: { key: { notIn: activeKeys } },
    data: { active: false },
  });

  console.log(`Achievement rules seeded: ${activeKeys.length} active, ${deactivated.count} deactivated.`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
