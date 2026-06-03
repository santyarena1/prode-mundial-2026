import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import nodemailer from "nodemailer";

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
      const to = setting?.value?.trim() || process.env.SMTP_USER;
      if (to) {
        const transporter = nodemailer.createTransport({
          host:   process.env.SMTP_HOST || "smtp.gmail.com",
          port:   parseInt(process.env.SMTP_PORT || "465"),
          secure: process.env.SMTP_SECURE === "true",
          auth:   { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
        });
        await transporter.sendMail({
          from:    `"Prode Mundial 2026" <${process.env.EMAIL_FROM_ADDRESS || process.env.SMTP_USER}>`,
          to,
          subject: `[Contacto] ${subject.trim()}`,
          text:    `Nuevo mensaje de contacto\n\nNombre: ${name}\nEmail: ${email}\nAsunto: ${subject}\n\n${message}`,
          html:    `<h2>Nuevo mensaje de contacto</h2><p><b>Nombre:</b> ${name}</p><p><b>Email:</b> ${email}</p><p><b>Asunto:</b> ${subject}</p><hr/><p style="white-space:pre-wrap">${message}</p>`,
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
