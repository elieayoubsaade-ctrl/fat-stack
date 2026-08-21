/**
 * Balance test harness.
 *
 * Plays thousands of full 60-second rounds against simulated players of three skill
 * levels and reports what actually happens. Run it after changing anything in
 * `client/src/game/config.ts`:
 *
 *     pnpm balance
 *
 * What to look for:
 *   • Novices should mostly survive the full 60 seconds and score something.
 *   • Experts should score several times a novice — skill has to be worth something.
 *   • "Ended early" should be common but not universal; a round that always ends at
 *     15 seconds means an event queue moves too fast to be fun.
 *   • Super Stacks should be reachable but not routine.
 */
import { ITEMS, ROUND } from "../client/src/game/config";
import { catchReach, createRound, stepRound, type Round } from "../client/src/game/round";

const FRAME = 1 / 60;
const ROUNDS_PER_SKILL = 500;

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

type Skill = {
  name: string;
  /** Extra clearance kept from fumble objects. Higher = better dodging. */
  dodgeMargin: number;
  /** Chance per frame of doing nothing useful. Higher = worse reactions. */
  sloppiness: number;
  /** How far ahead the player reads the lane, in seconds. */
  lookahead: number;
};

const SKILLS: Skill[] = [
  { name: "Novice", dodgeMargin: 0.0, sloppiness: 0.45, lookahead: 0.25 },
  { name: "Average", dodgeMargin: 2.0, sloppiness: 0.18, lookahead: 0.6 },
  { name: "Expert", dodgeMargin: 4.5, sloppiness: 0.03, lookahead: 1.2 },
];

/** Decide which way the simulated player moves this frame. */
function decide(round: Round, skill: Skill, random: () => number): number {
  if (random() < skill.sloppiness) return 0;

  // Step out of the way of anything about to land on us.
  for (const item of round.items) {
    if (ITEMS[item.kind].group !== "hazard") continue;
    const timeToBand = (ROUND.catchTop - item.y) / item.speed;
    if (timeToBand > skill.lookahead || timeToBand < -0.2) continue;
    if (Math.abs(item.x - round.playerX) < catchReach(item.kind) + skill.dodgeMargin) {
      return item.x > round.playerX ? -1 : 1;
    }
  }

  // Otherwise go for the most valuable thing we can still reach in time.
  let best: { x: number } | null = null;
  let bestValue = -1;
  for (const item of round.items) {
    const spec = ITEMS[item.kind];
    if (spec.group === "hazard") continue;

    const timeToBand = (ROUND.catchTop - item.y) / item.speed;
    if (timeToBand < -0.1) continue;

    const travel = Math.abs(item.x - round.playerX) / ROUND.playerSpeed;
    if (travel > timeToBand + 0.15) continue; // can't make it

    const worth = spec.group === "lid" ? spec.points + 800 : spec.points;
    const value = worth / Math.max(0.25, timeToBand);
    if (value > bestValue) {
      bestValue = value;
      best = item;
    }
  }

  if (!best) return 0;
  const dx = best.x - round.playerX;
  if (Math.abs(dx) < 1) return 0;
  return dx > 0 ? 1 : -1;
}

type Result = {
  score: number;
  fumbles: number;
  superStacks: number;
  caught: number;
  dropped: number;
  spawned: number;
  seconds: number;
  endedEarly: boolean;
};

function playRound(skill: Skill, seed: number): Result {
  const random = mulberry32(seed);
  const round = createRound(random);
  const brain = mulberry32(seed ^ 0x9e3779b9);

  let guard = 0;
  while (!round.ended && guard++ < 60 * ROUND.seconds * 2) {
    round.direction = decide(round, skill, brain);
    stepRound(round, FRAME);
  }

  return {
    score: round.score,
    fumbles: round.fumbles,
    superStacks: round.superStacks,
    caught: round.caught,
    dropped: round.dropped,
    spawned: round.spawned,
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

console.log(`\nSUPER STACK — BALANCE REPORT   (${ROUNDS_PER_SKILL} rounds per skill level)\n`);
console.log(
  `${"Player".padEnd(9)}${pad("Score", 9)}${pad("Median", 9)}${pad("p10", 8)}${pad("p90", 9)}` +
    `${pad("Caught", 8)}${pad("Dropped", 9)}${pad("Fumbles", 9)}${pad("Stacks", 8)}${pad("Ended early", 13)}${pad("Length", 9)}`,
);
console.log("-".repeat(100));

const summaries: Record<string, number> = {};

for (const skill of SKILLS) {
  const results: Result[] = [];
  for (let i = 0; i < ROUNDS_PER_SKILL; i++) results.push(playRound(skill, 1000 + i));

  const scores = results.map((r) => r.score);
  summaries[skill.name] = mean(scores);

  console.log(
    skill.name.padEnd(9) +
      pad(Math.round(mean(scores)).toLocaleString(), 9) +
      pad(Math.round(quantile(scores, 0.5)).toLocaleString(), 9) +
      pad(Math.round(quantile(scores, 0.1)).toLocaleString(), 8) +
      pad(Math.round(quantile(scores, 0.9)).toLocaleString(), 9) +
      pad(mean(results.map((r) => r.caught)).toFixed(1), 8) +
      pad(mean(results.map((r) => r.dropped)).toFixed(1), 9) +
      pad(mean(results.map((r) => r.fumbles)).toFixed(2), 9) +
      pad(mean(results.map((r) => r.superStacks)).toFixed(2), 8) +
      pad(`${Math.round((results.filter((r) => r.endedEarly).length / results.length) * 100)}%`, 13) +
      pad(`${mean(results.map((r) => r.seconds)).toFixed(1)}s`, 9),
  );
}

console.log("-".repeat(100));
const spread = summaries.Expert / Math.max(1, summaries.Novice);
console.log(`\nSkill spread: an expert scores ${spread.toFixed(1)}x a novice.`);
console.log(`Items spawned per full round: ~${Math.round((ROUND.seconds / 0.7) * 1)} (varies with the difficulty curve)\n`);
