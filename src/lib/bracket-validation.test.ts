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
  validateBracketPick,
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

// Downstream invalidation
const downstream = getDownstreamBracketKeys("ROUND_OF_32", "73");
assert(downstream.includes("ROUND_OF_16:90"), "W73 feeds P90");

console.log("✓ All bracket-validation tests passed");
