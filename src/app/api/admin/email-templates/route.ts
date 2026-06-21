import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/db";
import { getAdminFromCookies } from "@/lib/cookies";
import { sendWelcomeEmail, sendRedemptionEmail } from "@/lib/email";

export const TEMPLATE_KEYS = {
  welcome: {
    subject:  "email_tpl_welcome_subject",
    intro:    "email_tpl_welcome_intro",
    sub:      "email_tpl_welcome_sub",
    ctaLabel: "email_tpl_welcome_cta_label",
    ctaUrl:   "email_tpl_welcome_cta_url",
    html:     "email_tpl_welcome_html",      // raw HTML override (optional)
  },
  redemption: {
    subject:  "email_tpl_redemption_subject",
    intro:    "email_tpl_redemption_intro",
    ctaLabel: "email_tpl_redemption_cta_label",
    ctaUrl:   "email_tpl_redemption_cta_url",
    html:     "email_tpl_redemption_html",
  },
} as const;

export const TEMPLATE_DEFAULTS = {
  welcome: {
    subject:  "¡Bienvenido al Prode Mundial Gamer 2026, {firstName}! 🎮⚽",
    intro:    "Tu cuenta en el Prode Mundial Gamer 2026 fue creada exitosamente. Ya podés empezar a cargar tus predicciones y competir por los premios de The Gamer Shop.",
    sub:      "Cada acierto te suma puntos. Cada punto te acerca a tu premio. 🏆",
    ctaLabel: "CARGAR MIS PREDICCIONES →",
    ctaUrl:   "/predictions",
    html:     "",
  },
  redemption: {
    subject:  "¡Tu canje fue recibido, {firstName}! 🎁",
    intro:    "Recibimos tu solicitud de canje para {prizeName}. Lo estamos procesando y en breve nos ponemos en contacto para coordinar la entrega.",
    ctaLabel: "Ver mis premios",
    ctaUrl:   "/mis-premios",
    html:     "",
  },
} as const;

const putSchema = z.object({
  template: z.enum(["welcome", "redemption"]),
  subject:  z.string().max(300).optional(),
  intro:    z.string().max(2000).optional(),
  sub:      z.string().max(500).optional(),
  ctaLabel: z.string().max(100).optional(),
  ctaUrl:   z.string().max(300).optional(),
  html:     z.string().max(100000).optional(), // raw HTML (empty string = use default template)
});

const testSchema = z.object({
  template:  z.enum(["welcome", "redemption"]),
  email:     z.string().email(),
});

async function loadTemplate(name: keyof typeof TEMPLATE_KEYS) {
  const keys = TEMPLATE_KEYS[name];
  const allKeys = Object.values(keys);
  const rows = await prisma.setting.findMany({ where: { key: { in: allKeys } } });
  const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  const defaults = TEMPLATE_DEFAULTS[name] as Record<string, string>;
  return Object.fromEntries(
    Object.entries(keys).map(([field, key]) => [field, map[key] ?? defaults[field] ?? ""])
  );
}

export async function GET() {
  try {
    const auth = await getAdminFromCookies();
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const [welcome, redemption] = await Promise.all([
      loadTemplate("welcome"),
      loadTemplate("redemption"),
    ]);

    return NextResponse.json({ templates: { welcome, redemption } });
  } catch (error) {
    console.error("Email templates GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const auth = await getAdminFromCookies();
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const parsed = putSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });

    const { template, ...fields } = parsed.data;
    const keys = TEMPLATE_KEYS[template] as Record<string, string>;

    await Promise.all(
      Object.entries(fields)
        .filter(([, v]) => v !== undefined)
        .map(([field, value]) =>
          prisma.setting.upsert({
            where:  { key: keys[field] },
            update: { value: value as string },
            create: { key: keys[field], value: value as string },
          })
        )
    );

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Email templates PUT error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getAdminFromCookies();
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const parsed = testSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });

    const { template, email } = parsed.data;

    if (template === "welcome") {
      const sent = await sendWelcomeEmail({ firstName: "Admin", lastName: "Test", email });
      return NextResponse.json({ sent });
    }

    if (template === "redemption") {
      const sent = await sendRedemptionEmail({
        user: { id: "test", firstName: "Admin", email },
        prizeName: "Premio de prueba",
        pointsSpent: 5000,
      });
      return NextResponse.json({ sent });
    }

    return NextResponse.json({ error: "Template desconocido" }, { status: 400 });
  } catch (error) {
    console.error("Email templates POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
