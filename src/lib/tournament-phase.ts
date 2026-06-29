import prisma from "./db";

/**
 * Estado REAL del torneo derivado de los partidos cargados (tabla Match).
 *
 * Se usa para habilitar las fases eliminatorias por estado real del torneo
 * (una fase se abre cuando empezó, o cuando terminó la anterior) en vez de
 * exigir que el usuario haya completado sus predicciones de la fase previa.
 * También define, al pasar al modo OFICIAL, desde qué fase corre ese modo.
 */

/** Mapea un valor de Match.phase al "bracket phase key" que usa la UI de predicciones. */
export function matchPhaseToBracketPhase(phase: string): string {
  return phase === "FINAL" ? "CHAMPION" : phase;
}

/** Mapea un "bracket phase key" al valor correspondiente de Match.phase. */
export function bracketPhaseToMatchPhase(phase: string): string {
  return phase === "CHAMPION" ? "FINAL" : phase;
}

/** Fases eliminatorias en orden del torneo (CHAMPION = la final). */
export const BRACKET_PHASE_ORDER = [
  "ROUND_OF_32",
  "ROUND_OF_16",
  "QUARTER_FINALS",
  "SEMI_FINALS",
  "CHAMPION",
] as const;

/** Devuelve la fase MÁS TEMPRANA del torneo entre dos (la de menor índice). */
export function earlierBracketPhase(
  a: string | null | undefined,
  b: string | null | undefined
): string | null {
  if (!a) return b ?? null;
  if (!b) return a ?? null;
  const ia = BRACKET_PHASE_ORDER.indexOf(a as (typeof BRACKET_PHASE_ORDER)[number]);
  const ib = BRACKET_PHASE_ORDER.indexOf(b as (typeof BRACKET_PHASE_ORDER)[number]);
  if (ia < 0) return b;
  if (ib < 0) return a;
  return ia <= ib ? a : b;
}

export interface PhaseProgress {
  started: boolean;
  finished: boolean;
  total: number;
}

/** Keyed por bracket phase key: GROUP_STAGE, ROUND_OF_32 … CHAMPION. */
export type TournamentPhaseMap = Record<string, PhaseProgress>;

export interface TournamentPhaseState {
  phases: TournamentPhaseMap;
  /** Primera fase (16vos→final) que TODAVÍA no empezó, o null si ya empezaron todas. */
  nextUnstartedBracketPhase: string | null;
  /**
   * Primera fase (16vos→final) que TODAVÍA no terminó. Es desde donde corre el
   * modo OFICIAL: incluye la fase en curso (p. ej. 16vos ya sorteado pero sin
   * jugarse del todo), porque sus cruces reales ya están definidos y se pueden
   * predecir. Las fases ya terminadas se respetan con sus puntos clásicos.
   */
  firstUnfinishedBracketPhase: string | null;
}

function computeProgress(
  matches: { status: string | null; startDate: Date | null }[],
  now: Date
): PhaseProgress {
  const total = matches.length;
  if (total === 0) return { started: false, finished: false, total: 0 };
  const started = matches.some(
    (m) =>
      m.status === "live" ||
      m.status === "finished" ||
      (m.startDate != null && m.startDate <= now)
  );
  const finished = matches.every((m) => m.status === "finished");
  return { started, finished, total };
}

/**
 * Fase EFECTIVA desde la que corre el modo oficial para un usuario: la más
 * temprana entre la guardada y la primera fase no terminada. Autocorrige cuentas
 * que quedaron con un officialFromPhase posterior al que corresponde.
 * Devuelve null si el usuario no está en modo oficial.
 */
export async function getEffectiveOfficialFromPhase(
  bracketMode: string | null | undefined,
  storedOfficialFromPhase: string | null | undefined
): Promise<string | null> {
  if (bracketMode !== "OFFICIAL") return null;
  const { firstUnfinishedBracketPhase } = await getTournamentPhaseState();
  return earlierBracketPhase(storedOfficialFromPhase, firstUnfinishedBracketPhase);
}

export async function getTournamentPhaseState(
  now: Date = new Date()
): Promise<TournamentPhaseState> {
  const matches = await prisma.match.findMany({
    select: { phase: true, status: true, startDate: true },
  });

  const byPhase = new Map<string, { status: string | null; startDate: Date | null }[]>();
  for (const m of matches) {
    const key = matchPhaseToBracketPhase(m.phase);
    if (!byPhase.has(key)) byPhase.set(key, []);
    byPhase.get(key)!.push({ status: m.status, startDate: m.startDate });
  }

  const phases: TournamentPhaseMap = {};
  phases.GROUP_STAGE = computeProgress(byPhase.get("GROUP_STAGE") ?? [], now);
  for (const key of BRACKET_PHASE_ORDER) {
    phases[key] = computeProgress(byPhase.get(key) ?? [], now);
  }

  let nextUnstartedBracketPhase: string | null = null;
  for (const key of BRACKET_PHASE_ORDER) {
    if (!phases[key].started) {
      nextUnstartedBracketPhase = key;
      break;
    }
  }

  let firstUnfinishedBracketPhase: string | null = null;
  for (const key of BRACKET_PHASE_ORDER) {
    if (!phases[key].finished) {
      firstUnfinishedBracketPhase = key;
      break;
    }
  }

  return { phases, nextUnstartedBracketPhase, firstUnfinishedBracketPhase };
}
