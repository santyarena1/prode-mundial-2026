import { Resend } from "resend";
import { createHmac } from "crypto";

// ─── Templates ────────────────────────────────────────────────────────────────

function welcomeTemplate(firstName: string, lastName: string, email: string): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Bienvenido al Prode Mundial 2026</title>
  <!--[if mso]>
  <noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript>
  <![endif]-->
</head>
<body style="margin:0;padding:0;background-color:#0a0a0a;font-family:'Segoe UI',Arial,sans-serif;">

  <!-- Wrapper -->
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"
    style="background-color:#0a0a0a;min-height:100vh;">
    <tr>
      <td align="center" style="padding:32px 16px;">

        <!-- Card -->
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0"
          style="max-width:600px;width:100%;background-color:#111111;border-radius:16px;
                 border:1px solid #2a2a2a;overflow:hidden;
                 box-shadow:0 0 40px rgba(220,38,38,0.15);">

          <!-- Header / Hero -->
          <tr>
            <td style="background:linear-gradient(135deg,#1a0000 0%,#111111 40%,#0a0a0a 100%);
                       padding:40px 32px 32px;text-align:center;
                       border-bottom:2px solid #dc2626;">

              <!-- Logo placeholder -->
              <div style="display:inline-block;margin-bottom:16px;">
                <span style="font-size:36px;">🎮</span>
              </div>

              <p style="margin:0 0 4px;font-size:12px;font-weight:700;letter-spacing:4px;
                         color:#ef4444;text-transform:uppercase;">The Gamer Shop</p>

              <h1 style="margin:0 0 8px;font-size:28px;font-weight:900;color:#ffffff;
                          letter-spacing:2px;text-transform:uppercase;line-height:1.2;">
                Prode Mundial
              </h1>
              <h1 style="margin:0;font-size:28px;font-weight:900;
                          background:linear-gradient(90deg,#ef4444,#ff6b6b);
                          -webkit-background-clip:text;-webkit-text-fill-color:transparent;
                          letter-spacing:2px;text-transform:uppercase;line-height:1.2;">
                Gamer 2026 ⚽
              </h1>

            </td>
          </tr>

          <!-- Welcome message -->
          <tr>
            <td style="padding:36px 32px 24px;">

              <p style="margin:0 0 8px;font-size:14px;color:#9ca3af;letter-spacing:1px;
                         text-transform:uppercase;font-weight:600;">
                ¡Registro confirmado!
              </p>

              <h2 style="margin:0 0 24px;font-size:24px;font-weight:800;color:#ffffff;">
                Hola, ${firstName}! 👋
              </h2>

              <p style="margin:0 0 16px;font-size:16px;color:#d1d5db;line-height:1.7;">
                Tu cuenta en el <strong style="color:#ffffff;">Prode Mundial Gamer 2026</strong>
                fue creada exitosamente. Ya podés empezar a cargar tus predicciones y competir
                por los premios de <strong style="color:#ef4444;">The Gamer Shop</strong>.
              </p>

              <p style="margin:0 0 32px;font-size:15px;color:#9ca3af;line-height:1.6;">
                Cada acierto te suma puntos. Cada punto te acerca a tu premio. 🏆
              </p>

              <!-- CTA Button -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:0 auto 32px;">
                <tr>
                  <td style="border-radius:8px;background:linear-gradient(135deg,#dc2626,#b91c1c);
                              box-shadow:0 4px 20px rgba(220,38,38,0.4);">
                    <a href="${appUrl}/predictions"
                      style="display:inline-block;padding:16px 40px;font-size:15px;
                             font-weight:800;color:#ffffff;text-decoration:none;
                             letter-spacing:2px;text-transform:uppercase;">
                      CARGAR MIS PREDICCIONES →
                    </a>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- Divider -->
          <tr>
            <td style="padding:0 32px;">
              <div style="height:1px;background:linear-gradient(90deg,transparent,#2a2a2a,transparent);"></div>
            </td>
          </tr>

          <!-- How it works -->
          <tr>
            <td style="padding:28px 32px;">
              <p style="margin:0 0 20px;font-size:12px;font-weight:700;letter-spacing:3px;
                         color:#ef4444;text-transform:uppercase;">
                ¿Cómo funciona?
              </p>

              <!-- Step 1 -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"
                style="margin-bottom:14px;">
                <tr>
                  <td width="36" valign="top">
                    <div style="width:28px;height:28px;border-radius:50%;
                                background:linear-gradient(135deg,#dc2626,#7f1d1d);
                                text-align:center;line-height:28px;font-size:13px;
                                font-weight:800;color:#fff;">1</div>
                  </td>
                  <td style="padding-left:8px;">
                    <p style="margin:0;font-size:14px;color:#e5e7eb;font-weight:700;">
                      Completá tus predicciones
                    </p>
                    <p style="margin:2px 0 0;font-size:13px;color:#6b7280;">
                      Fase de grupos, octavos, semis y final
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Step 2 -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"
                style="margin-bottom:14px;">
                <tr>
                  <td width="36" valign="top">
                    <div style="width:28px;height:28px;border-radius:50%;
                                background:linear-gradient(135deg,#dc2626,#7f1d1d);
                                text-align:center;line-height:28px;font-size:13px;
                                font-weight:800;color:#fff;">2</div>
                  </td>
                  <td style="padding-left:8px;">
                    <p style="margin:0;font-size:14px;color:#e5e7eb;font-weight:700;">
                      Acumulá puntos con cada acierto
                    </p>
                    <p style="margin:2px 0 0;font-size:13px;color:#6b7280;">
                      Desde 500 pts (partido de grupos) hasta 30.000 pts (campeón)
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Step 3 -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td width="36" valign="top">
                    <div style="width:28px;height:28px;border-radius:50%;
                                background:linear-gradient(135deg,#dc2626,#7f1d1d);
                                text-align:center;line-height:28px;font-size:13px;
                                font-weight:800;color:#fff;">3</div>
                  </td>
                  <td style="padding-left:8px;">
                    <p style="margin:0;font-size:14px;color:#e5e7eb;font-weight:700;">
                      Canjeá tus puntos por premios
                    </p>
                    <p style="margin:2px 0 0;font-size:13px;color:#6b7280;">
                      Productos y beneficios exclusivos de The Gamer Shop
                    </p>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- Divider -->
          <tr>
            <td style="padding:0 32px;">
              <div style="height:1px;background:linear-gradient(90deg,transparent,#2a2a2a,transparent);"></div>
            </td>
          </tr>

          <!-- Account info -->
          <tr>
            <td style="padding:24px 32px;">
              <p style="margin:0 0 14px;font-size:12px;font-weight:700;letter-spacing:3px;
                         color:#ef4444;text-transform:uppercase;">
                Tus datos
              </p>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"
                style="background:#1a1a1a;border-radius:10px;border:1px solid #2a2a2a;">
                <tr>
                  <td style="padding:16px 20px;border-bottom:1px solid #2a2a2a;">
                    <p style="margin:0;font-size:12px;color:#6b7280;letter-spacing:1px;text-transform:uppercase;">
                      Nombre
                    </p>
                    <p style="margin:4px 0 0;font-size:15px;color:#ffffff;font-weight:600;">
                      ${firstName} ${lastName}
                    </p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:16px 20px;">
                    <p style="margin:0;font-size:12px;color:#6b7280;letter-spacing:1px;text-transform:uppercase;">
                      Email
                    </p>
                    <p style="margin:4px 0 0;font-size:15px;color:#ffffff;font-weight:600;">
                      ${email}
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Quick links -->
          <tr>
            <td style="padding:0 32px 28px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td width="33%" style="padding-right:6px;">
                    <a href="${appUrl}/predictions"
                      style="display:block;padding:12px 8px;background:#1a1a1a;
                             border:1px solid #2a2a2a;border-radius:8px;
                             text-align:center;text-decoration:none;
                             font-size:12px;font-weight:700;color:#e5e7eb;
                             letter-spacing:1px;text-transform:uppercase;">
                      ⚽ Predecir
                    </a>
                  </td>
                  <td width="33%" style="padding:0 3px;">
                    <a href="${appUrl}/ranking"
                      style="display:block;padding:12px 8px;background:#1a1a1a;
                             border:1px solid #2a2a2a;border-radius:8px;
                             text-align:center;text-decoration:none;
                             font-size:12px;font-weight:700;color:#e5e7eb;
                             letter-spacing:1px;text-transform:uppercase;">
                      🏆 Ranking
                    </a>
                  </td>
                  <td width="33%" style="padding-left:6px;">
                    <a href="${appUrl}/prizes"
                      style="display:block;padding:12px 8px;background:#1a1a1a;
                             border:1px solid #2a2a2a;border-radius:8px;
                             text-align:center;text-decoration:none;
                             font-size:12px;font-weight:700;color:#e5e7eb;
                             letter-spacing:1px;text-transform:uppercase;">
                      🎁 Premios
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#0a0a0a;padding:24px 32px;text-align:center;
                       border-top:1px solid #1a1a1a;">
              <p style="margin:0 0 8px;font-size:13px;color:#4b5563;">
                Este correo fue enviado porque te registraste en el
                <span style="color:#ef4444;">Prode Mundial Gamer 2026</span>.
              </p>
              <p style="margin:0;font-size:12px;color:#374151;">
                © 2026 The Gamer Shop · Todos los derechos reservados
              </p>
            </td>
          </tr>

        </table>
        <!-- /Card -->

      </td>
    </tr>
  </table>
  <!-- /Wrapper -->

</body>
</html>`;
}

// ─── Send functions ────────────────────────────────────────────────────────────

export async function sendRedemptionEmail(params: {
  user: { id: string; firstName: string; email: string };
  prizeName: string;
  pointsSpent: number;
}): Promise<void> {
  if (!process.env.RESEND_API_KEY) return;
  const { user, prizeName, pointsSpent } = params;
  const from = process.env.RESEND_FROM || "Prode Mundial Gamer <no-reply@thegamershop-premios.com>";
  const r = new Resend(process.env.RESEND_API_KEY.replace(/^﻿/, "").trim());
  const html = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>Canje confirmado</title></head>
<body style="margin:0;padding:32px 16px;background:#f4f4f5;font-family:sans-serif;">
<div style="max-width:520px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;">
  <div style="background:#0a0a0a;padding:24px 32px;text-align:center;">
    <div style="font-size:20px;font-weight:900;color:#fff;">⚽ Prode Mundial Gamer 2026</div>
  </div>
  <div style="padding:32px;">
    <p style="margin:0 0 8px;color:#6b7280;">Hola, <strong>${user.firstName}</strong></p>
    <h1 style="margin:0 0 16px;font-size:20px;font-weight:800;color:#0a0a0a;">¡Tu canje fue confirmado!</h1>
    <p style="color:#374151;">Canjeaste <strong>${pointsSpent.toLocaleString("es-AR")} puntos</strong> por:</p>
    <div style="background:#f9fafb;border-radius:8px;padding:16px;margin:16px 0;font-size:18px;font-weight:700;color:#0a0a0a;">${prizeName}</div>
    <p style="color:#6b7280;font-size:14px;">Nos contactaremos pronto para coordinar la entrega. ¡Gracias por participar!</p>
  </div>
</div>
</body></html>`;
  const { error } = await r.emails.send({ from, to: user.email, subject: `¡Canje confirmado! ${prizeName}`, html });
  if (error) console.error("[email] Failed to send redemption email:", error);
}

export async function sendWelcomeEmail(user: {
  firstName: string;
  lastName: string;
  email: string;
}): Promise<void> {
  if (!process.env.RESEND_API_KEY) {
    console.warn("[email] RESEND_API_KEY not set — skipping welcome email");
    return;
  }

  const html = welcomeTemplate(user.firstName, user.lastName, user.email);
  const subject = `¡Bienvenido al Prode Mundial Gamer 2026, ${user.firstName}! 🎮⚽`;
  const from = process.env.RESEND_FROM || "Prode Mundial Gamer <no-reply@thegamershop-premios.com>";

  const r = new Resend(process.env.RESEND_API_KEY.replace(/^﻿/, "").trim());
  const { error } = await r.emails.send({ from, to: user.email, subject, html });

  if (error) {
    console.error("[email] Failed to send welcome email:", error);
    throw new Error(error.message);
  }

  console.log(`[email] ✅ Welcome email sent to ${user.email}`);
}

// ─── Password Reset Email ─────────────────────────────────────────────────────

export async function sendPasswordResetEmail(params: {
  firstName: string;
  email: string;
  resetUrl: string;
}): Promise<void> {
  if (!process.env.RESEND_API_KEY) return;
  const { firstName, email, resetUrl } = params;
  const from = process.env.RESEND_FROM || "Prode Mundial Gamer <no-reply@thegamershop-premios.com>";
  const r = new Resend(process.env.RESEND_API_KEY.replace(/^﻿/, "").trim());

  const html = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>Recuperá tu contraseña</title></head>
<body style="margin:0;padding:32px 16px;background:#0a0a0a;font-family:'Segoe UI',Arial,sans-serif;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#0a0a0a;">
  <tr><td align="center" style="padding:32px 16px;">
    <table role="presentation" width="560" cellspacing="0" cellpadding="0" border="0"
      style="max-width:560px;width:100%;background:#111111;border-radius:16px;border:1px solid #2a2a2a;overflow:hidden;">
      <tr>
        <td style="background:#0a0a0a;padding:24px 32px;text-align:center;border-bottom:1px solid #1a1a1a;">
          <div style="font-size:20px;font-weight:900;color:#fff;letter-spacing:-0.5px;">⚽ Prode Mundial Gamer 2026</div>
        </td>
      </tr>
      <tr>
        <td style="padding:32px;">
          <p style="margin:0 0 8px;color:#9ca3af;font-size:14px;">Hola, <strong style="color:#fff;">${firstName}</strong></p>
          <h1 style="margin:0 0 16px;font-size:22px;font-weight:800;color:#fff;">Recuperá tu contraseña</h1>
          <p style="color:#9ca3af;font-size:15px;line-height:1.6;margin:0 0 24px;">
            Recibimos una solicitud para restablecer la contraseña de tu cuenta.
            Hacé clic en el botón para elegir una nueva. El link es válido por <strong style="color:#fff;">1 hora</strong>.
          </p>
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:0 auto 24px;">
            <tr>
              <td style="border-radius:10px;background:#dc2626;">
                <a href="${resetUrl}" target="_blank"
                  style="display:inline-block;padding:14px 32px;font-size:15px;font-weight:800;
                         color:#fff;text-decoration:none;letter-spacing:0.5px;">
                  ELEGIR NUEVA CONTRASEÑA →
                </a>
              </td>
            </tr>
          </table>
          <p style="color:#6b7280;font-size:13px;line-height:1.5;margin:0 0 8px;">
            Si no podés hacer clic, copiá este link en tu navegador:
          </p>
          <p style="color:#6b7280;font-size:12px;word-break:break-all;margin:0 0 24px;">
            ${resetUrl}
          </p>
          <hr style="border:none;border-top:1px solid #1f1f1f;margin:0 0 20px;" />
          <p style="color:#4b5563;font-size:12px;line-height:1.5;margin:0;">
            Si no solicitaste este cambio, ignorá este email — tu contraseña no se modificará.<br/>
            Este link expira en 1 hora.
          </p>
        </td>
      </tr>
    </table>
  </td></tr>
</table>
</body></html>`;

  const { error } = await r.emails.send({
    from,
    to: email,
    subject: "Recuperá tu contraseña — Prode Mundial Gamer 2026",
    html,
  });
  if (error) console.error("[email] Failed to send password reset email:", error);
}

// ─── Email Verification ───────────────────────────────────────────────────────

export async function sendEmailVerification(params: {
  firstName: string;
  email: string;
  verifyUrl: string;
}): Promise<void> {
  if (!process.env.RESEND_API_KEY) return;
  const { firstName, email, verifyUrl } = params;
  const from = process.env.RESEND_FROM || "Prode Mundial Gamer <no-reply@thegamershop-premios.com>";
  const r = new Resend(process.env.RESEND_API_KEY.replace(/^﻿/, "").trim());

  const html = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>Verificá tu email</title></head>
<body style="margin:0;padding:32px 16px;background:#0a0a0a;font-family:'Segoe UI',Arial,sans-serif;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#0a0a0a;">
  <tr><td align="center" style="padding:32px 16px;">
    <table role="presentation" width="560" cellspacing="0" cellpadding="0" border="0"
      style="max-width:560px;width:100%;background:#111111;border-radius:16px;border:1px solid #2a2a2a;overflow:hidden;">
      <tr>
        <td style="background:#0a0a0a;padding:24px 32px;text-align:center;border-bottom:1px solid #1a1a1a;">
          <div style="font-size:20px;font-weight:900;color:#fff;letter-spacing:-0.5px;">⚽ Prode Mundial Gamer 2026</div>
        </td>
      </tr>
      <tr>
        <td style="padding:32px;">
          <p style="margin:0 0 8px;color:#9ca3af;font-size:14px;">Hola, <strong style="color:#fff;">${firstName}</strong></p>
          <h1 style="margin:0 0 16px;font-size:22px;font-weight:800;color:#fff;">Verificá tu email</h1>
          <p style="color:#9ca3af;font-size:15px;line-height:1.6;margin:0 0 24px;">
            Te registraste con un código de referido. Verificá tu email para activar tu cuenta:
            tus puntos de predicciones <strong style="color:#fff;">no se acreditan</strong> y el
            <strong style="color:#fff;">bonus de referido no se aplica</strong> hasta que verifiques.
          </p>
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:0 auto 24px;">
            <tr>
              <td style="border-radius:10px;background:#16a34a;">
                <a href="${verifyUrl}" target="_blank"
                  style="display:inline-block;padding:14px 32px;font-size:15px;font-weight:800;
                         color:#fff;text-decoration:none;letter-spacing:0.5px;">
                  VERIFICAR EMAIL →
                </a>
              </td>
            </tr>
          </table>
          <p style="color:#6b7280;font-size:13px;line-height:1.5;margin:0 0 8px;">
            Si no podés hacer clic, copiá este link en tu navegador:
          </p>
          <p style="color:#6b7280;font-size:12px;word-break:break-all;margin:0 0 24px;">
            ${verifyUrl}
          </p>
          <hr style="border:none;border-top:1px solid #1f1f1f;margin:0 0 20px;" />
          <p style="color:#4b5563;font-size:12px;line-height:1.5;margin:0;">
            El link expira en 7 días. Si no te registraste, ignorá este email.
          </p>
        </td>
      </tr>
    </table>
  </td></tr>
</table>
</body></html>`;

  const { error } = await r.emails.send({
    from,
    to: email,
    subject: "Verificá tu email — Prode Mundial Gamer 2026",
    html,
  });
  if (error) console.error("[email] Failed to send verification email:", error);
}

// ─── Squad Invite Email ────────────────────────────────────────────────────────

export async function sendSquadInviteEmail(params: {
  invitee: { firstName: string; email: string };
  inviterName: string;
  squadName: string;
}): Promise<void> {
  if (!process.env.RESEND_API_KEY) return;
  const { invitee, inviterName, squadName } = params;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://thegamershop-premios.com";
  const from = process.env.RESEND_FROM || "Prode Mundial Gamer <no-reply@thegamershop-premios.com>";
  const r = new Resend(process.env.RESEND_API_KEY.replace(/^﻿/, "").trim());

  const html = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>Invitación a grupo</title></head>
<body style="margin:0;padding:32px 16px;background:#0a0a0a;font-family:'Segoe UI',Arial,sans-serif;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#0a0a0a;">
  <tr><td align="center" style="padding:32px 16px;">
    <table role="presentation" width="560" cellspacing="0" cellpadding="0" border="0"
      style="max-width:560px;width:100%;background:#111111;border-radius:16px;border:1px solid #2a2a2a;overflow:hidden;">
      <tr>
        <td style="background:#0a0a0a;padding:24px 32px;text-align:center;border-bottom:1px solid #1a1a1a;">
          <div style="font-size:20px;font-weight:900;color:#fff;letter-spacing:-0.5px;">⚽ Prode Mundial Gamer 2026</div>
        </td>
      </tr>
      <tr>
        <td style="padding:32px;">
          <p style="margin:0 0 8px;color:#9ca3af;font-size:14px;">Hola, <strong style="color:#fff;">${invitee.firstName}</strong></p>
          <h1 style="margin:0 0 16px;font-size:22px;font-weight:800;color:#fff;">¡Te invitaron a un grupo! ⚔️</h1>
          <p style="color:#9ca3af;font-size:15px;line-height:1.6;margin:0 0 24px;">
            <strong style="color:#fff;">${inviterName}</strong> te invitó a unirte al grupo
            <strong style="color:#ef4444;">${squadName}</strong> en el Prode Mundial Gamer 2026.
          </p>
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:0 auto 24px;">
            <tr>
              <td style="border-radius:10px;background:#dc2626;">
                <a href="${appUrl}/squads"
                  style="display:inline-block;padding:14px 32px;font-size:15px;font-weight:800;
                         color:#fff;text-decoration:none;letter-spacing:0.5px;">
                  VER INVITACIÓN →
                </a>
              </td>
            </tr>
          </table>
          <hr style="border:none;border-top:1px solid #1f1f1f;margin:0 0 20px;" />
          <p style="color:#4b5563;font-size:12px;line-height:1.5;margin:0;">
            Si no querés unirte, podés ignorar este email o rechazar la invitación desde la app.
          </p>
        </td>
      </tr>
    </table>
  </td></tr>
</table>
</body></html>`;

  const { error } = await r.emails.send({
    from,
    to: invitee.email,
    subject: `${inviterName} te invitó al grupo "${squadName}" — Prode Mundial Gamer 2026`,
    html,
  });
  if (error) console.error("[email] Failed to send squad invite email:", error);
}

// ─── Announcements via Resend ──────────────────────────────────────────────────

const resend = new Resend(process.env.RESEND_API_KEY?.replace(/^﻿/, "").trim());
const RESEND_FROM = process.env.RESEND_FROM || "Prode Mundial Gamer <no-reply@thegamershop-premios.com>";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://prode-mundial-2026-ten-blue.vercel.app";

export function generateUnsubscribeToken(userId: string): string {
  return createHmac("sha256", process.env.UNSUBSCRIBE_SECRET || "prode-unsub-secret")
    .update(userId)
    .digest("hex");
}

export function verifyUnsubscribeToken(userId: string, token: string): boolean {
  const expected = generateUnsubscribeToken(userId);
  return expected === token;
}

export function buildAnnouncementHtml(params: {
  subject: string;
  message: string;
  ctaUrl?: string;
  ctaLabel?: string;
  userId: string;
  firstName: string;
}): string {
  const { subject, message, ctaUrl, ctaLabel, userId, firstName } = params;
  const messageHtml = message.replace(/\n/g, "<br>");
  const unsubUrl = `${APP_URL}/api/unsubscribe?userId=${userId}&token=${generateUnsubscribeToken(userId)}`;

  const ctaBlock =
    ctaUrl && ctaLabel
      ? `<div style="text-align:center;margin:32px 0;">
          <a href="${ctaUrl}" style="background:#dc2626;color:#ffffff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:700;font-size:15px;display:inline-block;">${ctaLabel}</a>
         </div>`
      : "";

  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>${subject}</title></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:32px 16px;">
  <tr><td align="center">
    <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
      <tr>
        <td style="background:#0a0a0a;padding:24px 32px;text-align:center;">
          <div style="font-size:22px;font-weight:900;color:#ffffff;letter-spacing:-0.5px;">⚽ Prode Mundial Gamer 2026</div>
          <div style="font-size:11px;color:#666;margin-top:4px;letter-spacing:2px;text-transform:uppercase;">The Gamer Shop</div>
        </td>
      </tr>
      <tr>
        <td style="padding:32px;">
          <p style="margin:0 0 8px;font-size:14px;color:#6b7280;">Hola, <strong style="color:#111">${firstName}</strong></p>
          <h1 style="margin:0 0 24px;font-size:22px;font-weight:800;color:#0a0a0a;line-height:1.3;">${subject}</h1>
          <div style="font-size:15px;color:#374151;line-height:1.7;">${messageHtml}</div>
          ${ctaBlock}
        </td>
      </tr>
      <tr><td style="padding:0 32px;"><div style="height:1px;background:#f0f0f0;"></div></td></tr>
      <tr>
        <td style="padding:24px 32px;text-align:center;">
          <p style="margin:0;font-size:12px;color:#9ca3af;line-height:1.6;">
            Recibís este email porque te registraste en el Prode Mundial Gamer 2026.<br>
            <a href="${unsubUrl}" style="color:#9ca3af;text-decoration:underline;">Desuscribirse de comunicaciones</a>
          </p>
        </td>
      </tr>
    </table>
  </td></tr>
</table>
</body>
</html>`;
}

export async function sendAnnouncement(params: {
  users: Array<{ id: string; email: string; firstName: string }>;
  subject: string;
  message: string;
  ctaUrl?: string;
  ctaLabel?: string;
  rawHtml?: boolean;
}): Promise<{ sent: number; failed: number }> {
  const { users, subject, message, ctaUrl, ctaLabel, rawHtml } = params;
  let sent = 0;
  let failed = 0;

  // Resend batch: max 100 per call
  const CHUNK = 100;
  for (let i = 0; i < users.length; i += CHUNK) {
    const chunk = users.slice(i, i + CHUNK);
    const emails = chunk.map((u) => ({
      from: RESEND_FROM,
      to: u.email,
      subject,
      html: rawHtml
        ? message
        : buildAnnouncementHtml({ subject, message, ctaUrl, ctaLabel, userId: u.id, firstName: u.firstName }),
    }));

    try {
      const result = await resend.batch.send(emails);
      if (result.error) {
        console.error("[resend] batch error:", JSON.stringify(result.error));
        failed += chunk.length;
      } else if (result.data) {
        sent += result.data.length;
      } else {
        console.error("[resend] batch returned no data and no error");
        failed += chunk.length;
      }
    } catch (err) {
      console.error("[resend] batch exception:", err);
      failed += chunk.length;
    }
  }

  return { sent, failed };
}
