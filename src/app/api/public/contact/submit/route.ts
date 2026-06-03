import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import prisma from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const { name, email, subject, message } = await req.json();

    if (!name?.trim() || !email?.trim() || !subject?.trim() || !message?.trim()) {
      return NextResponse.json({ error: "Todos los campos son requeridos" }, { status: 400 });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Email inválido" }, { status: 400 });
    }
    if (message.length > 2000) {
      return NextResponse.json({ error: "El mensaje no puede superar 2000 caracteres" }, { status: 400 });
    }

    await prisma.contactMessage.create({
      data: { name: name.trim(), email: email.trim().toLowerCase(), subject: subject.trim(), message: message.trim() },
    });

    // Send email notification to configured address (best-effort)
    try {
      const setting = await prisma.setting.findUnique({ where: { key: "contact_email" } });
      const to = setting?.value?.trim() || process.env.RESEND_FROM?.match(/<(.+)>/)?.[1];
      if (to && process.env.RESEND_API_KEY) {
        const resend = new Resend(process.env.RESEND_API_KEY.replace(/^﻿/, "").trim());
        const from = process.env.RESEND_FROM || "Prode Mundial Gamer <no-reply@thegamershop-premios.com>";
        await resend.emails.send({
          from,
          to,
          subject: `[Contacto] ${subject.trim()}`,
          html: `<h2>Nuevo mensaje de contacto</h2><p><b>Nombre:</b> ${name}</p><p><b>Email:</b> ${email}</p><p><b>Asunto:</b> ${subject}</p><hr/><p style="white-space:pre-wrap">${message}</p>`,
        });
      }
    } catch {
      // Non-fatal — message is already saved to DB
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Contact submit error:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
