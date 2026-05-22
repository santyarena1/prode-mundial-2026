import { randomBytes } from "crypto";

export const CODE_TYPES = {
  purchase: "purchase",
  venue: "venue",
  story: "story",
} as const;

export type CodeType = (typeof CODE_TYPES)[keyof typeof CODE_TYPES];

export const CODE_TYPE_VALUES = Object.values(CODE_TYPES) as [CodeType, ...CodeType[]];

export function isValidCodeType(value: string): value is CodeType {
  return CODE_TYPE_VALUES.includes(value as CodeType);
}

/** Normaliza código ingresado por el usuario (ej. tgs-abc123 → TGS-ABC123) */
export function normalizePurchaseCode(raw: string): string {
  return raw.trim().toUpperCase().replace(/\s+/g, "");
}

export function generatePurchaseCode(type: CodeType = CODE_TYPES.purchase): string {
  const suffix = randomBytes(3).toString("hex").toUpperCase();
  switch (type) {
    case CODE_TYPES.venue:
      return `TGS-VIVO-${suffix}`;
    case CODE_TYPES.story:
      return `TGS-HIST-${suffix}`;
    default:
      return `TGS-${suffix}`;
  }
}

export function codeTypeLabel(type: string): string {
  switch (type) {
    case CODE_TYPES.venue:
      return "Ver partido en el local";
    case CODE_TYPES.story:
      return "Historia / redes";
    default:
      return "Compra";
  }
}

export function redeemMessageForType(type: string): string {
  switch (type) {
    case CODE_TYPES.venue:
      return "Código enviado. El admin validará tu asistencia en el local y acreditará los puntos.";
    case CODE_TYPES.story:
      return "Código enviado. El admin lo validará y te sumará los puntos del prode.";
    default:
      return "Código enviado. El admin validará tu compra y acreditará los puntos.";
  }
}

export function buildWhatsAppUrl(phone: string, message: string): string {
  const digits = phone.replace(/\D/g, "");
  const text = encodeURIComponent(message);
  return `https://wa.me/${digits}?text=${text}`;
}
