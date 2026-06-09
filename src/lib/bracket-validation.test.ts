/**
 * Unit tests for bracket validation logic.
 * Run: npx ts-node --compiler-options '{"module":"CommonJS"}' src/lib/bracket-validation.test.ts
 */

import {
  BRACKET_MATCHES,
} from "./bracket-structure";
import {
  bracketKey,
  normalizeMatchSlot,
  normalizeSavedBracket,
  isPhaseUnlocked,
  getDownstreamBracketKeys,
  computeThirdPlaceRankings,
  getQualifyingThirdTeamIds,
  deriveProjectedGroupStandings,
  getThirdPlaceCandidateEntries,
  getThirdPlaceCandidates,
  getThirdSlotPickState,
  getThirdSlotMatches,
  getThirdSlotPickerEntries,
  getBracketMatchCompleteness,
  validateBracketPick,
  validateThirdSlotRival,
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

// Slot candidates include non-top-8 thirds when eligible for that cruce
const slotCtx: BracketContext = {
  ...thirdCtx,
  savedBracket: {},
};
const slotEntries = getThirdPlaceCandidateEntries("3DEIJL", slotCtx);
assert(slotEntries.length === 5, "P87 slot lists all 5 projected thirds from D/E/I/J/L");
assert(
  slotEntries.some((e) => !e.qualifies),
  "slot includes thirds outside top 8 when needed"
);
assert(
  getThirdPlaceCandidates("3DEIJL", slotCtx).every((t) =>
    slotEntries.some((e) => e.team.id === t.id)
  ),
  "getThirdPlaceCandidates mirrors entries"
);

// Fixed-side pick must not appear as third-side selection
const p87 = BRACKET_MATCHES.ROUND_OF_32!.find((m) => m.matchNum === 87)!;
const colCtx: BracketContext = {
  ...thirdCtx,
  savedGroupPreds: {
    ...thirdCtx.savedGroupPreds,
    gK: { first: "tK1", second: "tK2", third: "tK3" },
  },
};
const colPick = getThirdSlotPickState(p87, "tK1", colCtx, "ROUND_OF_32:87");
assert(colPick?.fixedPicked === true, "Colombia/1K pick is fixed side");
assert(colPick?.thirdPickedTeam === null, "fixed pick must not populate third side");

// Downstream invalidation
const downstream = getDownstreamBracketKeys("ROUND_OF_32", "73");
assert(downstream.includes("ROUND_OF_16:90"), "W73 feeds P90");

// All R32 third-slot matches share picker === validation and require rival + winner
for (const match of getThirdSlotMatches()) {
  const key = bracketKey("ROUND_OF_32", String(match.matchNum));
  const ctx: BracketContext = { ...thirdCtx, savedBracket: {}, pendingBracket: {} };
  const entries = getThirdSlotPickerEntries(match, ctx, key);
  assert(entries.length > 0, `P${match.matchNum} has picker entries`);
  const fixed = getThirdSlotPickState(match, null, ctx, key)?.fixedTeam;
  assert(!!fixed, `P${match.matchNum} fixed side resolves`);
  const rival = entries[0].team.id;
  const noRival = validateBracketPick("ROUND_OF_32", String(match.matchNum), fixed!.id, {
    ...ctx,
    pendingBracket: { [key]: fixed!.id },
  });
  assert(!noRival.valid, `P${match.matchNum} blocks winner without third rival`);
  const withRival = validateBracketPick("ROUND_OF_32", String(match.matchNum), fixed!.id, {
    ...ctx,
    thirdSlotAssignments: { [key]: rival },
    pendingBracket: { [key]: fixed!.id },
  });
  assert(withRival.valid, `P${match.matchNum} valid with rival + winner`);
  assert(
    getBracketMatchCompleteness(match, {
      ...ctx,
      thirdSlotAssignments: { [key]: rival },
      pendingBracket: { [key]: fixed!.id },
    }, key, fixed!.id).isComplete,
    `P${match.matchNum} complete when both teams + winner chosen`
  );
}

// P79: 1A vs 3° from C/E/F/H/I — picker and validation must match
const p79 = BRACKET_MATCHES.ROUND_OF_32!.find((m) => m.matchNum === 79)!;
const p79Key = bracketKey("ROUND_OF_32", "79");
const p79Ctx: BracketContext = { ...thirdCtx, savedBracket: {}, pendingBracket: {} };
const p79Entries = getThirdSlotPickerEntries(p79, p79Ctx, p79Key);
assert(p79Entries.length === 5, "P79 lists 5 thirds from C/E/F/H/I");
const p79Third = p79Entries[0].team.id;
const p79Fixed = deriveProjectedGroupStandings(p79Ctx.groups[0], p79Ctx)?.first;
assert(!!p79Fixed, "P79 fixed side (1A) resolves");

const rivalOk = validateThirdSlotRival(p79, p79Third, p79Ctx, p79Key);
assert(rivalOk.valid, "P79 third rival assignable from picker");

const incompleteWinner = validateBracketPick("ROUND_OF_32", "79", p79Fixed!, {
  ...p79Ctx,
  thirdSlotAssignments: {},
  pendingBracket: { [p79Key]: p79Fixed! },
});
assert(!incompleteWinner.valid, "P79 cannot save winner without third rival");

const completeCtx: BracketContext = {
  ...p79Ctx,
  thirdSlotAssignments: { [p79Key]: p79Third },
  pendingBracket: { [p79Key]: p79Fixed! },
};
const completePick = validateBracketPick("ROUND_OF_32", "79", p79Fixed!, completeCtx);
assert(completePick.valid, "P79 valid when rival + fixed winner chosen");
const completeness = getBracketMatchCompleteness(p79, completeCtx, p79Key, p79Fixed!);
assert(completeness.isComplete, "P79 complete with both teams and winner");

console.log("✓ All bracket-validation tests passed");
