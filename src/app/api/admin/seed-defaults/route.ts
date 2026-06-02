import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getAdminFromCookies } from "@/lib/cookies";

const DEFAULT_PRIZES = [
  // ── Muy accesibles
  { name: "Participación en sorteo semanal",     description: "Entrás al sorteo semanal de TGS entre todos los que canjeen este premio.",                     requiredPoints: 1000,   stock: 0, prizeType: "raffle",   sortOrder: 1,  featured: true,  active: true },
  { name: "Cupón chico / beneficio simple",      description: "Cupón de beneficio simple canjeable en The Gamer Shop.",                                       requiredPoints: 3000,   stock: 0, prizeType: "coupon",   sortOrder: 2,  featured: false, active: true },
  { name: "Cupón 5% OFF",                        description: "Descuento del 5% en tu próxima compra en The Gamer Shop.",                                     requiredPoints: 5000,   stock: 0, prizeType: "coupon",   sortOrder: 3,  featured: false, active: true },
  { name: "Cupón 10% OFF en accesorios",         description: "Descuento del 10% en accesorios gamer en The Gamer Shop.",                                     requiredPoints: 10000,  stock: 0, prizeType: "coupon",   sortOrder: 4,  featured: false, active: true },
  // ── Chicos
  { name: "Sticker pack TGS",                   description: "Pack de stickers y merchandising exclusivo de The Gamer Shop.",                                requiredPoints: 15000,  stock: 0, prizeType: "physical", sortOrder: 5,  featured: false, active: true },
  { name: "Envío bonificado",                    description: "Envío gratis en tu próxima compra en The Gamer Shop.",                                         requiredPoints: 18000,  stock: 0, prizeType: "coupon",   sortOrder: 6,  featured: false, active: true },
  { name: "Mousepad gamer",                      description: "Mousepad gamer de tamaño XL con diseño exclusivo TGS.",                                       requiredPoints: 25000,  stock: 0, prizeType: "physical", sortOrder: 7,  featured: false, active: true },
  { name: "Gift card TGS",                       description: "Gift card para gastar en The Gamer Shop.",                                                     requiredPoints: 35000,  stock: 0, prizeType: "digital",  sortOrder: 8,  featured: false, active: true },
  // ── Medianos
  { name: "Merch sponsor",                       description: "Producto de merchandising de una de las marcas sponsor del Prode.",                            requiredPoints: 50000,  stock: 0, prizeType: "physical", sortOrder: 9,  featured: true,  active: true },
  { name: "Mouse gamer",                         description: "Mouse gamer con switch óptico y diseño ergonómico.",                                           requiredPoints: 75000,  stock: 0, prizeType: "physical", sortOrder: 10, featured: false, active: true },
  { name: "Auricular gamer",                     description: "Auricular gamer con micrófono y sonido envolvente.",                                           requiredPoints: 95000,  stock: 0, prizeType: "physical", sortOrder: 11, featured: false, active: true },
  { name: "Teclado gamer",                       description: "Teclado gamer con iluminación RGB.",                                                           requiredPoints: 120000, stock: 0, prizeType: "physical", sortOrder: 12, featured: false, active: true },
  // ── Grandes
  { name: "Gift card importante",                description: "Gift card de alto valor para gastar en The Gamer Shop.",                                       requiredPoints: 150000, stock: 0, prizeType: "digital",  sortOrder: 13, featured: false, active: true },
  { name: "Periférico gamer sponsor",            description: "Periférico gamer de alta gama de una de las marcas sponsor. Stock muy limitado.",              requiredPoints: 180000, stock: 3, prizeType: "physical", sortOrder: 14, featured: false, active: true },
  { name: "Combo gamer sponsor",                 description: "Combo completo de periféricos gamer de marcas sponsor. Casi imposible de alcanzar.",           requiredPoints: 220000, stock: 2, prizeType: "physical", sortOrder: 15, featured: false, active: true },
  { name: "Gran premio mundialero TGS",          description: "El premio máximo del Prode 2026. Solo para el prode casi perfecto. Premio sorpresa de TGS.",   requiredPoints: 250000, stock: 1, prizeType: "jackpot",  sortOrder: 16, featured: true,  active: true },
];

const DEFAULT_BONUS_ACTIONS = [
  { name: "Registrarse y completar perfil",      description: "Completá tu perfil con todos tus datos en la plataforma.",                                                               points: 300,  requiresApproval: false, limitPerUser: 1,    active: true },
  { name: "Completar todo el prode inicial",     description: "Cargá al menos una predicción en partidos, grupos y eliminatorias.",                                                     points: 1500, requiresApproval: false, limitPerUser: 1,    active: true },
  { name: "Seguir Instagram TGS",                description: "Seguí la cuenta oficial de The Gamer Shop en Instagram y enviá captura como evidencia.",                                 points: 300,  requiresApproval: true,  limitPerUser: 1,    active: true },
  { name: "Seguir TikTok TGS",                   description: "Seguí la cuenta oficial de The Gamer Shop en TikTok y enviá captura como evidencia.",                                    points: 300,  requiresApproval: true,  limitPerUser: 1,    active: true },
  { name: "Suscribirse a YouTube TGS",           description: "Suscribite al canal de YouTube de The Gamer Shop y enviá captura como evidencia.",                                       points: 400,  requiresApproval: true,  limitPerUser: 1,    active: true },
  { name: "Compartir historia etiquetando TGS",  description: "Compartí una historia en Instagram etiquetando @thegamershop con tu predicción o resultado.",                           points: 700,  requiresApproval: true,  limitPerUser: 3,    active: true },
  { name: "Seguir sponsor del Prode",            description: "Seguí en redes a una de las marcas sponsor del Prode Mundial TGS y enviá captura.",                                     points: 400,  requiresApproval: true,  limitPerUser: 1,    active: true },
  { name: "Invitar amigo validado",              description: "Invitá a un amigo a registrarse. Los puntos se acreditan cuando el amigo complete su primer predicción.",               points: 1000, requiresApproval: true,  limitPerUser: 5,    active: true },
  { name: "Ver partido en el local TGS",         description: "Vení a ver un partido del Mundial desde el local de The Gamer Shop y registrate en el evento.",                         points: 1500, requiresApproval: true,  limitPerUser: 5,    active: true },
  { name: "Código de compra",                    description: "Cada $150 de compra en TGS = 1 punto. Presentá tu comprobante y el admin calcula los puntos automáticamente.",         points: 1,    requiresApproval: true,  limitPerUser: null, active: true },
];

export async function POST() {
  try {
    const auth = await getAdminFromCookies();
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    let prizesCreated = 0;
    for (const prize of DEFAULT_PRIZES) {
      const existing = await prisma.prize.findFirst({ where: { name: prize.name } });
      if (!existing) {
        await prisma.prize.create({ data: prize });
        prizesCreated++;
      }
    }

    // Remove outdated purchase code bonus actions (old 3-tier system)
    const obsoleteNames = [
      "Código compra chica",
      "Código compra media",
      "Código compra mediana",
      "Código compra grande",
    ];
    const deleted = await prisma.bonusAction.deleteMany({
      where: { name: { in: obsoleteNames } },
    });

    let bonusCreated = 0;
    for (const bonus of DEFAULT_BONUS_ACTIONS) {
      const existing = await prisma.bonusAction.findFirst({ where: { name: bonus.name } });
      if (!existing) {
        await prisma.bonusAction.create({ data: bonus });
        bonusCreated++;
      }
    }

    // Migrate existing earlyBird users: create PrizeRedemption if they don't have one
    const rafflePrize = await prisma.prize.findFirst({
      where: { prizeType: "raffle", active: true },
      orderBy: { createdAt: "asc" },
    });
    let earlyBirdMigrated = 0;
    if (rafflePrize) {
      const earlyBirdUsers = await prisma.user.findMany({
        where: { earlyBirdGranted: true },
        select: { id: true },
      });
      for (const u of earlyBirdUsers) {
        const existing = await prisma.prizeRedemption.findFirst({
          where: { userId: u.id, prizeId: rafflePrize.id, pointsSpent: 0 },
        });
        if (!existing) {
          await prisma.prizeRedemption.create({
            data: { userId: u.id, prizeId: rafflePrize.id, pointsSpent: 0, status: "approved" },
          });
          earlyBirdMigrated++;
        }
      }
    }

    return NextResponse.json({
      success: true,
      prizes: prizesCreated,
      bonusActions: bonusCreated,
      deletedObsolete: deleted.count,
      earlyBirdMigrated,
      message: `Creados: ${prizesCreated} premios nuevos, ${bonusCreated} bonus nuevos. Eliminados: ${deleted.count} bonus obsoletos. Migrados: ${earlyBirdMigrated} tickets early bird.`,
    });
  } catch (error) {
    console.error("Seed defaults error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
