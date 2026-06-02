// ─── FIFA World Cup 2026 Official Bracket Structure ───────────────────────────

export interface BracketMatch {
  matchNum: number;
  leftSource: string;   // e.g. "1A", "2B", "3ABCDF", "W73"
  rightSource: string;
  phase: string;
}

// Source key conventions:
//   "1X"     → 1st place of group X
//   "2X"     → 2nd place of group X
//   "3XXXX"  → best 3rd from candidates (letter after "3" are the group letters)
//   "W73"    → winner of match 73

export const BRACKET_MATCHES: Record<string, BracketMatch[]> = {
  ROUND_OF_32: [
    { matchNum: 73,  leftSource: "2A",       rightSource: "2B",       phase: "ROUND_OF_32" },
    { matchNum: 74,  leftSource: "1E",       rightSource: "3ABCDF",   phase: "ROUND_OF_32" },
    { matchNum: 75,  leftSource: "1F",       rightSource: "2C",       phase: "ROUND_OF_32" },
    { matchNum: 76,  leftSource: "1C",       rightSource: "2F",       phase: "ROUND_OF_32" },
    { matchNum: 77,  leftSource: "1I",       rightSource: "3CDFGH",   phase: "ROUND_OF_32" },
    { matchNum: 78,  leftSource: "2E",       rightSource: "2I",       phase: "ROUND_OF_32" },
    { matchNum: 79,  leftSource: "1A",       rightSource: "3CEFHI",   phase: "ROUND_OF_32" },
    { matchNum: 80,  leftSource: "1L",       rightSource: "3EHIJK",   phase: "ROUND_OF_32" },
    { matchNum: 81,  leftSource: "1D",       rightSource: "3BEFIJ",   phase: "ROUND_OF_32" },
    { matchNum: 82,  leftSource: "1G",       rightSource: "3AEHIJ",   phase: "ROUND_OF_32" },
    { matchNum: 83,  leftSource: "2K",       rightSource: "2L",       phase: "ROUND_OF_32" },
    { matchNum: 84,  leftSource: "1H",       rightSource: "2J",       phase: "ROUND_OF_32" },
    { matchNum: 85,  leftSource: "1B",       rightSource: "3EFGIJ",   phase: "ROUND_OF_32" },
    { matchNum: 86,  leftSource: "1J",       rightSource: "2H",       phase: "ROUND_OF_32" },
    { matchNum: 87,  leftSource: "1K",       rightSource: "3DEIJL",   phase: "ROUND_OF_32" },
    { matchNum: 88,  leftSource: "2D",       rightSource: "2G",       phase: "ROUND_OF_32" },
  ],
  ROUND_OF_16: [
    { matchNum: 89,  leftSource: "W74",      rightSource: "W77",      phase: "ROUND_OF_16" },
    { matchNum: 90,  leftSource: "W73",      rightSource: "W75",      phase: "ROUND_OF_16" },
    { matchNum: 91,  leftSource: "W76",      rightSource: "W78",      phase: "ROUND_OF_16" },
    { matchNum: 92,  leftSource: "W79",      rightSource: "W80",      phase: "ROUND_OF_16" },
    { matchNum: 93,  leftSource: "W83",      rightSource: "W84",      phase: "ROUND_OF_16" },
    { matchNum: 94,  leftSource: "W81",      rightSource: "W82",      phase: "ROUND_OF_16" },
    { matchNum: 95,  leftSource: "W86",      rightSource: "W88",      phase: "ROUND_OF_16" },
    { matchNum: 96,  leftSource: "W85",      rightSource: "W87",      phase: "ROUND_OF_16" },
  ],
  QUARTER_FINALS: [
    { matchNum: 97,  leftSource: "W89",      rightSource: "W90",      phase: "QUARTER_FINALS" },
    { matchNum: 98,  leftSource: "W93",      rightSource: "W94",      phase: "QUARTER_FINALS" },
    { matchNum: 99,  leftSource: "W91",      rightSource: "W92",      phase: "QUARTER_FINALS" },
    { matchNum: 100, leftSource: "W95",      rightSource: "W96",      phase: "QUARTER_FINALS" },
  ],
  SEMI_FINALS: [
    { matchNum: 101, leftSource: "W97",      rightSource: "W98",      phase: "SEMI_FINALS" },
    { matchNum: 102, leftSource: "W99",      rightSource: "W100",     phase: "SEMI_FINALS" },
  ],
  FINAL: [
    { matchNum: 103, leftSource: "W101",     rightSource: "W102",     phase: "FINAL" },
  ],
};

/**
 * Returns a human-readable label for a bracket source string.
 * e.g. "1A" → "1° Grupo A"
 *      "2B" → "2° Grupo B"
 *      "3ABCDF" → "Mejor 3° (A/B/C/D/F)"
 *      "W73" → "Gan. P73"
 */
export function getSourceLabel(source: string): string {
  if (source.startsWith("W")) {
    return `Gan. P${source.slice(1)}`;
  }
  if (source.startsWith("3")) {
    const groups = source.slice(1).split("").join("/");
    return `Mejor 3° (${groups})`;
  }
  if (source.startsWith("1") || source.startsWith("2")) {
    const pos = source[0];
    const group = source[1];
    return `${pos}° Grupo ${group}`;
  }
  return source;
}

/**
 * Returns the phase string for a given match number.
 */
export function getPhaseForMatchNum(matchNum: number): string {
  if (matchNum >= 73 && matchNum <= 88) return "ROUND_OF_32";
  if (matchNum >= 89 && matchNum <= 96) return "ROUND_OF_16";
  if (matchNum >= 97 && matchNum <= 100) return "QUARTER_FINALS";
  if (matchNum >= 101 && matchNum <= 102) return "SEMI_FINALS";
  if (matchNum === 103) return "FINAL";
  return "UNKNOWN";
}
