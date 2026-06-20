import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAdminFromCookies } from "@/lib/cookies";
import { buildAnnouncementHtml } from "@/lib/email";

const schema = z.object({
  subject: z.string().default(""),
  message: z.string().default(""),
  ctaUrl: z.string().optional().or(z.literal("")),
  ctaLabel: z.string().optional(),
  rawHtml: z.boolean().optional().default(false),
});

export async function POST(request: NextRequest) {
  const auth = await getAdminFromCookies();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation error" }, { status: 400 });
  }

  const { subject, message, ctaUrl, ctaLabel, rawHtml } = parsed.data;

  const html = rawHtml
    ? message || "<p style='font-family:sans-serif;color:#666;padding:24px;'>Sin contenido</p>"
    : buildAnnouncementHtml({
        subject: subject || "Asunto del email",
        message: message || "Aquí va el cuerpo del mensaje.",
        ctaUrl: ctaUrl || undefined,
        ctaLabel: ctaLabel || undefined,
        userId: "preview",
        firstName: "Juan",
      });

  return new NextResponse(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
