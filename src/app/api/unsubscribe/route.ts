import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { verifyUnsubscribeToken } from "@/lib/email";

export async function GET(request: NextRequest) {
  const userId = request.nextUrl.searchParams.get("userId");
  const token = request.nextUrl.searchParams.get("token");

  if (!userId || !token || !verifyUnsubscribeToken(userId, token)) {
    return new NextResponse(unsubscribePage("Link inválido o expirado.", false), {
      headers: { "Content-Type": "text/html" },
    });
  }

  try {
    await prisma.user.update({
      where: { id: userId },
      data: { emailUnsubscribed: true },
    });

    return new NextResponse(unsubscribePage("Te desuscribiste correctamente. Ya no recibirás comunicaciones del Prode.", true), {
      headers: { "Content-Type": "text/html" },
    });
  } catch {
    return new NextResponse(unsubscribePage("Ocurrió un error. Intentá de nuevo.", false), {
      headers: { "Content-Type": "text/html" },
    });
  }
}

function unsubscribePage(message: string, success: boolean): string {
  const color = success ? "#22c55e" : "#ef4444";
  const icon = success ? "✅" : "❌";
  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><title>Desuscripción</title>
<meta name="viewport" content="width=device-width,initial-scale=1.0">
</head>
<body style="margin:0;background:#0a0a0a;font-family:-apple-system,sans-serif;min-height:100vh;display:flex;align-items:center;justify-content:center;">
  <div style="max-width:420px;margin:32px auto;background:#111;border-radius:12px;padding:40px 32px;text-align:center;border:1px solid #222;">
    <div style="font-size:48px;margin-bottom:16px;">${icon}</div>
    <h1 style="color:#fff;font-size:20px;font-weight:800;margin:0 0 12px;">Prode Mundial Gamer 2026</h1>
    <p style="color:${color};font-size:15px;line-height:1.6;margin:0 0 24px;">${message}</p>
    <a href="/" style="color:#9ca3af;font-size:13px;text-decoration:underline;">Volver al inicio</a>
  </div>
</body>
</html>`;
}
