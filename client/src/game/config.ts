/**
 * SUPER STACK — BALANCE SHEET
 *
 * This is the one file to edit when the game feels too hard, too easy, or too slow.
 * Everything here is plain numbers. Nothing here is code you need to understand.
 *
 * Positions are measured on a 0–100 grid across the play lane:
 *   x = 0 is the far left, x = 100 is the far right
 *   y = 0 is the top,      y = 100 is the floor
 *
 * Speeds are "grid units per second", so the game runs identically on every screen.
 */

export type ItemGroup = "protein" | "topping" | "lid" | "hazard";

export type ItemKind =
  | "turkey" | "pastrami" | "roast"
  | "bacon" | "lettuce" | "tomato" | "onion" | "pickle" | "pepper"
  | "lid"
  | "sauce" | "jar" | "wilted";

export type ItemSpec = {
  /** Name shown to the player. */
  label: string;
  group: ItemGroup;
  /** Points before the combo multiplier. */
  points: number;
  /** How fast it falls. Lower = slower = easier to catch. */
  fallSpeed: number;
  /** Sprite size. 1 is normal. */
  size: number;
};

/**
 * THE FALLING ITEMS
 * Values follow FALLING_ASSET_SYSTEM.md: proteins are slow, heavy and valuable;
 * toppings are fast and cheap; the tiger-crunch lid is the rare finishing catch.
 */
export const ITEMS: Record<ItemKind, ItemSpec> = {
  // Proteins — the big catches. Slow, wide, worth the most.
  turkey:   { label: "Turkey",           group: "protein", points: 250, fallSpeed: 38, size: 1.25 },
  pastrami: { label: "Pastrami",         group: "protein", points: 250, fallSpeed: 38, size: 1.25 },
  roast:    { label: "Roast beef",       group: "protein", points: 250, fallSpeed: 38, size: 1.25 },

  // Toppings — quick supporting catches that fill out the stack.
  bacon:    { label: "Bacon bits",       group: "topping", points: 125, fallSpeed: 50, size: 1.0 },
  lettuce:  { label: "Lettuce",          group: "topping", points: 100, fallSpeed: 58, size: 1.0 },
  tomato:   { label: "Tomato",           group: "topping", points: 100, fallSpeed: 58, size: 1.0 },
  onion:    { label: "Red onion",        group: "topping", points: 100, fallSpeed: 58, size: 1.0 },
  pickle:   { label: "Pickles",          group: "topping", points: 100, fallSpeed: 58, size: 1.0 },
  pepper:   { label: "Pepperoncini",     group: "topping", points: 100, fallSpeed: 58, size: 1.0 },

  // The finish. Rare, slow, and completes a Super Stack.
  lid:      { label: "Tiger-crunch lid", group: "lid",     points: 750, fallSpeed: 33, size: 1.45 },

  // Fumbles — deli mishaps. Catching one costs a life.
  sauce:    { label: "Sauce cup",        group: "hazard",  points: 0,   fallSpeed: 48, size: 1.0 },
  jar:      { label: "Pickle jar",       group: "hazard",  points: 0,   fallSpeed: 46, size: 1.1 },
  wilted:   { label: "Wilted lettuce",   group: "hazard",  points: 0,   fallSpeed: 50, size: 1.0 },
};

export const PROTEINS: ItemKind[] = ["turkey", "pastrami", "roast"];
export const TOPPINGS: ItemKind[] = ["bacon", "lettuce", "tomato", "onion", "pickle", "pepper"];
export const HAZARDS: ItemKind[] = ["sauce", "jar", "wilted"];

/** THE ROUND */
export const ROUND = {
  /** Length of one game, in seconds. */
  seconds: 60,
  /** Fumbles allowed before the round ends. */
  maxFumbles: 3,
  /** How fast the player slides across the lane, in grid units per second. */
  playerSpeed: 78,
  /** How wide the player's catching area is, either side of centre. Bigger = easier. */
  playerHalfWidth: 8,
  /** The band where a catch registers. */
  catchTop: 76,
  catchBottom: 90,
  /** Items above this line have left the screen. */
  despawnY: 106,
  spawnY: -10,
  /** Items never spawn closer than this to the lane edges. */
  spawnMargin: 9,
  /** Never allow more than this many items on screen at once. */
  maxItems: 9,
};

/**
 * DIFFICULTY CURVE
 * The round moves through these phases. Each one spawns faster, throws more
 * fumbles, and speeds everything up, so the last 20 seconds feel like a rush.
 *
 * `scoreScale` is what makes surviving worth it: everything caught in the RUSH is
 * worth far more, so a player who fumbles out early misses the best part of the round.
 */
export const PHASES = [
  { untilSecond: 20, label: "WARM UP",  spawnMs: 900, hazardChance: 0.08, speedScale: 1.0,  scoreScale: 1.0 },
  { untilSecond: 42, label: "STACK IT", spawnMs: 680, hazardChance: 0.14, speedScale: 1.2,  scoreScale: 1.35 },
  { untilSecond: 60, label: "RUSH!",    spawnMs: 500, hazardChance: 0.19, speedScale: 1.45, scoreScale: 1.8 },
];

/** THE TIGER-CRUNCH LID — the finishing move. */
export const LID = {
  /** Layers you must stack before a lid can appear. */
  proteinsNeeded: 2,
  toppingsNeeded: 4,
  /** Once you qualify, the chance each spawn is a lid. */
  chancePerSpawn: 0.22,
  /** Minimum gap between lids, in milliseconds. */
  cooldownMs: 14000,
  /** Extra points per layer in the sandwich you just completed. */
  bonusPerLayer: 100,
};

/**
 * COMBO — consecutive catches.
 * Catching a fumble object resets it to zero. Dropping good food only halves it,
 * so a slip costs you but does not wipe out a whole round of good play.
 */
export const COMBO_TIERS = [
  { from: 18, multiplier: 5 },
  { from: 10, multiplier: 4 },
  { from: 6, multiplier: 3 },
  { from: 3, multiplier: 2 },
];

export function comboMultiplier(combo: number): number {
  for (const tier of COMBO_TIERS) if (combo >= tier.from) return tier.multiplier;
  return 1;
}

export function phaseAt(elapsedSeconds: number) {
  for (const phase of PHASES) if (elapsedSeconds < phase.untilSecond) return phase;
  return PHASES[PHASES.length - 1];
}

/**
 * END-OF-ROUND BONUSES
 * These are where a careful player pulls away from a frantic one. Both are printed
 * on the results receipt so the player can see exactly why they scored what they did.
 */
export const END_BONUS = {
  /** Paid on a clean counter, by how many fumbles you finished with. */
  cleanCounter: [15000, 6000, 1500] as number[],
  /** Paid for surviving all 60 seconds instead of fumbling out. */
  survivedRound: 10000,
};

/** How many layers a sandwich shows before the tray visually tops out. */
export const MAX_VISIBLE_LAYERS = 8;

/** Score needed to reach the board is worked out from the board itself, never hard-coded. */
export const LEADERBOARD_SIZE = 5;
