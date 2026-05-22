import { JWT_EXPIRES_IN } from "./auth";

/** Convierte "30d", "7d", "12h" a segundos para maxAge de cookies */
export function sessionMaxAgeSeconds(): number {
  const match = JWT_EXPIRES_IN.match(/^(\d+)([dhms])$/);
  if (!match) return 60 * 60 * 24 * 30;
  const n = parseInt(match[1], 10);
  switch (match[2]) {
    case "d":
      return n * 86400;
    case "h":
      return n * 3600;
    case "m":
      return n * 60;
    case "s":
      return n;
    default:
      return 60 * 60 * 24 * 30;
  }
}
