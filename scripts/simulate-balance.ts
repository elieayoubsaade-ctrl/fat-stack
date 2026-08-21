/**
 * Balance test harness for the pot-and-bank economy.
 *
 * Run after changing anything in `client/src/game/config.ts`:
 *
 *     pnpm balance
 *
 * It answers two questions:
 *
 * 1. SKILL — do better players score meaningfully more? (Expert should be ~2x a novice.)
 * 2. STRATEGY — is the gamble real? Three lid policies play at identical catching skill:
 *      • BANK-EARLY  takes every lid the moment it appears
 *      • SMART       builds to ~8 layers before taking a lid
 *      • NEVER-BANK  ignores every lid
 *    For the design to work: SMART > BANK-EARLY (greed must pay) and NEVER-BANK must lose
 *    badly (greed without an exit must be punished by collapse and the final whistle).
 */
import { ITEMS, ROUND, TOWER } from "../client/src/game/config";
import { bankValue, catchBand, catchReach, createRound, stepRound, type Round } from "../client/src/game/round";

const FRAME = 1 / 60;
const ROUNDS = 400;

/** Deterministic random so results are repeatable between runs. */
function mulberry32(seed: number) {
  return function random() {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type LidPolicy = "always" | "smart" | "never";

type Player = {
  name: string;
  /** Extra clearance kept from hazards. Higher = better dodging. */
  dodgeMargin: number;
  /** Chance per frame of doing nothing useful. Higher = worse reactions. */
  sloppiness: number;
  /** How far ahead the player reads the lane, in seconds. */
  lookahead: number;
  lidPolicy: LidPolicy;
  /** For the smart policy: take lids only at or above this many layers. */
  bankAt: number;
};

const SKILL_TIERS: Player[] = [
  { name: "Novice", dodgeMargin: 0, sloppiness: 0.45, lookahead: 0.25, lidPolicy: "always", bankAt: 0 },
  { name: "Average", dodgeMargin: 2, sloppiness: 0.18, lookahead: 0.6, lidPolicy: "smart", bankAt: 6 },
  { name: "Expert", dodgeMargin: 4.5, sloppiness: 0.03, lookahead: 1.2, lidPolicy: "smart", bankAt: 8 },
];

const STRATEGY_TIERS: Player[] = [
  { name: "BANK-EARLY", dodgeMargin: 4.5, sloppiness: 0.03, lookahead: 1.2, lidPolicy: "always", bankAt: 0 },
  { name: "SMART", dodgeMargin: 4.5, sloppiness: 0.03, lookahead: 1.2, lidPolicy: "smart", bankAt: 8 },
  { name: "NEVER-BANK", dodgeMargin: 4.5, sloppiness: 0.03, lookahead: 1.2, lidPolicy: "never", bankAt: 99 },
];

function wantsLid(round: Round, player: Player) {
  if (player.lidPolicy === "never") return false;
  if (player.lidPolicy === "always") return true;
  // Smart: take the lid when the tower is deep, collapse looms, or the whistle is close.
  return (
    round.tower.length >= player.bankAt ||
    round.tower.length >= TOWER.collapseAt - 2 ||
    (round.timeLeft <= 10 && round.pot > 0)
  );
}

/** Decide which way the simulated player moves this frame. */
function decide(round: Round, player: Player, random: () => number): number {
  if (random() < player.sloppiness) return 0;

  // Dodge hazards about to land on us. A true never-bank player must dodge lids too —
  // otherwise accidental banks flatter the strategy and hide what refusing the exit costs.
  for (const item of round.items) {
    const g = ITEMS[item.kind].group;
    const mustDodge = g === "hazard" || (g === "lid" && !wantsLid(round, player));
    if (!mustDodge) continue;
    const timeToBand = (catchBand(round).top - item.y) / item.speed;
    if (timeToBand > player.lookahead || timeToBand < -0.2) continue;
    if (Math.abs(item.x - round.playerX) < catchReach(item.kind) + player.dodgeMargin) {
      return item.x > round.playerX ? -1 : 1;
    }
  }

  // Chase the most valuable reachable item, honouring the lid policy.
  let bestX: number | null = null;
  let bestValue = -1;
  for (const item of round.items) {
    const spec = ITEMS[item.kind];
    if (spec.group === "hazard") continue;
    if (spec.group === "lid" && !wantsLid(round, player)) continue;

    const timeToFloor = (catchBand(round).bottom - item.y) / item.speed;
    if (timeToFloor < -0.1) continue;
    const travel = Math.abs(item.x - round.playerX) / ROUND.playerSpeed;
    if (travel > timeToFloor + 0.15) continue;

    // Avoid collapse: skip food that would topple the tower with no exit on screen.
    if (
      spec.group !== "lid" &&
      round.tower.length >= TOWER.collapseAt - 1 &&
      player.lidPolicy !== "never"
    ) {
      continue;
    }

    const worth = spec.group === "lid" ? bankValue(round.pot, round.tower.length) + 500 : spec.points;
    const value = worth / Math.max(0.25, timeToFloor);
    if (value > bestValue) {
      bestValue = value;
      bestX = item.x;
    }
  }

  if (bestX === null) return 0;
  const dx = bestX - round.playerX;
  if (Math.abs(dx) < 1) return 0;
  return dx > 0 ? 1 : -1;
}

type Result = {
  score: number;
  banks: number;
  biggestBank: number;
  collapses: number;
  potLostToCollapse: number;
  potLostToTime: number;
  fumbles: number;
  caught: number;
  seconds: number;
  endedEarly: boolean;
};

function playRound(player: Player, seed: number): Result {
  const random = mulberry32(seed);
  const round = createRound(random);
  const brain = mulberry32(seed ^ 0x9e3779b9);

  let guard = 0;
  while (!round.ended && guard++ < 60 * ROUND.seconds * 2) {
    round.direction = decide(round, player, brain);
    stepRound(round, FRAME);
    round.events.length = 0;
  }

  return {
    score: round.score,
    banks: round.banks,
    biggestBank: round.biggestBank,
    collapses: round.collapses,
    potLostToCollapse: round.potLostToCollapse,
    potLostToTime: round.potLostToTime,
    fumbles: round.fumbles,
    caught: round.caught,
    seconds: round.elapsed,
    endedEarly: round.ended === "fumbles",
  };
}

const mean = (values: number[]) => values.reduce((a, b) => a + b, 0) / values.length;
const quantile = (values: number[], q: number) => {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))];
};
const pad = (text: string | number, width: number) => String(text).padStart(width);

function table(title: string, players: Player[]) {
  console.log(`\n${title}   (${ROUNDS} rounds each)`);
  console.log(
    `${"Player".padEnd(11)}${pad("Score", 9)}${pad("p10", 9)}${pad("p90", 9)}${pad("Banks", 7)}` +
      `${pad("BigBank", 9)}${pad("Topples", 9)}${pad("LostPot", 9)}${pad("Fumb", 6)}${pad("Early", 7)}`,
  );
  console.log("-".repeat(85));
  const out: Record<string, number> = {};
  for (const player of players) {
    const results: Result[] = [];
    for (let i = 0; i < ROUNDS; i++) results.push(playRound(player, 1000 + i));
    const scores = results.map((r) => r.score);
    out[player.name] = mean(scores);
    console.log(
      player.name.padEnd(11) +
        pad(Math.round(mean(scores)).toLocaleString(), 9) +
        pad(Math.round(quantile(scores, 0.1)).toLocaleString(), 9) +
        pad(Math.round(quantile(scores, 0.9)).toLocaleString(), 9) +
        pad(mean(results.map((r) => r.banks)).toFixed(2), 7) +
        pad(Math.round(mean(results.map((r) => r.biggestBank))).toLocaleString(), 9) +
        pad(mean(results.map((r) => r.collapses)).toFixed(2), 9) +
        pad(Math.round(mean(results.map((r) => r.potLostToCollapse + r.potLostToTime))).toLocaleString(), 9) +
        pad(mean(results.map((r) => r.fumbles)).toFixed(2), 6) +
        pad(`${Math.round((results.filter((r) => r.endedEarly).length / results.length) * 100)}%`, 7),
    );
  }
  return out;
}

const skill = table("SKILL — same strategy family, different reflexes", SKILL_TIERS);
const strategy = table("STRATEGY — identical reflexes, different lid policies", STRATEGY_TIERS);

console.log("\nVERDICTS");
const spread = skill.Expert / Math.max(1, skill.Novice);
console.log(`  Skill spread:      expert scores ${spread.toFixed(1)}x a novice ${spread >= 1.7 ? "✅" : "⚠ target ≥1.7x"}`);
const greed = strategy.SMART / Math.max(1, strategy["BANK-EARLY"]);
console.log(`  Greed pays:        smart banking beats bank-early by ${greed.toFixed(2)}x ${greed > 1.1 ? "✅" : "⚠ target >1.1x"}`);
const punished = strategy["NEVER-BANK"] / Math.max(1, strategy.SMART);
console.log(`  Greed has limits:  never-banking earns ${(punished * 100).toFixed(0)}% of smart ${punished < 0.6 ? "✅" : "⚠ target <60%"}`);
