/** Zona horaria del torneo / usuarios (Argentina). */
export const MATCH_PREDICTION_TZ = "America/Argentina/Buenos_Aires";

function toDate(value?: string | Date | null): Date | null {
  if (!value) return null;
  const d = typeof value === "string" ? new Date(value) : value;
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Día calendario YYYY-MM-DD en la zona del torneo. */
export function getCalendarDayInTz(date: Date, timeZone = MATCH_PREDICTION_TZ): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

/**
 * Podés predecir un partido solo hasta el día anterior (inclusive).
 * El día del partido (y después) queda cerrado, salvo que ya haya arrancado.
 */
export function isMatchPredictionWindowOpen(
  startDate?: string | Date | null,
  now = new Date()
): boolean {
  const start = toDate(startDate);
  if (!start) return true;

  if (start <= now) return false;

  const matchDay = getCalendarDayInTz(start);
  const today = getCalendarDayInTz(now);
  return today < matchDay;
}

export function getMatchPredictionClosedReason(
  startDate?: string | Date | null,
  status?: string,
  now = new Date()
): string | null {
  if (status && status !== "scheduled") {
    return "El partido no acepta predicciones";
  }

  const start = toDate(startDate);
  if (!start) return null;

  if (start <= now) return "El partido ya comenzó";

  const matchDay = getCalendarDayInTz(start);
  const today = getCalendarDayInTz(now);
  if (today >= matchDay) {
    return "Las predicciones cierran el día anterior al partido";
  }

  return null;
}

/** Texto para mostrar hasta cuándo se puede predecir. */
export function getMatchPredictionDeadlineHint(startDate?: string | Date | null): string | null {
  const start = toDate(startDate);
  if (!start) return null;

  const [y, m, d] = getCalendarDayInTz(start).split("-").map(Number);
  const lastOpenDay = new Date(Date.UTC(y, m - 1, d - 1, 12, 0, 0));

  const label = lastOpenDay.toLocaleDateString("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: MATCH_PREDICTION_TZ,
  });

  return `Podés predecir hasta el ${label} (inclusive)`;
}

export function formatMatchDate(dateStr?: string | Date | null) {
  if (!dateStr) return "A confirmar";
  const d = typeof dateStr === "string" ? new Date(dateStr) : dateStr;
  return d.toLocaleDateString("es-AR", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function matchStatusLabel(status: string) {
  switch (status) {
    case "live":
      return "En vivo";
    case "finished":
      return "Finalizado";
    case "postponed":
      return "Postergado";
    case "cancelled":
      return "Cancelado";
    default:
      return "Programado";
  }
}

export function matchStatusVariant(status: string): "error" | "success" | "warning" | "default" {
  switch (status) {
    case "live":
      return "error";
    case "finished":
      return "success";
    case "postponed":
    case "cancelled":
      return "warning";
    default:
      return "default";
  }
}
