/**
 * Unit tests for bracket validation logic.
 * Run: npx ts-node --compiler-options '{"module":"CommonJS"}' src/lib/bracket-validation.test.ts
 */

import {
  bracketKey,
  normalizeMatchSlot,
  normalizeSavedBracket,
  isPhaseUnlocked,
  getDownstreamBracketKeys,
  computeThirdPlaceRankings,
  getQualifyingThirdTeamIds,
  deriveProjectedGroupStandings,
  type BracketContext,
} from "./bracket-validation";

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg);
}

// Legacy slot migration
assert(normalizeMatchSlot("ROUND_OF_32", "1") === "73", "slot 1 -> P73");
assert(normalizeMatchSlot("ROUND_OF_16", "8") === "96", "slot 8 -> P96");
assert(normalizeMatchSlot("ROUND_OF_32", "73") === "73", "FIFA slot unchanged");

const normalized = normalizeSavedBracket({
  "ROUND_OF_32:1": "team-a",
  "ROUND_OF_16:2": "team-b",
});
assert(normalized["ROUND_OF_32:73"] === "team-a", "normalize saved bracket R32");
assert(normalized["ROUND_OF_16:90"] === "team-b", "normalize saved bracket R16");

// Phase unlock chain
const baseCtx: BracketContext = {
  groups: [
    {
      id: "g1",
      name: "A",
      teams: [{ id: "t1", name: "A1", code: "A1" }],
      matches: [{ id: "m1", phase: "GROUP_STAGE" }],
    },
  ],
  allTeams: [{ id: "t1", name: "A1", code: "A1" }],
  savedPreds: { m1: "home" },
  savedGroupPreds: { g1: { first: "t1", second: "t2", third: "t3" } },
  savedBracket: {},
};

assert(isPhaseUnlocked("ROUND_OF_32", baseCtx), "R32 unlocked when groups complete");
assert(!isPhaseUnlocked("ROUND_OF_16", baseCtx), "R16 locked without R32");

// Third-place ranking derives from match predictions, not stale savedGroupPreds
const thirdCtx: BracketContext = {
  groups: Array.from({ length: 12 }, (_, i) => {
    const letter = String.fromCharCode(65 + i);
    return {
      id: `g${letter}`,
      name: letter,
      teams: [
        { id: `t${letter}1`, name: `T${letter}1`, code: `${letter}1` },
        { id: `t${letter}2`, name: `T${letter}2`, code: `${letter}2` },
        { id: `t${letter}3`, name: `T${letter}3`, code: `${letter}3` },
      ],
      matches: [
        { id: `m${letter}1`, phase: "GROUP_STAGE", homeTeamId: `t${letter}1`, awayTeamId: `t${letter}2` },
      ],
    };
  }),
  allTeams: [],
  savedPreds: Object.fromEntries(
    Array.from({ length: 12 }, (_, i) => [`m${String.fromCharCode(65 + i)}1`, "home"])
  ),
  savedGroupPreds: {}, // intentionally empty — standings must still derive
  savedBracket: {},
  savedScores: Object.fromEntries(
    Array.from({ length: 12 }, (_, i) => [
      `m${String.fromCharCode(65 + i)}1`,
      { home: 3 - Math.floor(i / 4), away: 0 },
    ])
  ),
};
thirdCtx.allTeams = thirdCtx.groups.flatMap((g) => g.teams);

const rankings = computeThirdPlaceRankings(thirdCtx);
assert(rankings.length === 12, "12 projected thirds from match predictions alone");
assert(rankings.filter((r) => r.qualifies).length === 8, "exactly 8 qualify");

const qualifying = getQualifyingThirdTeamIds(thirdCtx);
assert(!qualifying.has(rankings[11].teamId), "worst third does not qualify");
assert(qualifying.has(rankings[0].teamId), "best third qualifies");

const derivedA = deriveProjectedGroupStandings(thirdCtx.groups[0], thirdCtx);
assert(derivedA?.first === "tA1", "group A leader derived from match predictions");
assert(derivedA?.third === "tA2", "group A third derived from standings");

// Downstream invalidation
const downstream = getDownstreamBracketKeys("ROUND_OF_32", "73");
assert(downstream.includes("ROUND_OF_16:90"), "W73 feeds P90");

console.log("✓ All bracket-validation tests passed");
