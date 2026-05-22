import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getAdminFromCookies } from "@/lib/cookies";

const DEFAULT_PRIZES = [
  {
    key: "weekly-raffle",
    name: "Participación en sorteo semanal",
    description: "Entrás al sorteo semanal de TGS entre todos los que canjeen este premio.",
    requiredPoints: 1000,
    stock: 0,
    prizeType: "raffle",
    sortOrder: 1,
    featured: true,
    active: true,
  },
  {
    key: "coupon-5off",
    name: "Cupón 5% OFF",
    description: "Descuento del 5% en tu próxima compra en The Gamer Shop.",
    requiredPoints: 5000,
    stock: 0,
    prizeType: "coupon",
    sortOrder: 2,
    featured: false,
    active: true,
  },
  {
    key: "coupon-10off",
    name: "Cupón 10% OFF en accesorios",
    description: "Descuento del 10% en accesorios gamer en The Gamer Shop.",
    requiredPoints: 8000,
    stock: 0,
    prizeType: "coupon",
    sortOrder: 3,
    featured: false,
    active: true,
  },
  {
    key: "free-shipping",
    name: "Envío bonificado",
    description: "Envío gratis en tu próxima compra en The Gamer Shop.",
    requiredPoints: 12000,
    stock: 0,
    prizeType: "coupon",
    sortOrder: 4,
    featured: false,
    active: true,
  },
  {
    key: "sticker-pack",
    name: "Sticker pack TGS",
    description: "Pack de stickers y merchandising exclusivo de The Gamer Shop.",
    requiredPoints: 15000,
    stock: 0,
    prizeType: "physical",
    sortOrder: 5,
    featured: false,
    active: true,
  },
  {
    key: "mousepad-basic",
    name: "Mousepad gamer",
    description: "Mousepad gamer de tamaño XL con diseño exclusivo TGS.",
    requiredPoints: 22000,
    stock: 0,
    prizeType: "physical",
    sortOrder: 6,
    featured: false,
    active: true,
  },
  {
    key: "merch-sponsor",
    name: "Merch sponsor",
    description: "Producto de merchandising de una de las marcas sponsor del Prode.",
    requiredPoints: 28000,
    stock: 0,
    prizeType: "physical",
    sortOrder: 7,
    featured: false,
    active: true,
  },
  {
    key: "gift-card-small",
    name: "Gift card TGS",
    description: "Gift card para gastar en The Gamer Shop.",
    requiredPoints: 35000,
    stock: 0,
    prizeType: "digital",
    sortOrder: 8,
    featured: false,
    active: true,
  },
  {
    key: "mouse-gaming",
    name: "Mouse gamer",
    description: "Mouse gamer de entrada con switch óptico y diseño ergonómico.",
    requiredPoints: 50000,
    stock: 0,
    prizeType: "physical",
    sortOrder: 9,
    featured: true,
    active: true,
  },
  {
    key: "headset-entry",
    name: "Auricular gamer",
    description: "Auricular gamer con micrófono y sonido envolvente.",
    requiredPoints: 65000,
    stock: 0,
    prizeType: "physical",
    sortOrder: 10,
    featured: false,
    active: true,
  },
  {
    key: "keyboard-gaming",
    name: "Teclado gamer",
    description: "Teclado gamer mecánico con iluminación RGB.",
    requiredPoints: 80000,
    stock: 0,
    prizeType: "physical",
    sortOrder: 11,
    featured: false,
    active: true,
  },
  {
    key: "jackpot",
    name: "Premio Jackpot TGS",
    description: "El premio máximo del Prode. Reservado para los mejores del ranking. Premio sorpresa de The Gamer Shop.",
    requiredPoints: 120000,
    stock: 1,
    prizeType: "jackpot",
    sortOrder: 12,
    featured: true,
    active: true,
  },
];

const DEFAULT_BONUS_ACTIONS = [
  {
    key: "complete-prode",
    name: "Completar el prode inicial",
    description: "Cargá al menos una predicción en cada categoría (partidos, grupos y eliminatorias).",
    points: 1000,
    requiresApproval: false,
    limitPerUser: 1,
    active: true,
  },
  {
    key: "follow-instagram",
    name: "Seguir Instagram TGS",
    description: "Seguí la cuenta oficial de The Gamer Shop en Instagram.",
    points: 500,
    requiresApproval: true,
    limitPerUser: 1,
    active: true,
  },
  {
    key: "follow-tiktok",
    name: "Seguir TikTok TGS",
    description: "Seguí la cuenta oficial de The Gamer Shop en TikTok.",
    points: 500,
    requiresApproval: true,
    limitPerUser: 1,
    active: true,
  },
  {
    key: "subscribe-youtube",
    name: "Suscribirse a YouTube TGS",
    description: "Suscribite al canal de YouTube de The Gamer Shop.",
    points: 700,
    requiresApproval: true,
    limitPerUser: 1,
    active: true,
  },
  {
    key: "share-story",
    name: "Compartir historia etiquetando TGS",
    description: "Compartí una historia en Instagram etiquetando @thegamershop con tu predicción o resultado.",
    points: 1000,
    requiresApproval: true,
    limitPerUser: 3,
    active: true,
  },
  {
    key: "purchase-small",
    name: "Código por compra chica",
    description: "Presentá el código que recibiste al comprar en The Gamer Shop (compra pequeña).",
    points: 1500,
    requiresApproval: true,
    limitPerUser: null,
    active: true,
  },
  {
    key: "purchase-medium",
    name: "Código por compra media",
    description: "Presentá el código que recibiste al comprar en The Gamer Shop (compra mediana).",
    points: 3000,
    requiresApproval: true,
    limitPerUser: null,
    active: true,
  },
  {
    key: "purchase-large",
    name: "Código por compra grande",
    description: "Presentá el código que recibiste al comprar en The Gamer Shop (compra grande).",
    points: 6000,
    requiresApproval: true,
    limitPerUser: null,
    active: true,
  },
  {
    key: "watch-at-venue",
    name: "Ver partido en el local TGS",
    description: "Vení a ver un partido del Mundial desde el local de The Gamer Shop y registrate en el evento.",
    points: 2500,
    requiresApproval: true,
    limitPerUser: 5,
    active: true,
  },
  {
    key: "invite-friend",
    name: "Invitar amigo validado",
    description: "Invitá a un amigo a registrarse en el prode. Los puntos se acreditan una vez que el amigo complete su primer predicción.",
    points: 1500,
    requiresApproval: true,
    limitPerUser: 5,
    active: true,
  },
];

export async function POST() {
  try {
    const auth = await getAdminFromCookies();
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    let prizesUpserted = 0;
    for (const prize of DEFAULT_PRIZES) {
      const { key, ...data } = prize;
      const existing = await prisma.prize.findFirst({ where: { name: prize.name } });
      if (!existing) {
        await prisma.prize.create({ data });
        prizesUpserted++;
      }
    }

    let bonusUpserted = 0;
    for (const bonus of DEFAULT_BONUS_ACTIONS) {
      const { key, ...data } = bonus;
      const existing = await prisma.bonusAction.findFirst({ where: { name: bonus.name } });
      if (!existing) {
        await prisma.bonusAction.create({ data });
        bonusUpserted++;
      }
    }

    return NextResponse.json({
      success: true,
      prizes: prizesUpserted,
      bonusActions: bonusUpserted,
      message: `Creados: ${prizesUpserted} premios nuevos, ${bonusUpserted} acciones de bonus nuevas (existentes no modificados).`,
    });
  } catch (error) {
    console.error("Seed defaults error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
