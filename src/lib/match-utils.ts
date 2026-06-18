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

/** Minutos antes del kickoff en los que se cierran las predicciones. */
export const MATCH_PREDICTION_CUTOFF_MINUTES = 10;
const CUTOFF_MS = MATCH_PREDICTION_CUTOFF_MINUTES * 60 * 1000;

/**
 * Podés predecir un partido hasta 10 minutos antes del kickoff.
 */
export function isMatchPredictionWindowOpen(
  startDate?: string | Date | null,
  now = new Date()
): boolean {
  const start = toDate(startDate);
  if (!start) return true;
  return now.getTime() < start.getTime() - CUTOFF_MS;
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

  if (now.getTime() >= start.getTime() - CUTOFF_MS) {
    return `Las predicciones cierran ${MATCH_PREDICTION_CUTOFF_MINUTES} minutos antes del partido`;
  }

  return null;
}

/** Texto para mostrar hasta cuándo se puede predecir. */
export function getMatchPredictionDeadlineHint(startDate?: string | Date | null): string | null {
  const start = toDate(startDate);
  if (!start) return null;

  const deadline = new Date(start.getTime() - CUTOFF_MS);
  const label = deadline.toLocaleString("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: MATCH_PREDICTION_TZ,
  });

  return `Podés predecir hasta las ${label}`;
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
