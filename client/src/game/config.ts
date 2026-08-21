/**
 * SUPER STACK — BALANCE SHEET
 *
 * This is the one file to edit when the game feels too hard, too easy, or too slow.
 * Everything here is plain numbers. After changing anything, run `pnpm balance` — it plays
 * thousands of rounds and tells you whether the game still holds together.
 *
 * Positions are measured on a 0–100 grid across the play lane:
 *   x = 0 is the far left, x = 100 is the far right
 *   y = 0 is the top,      y = 100 is the floor
 *
 * Speeds are "grid units per second", so the game runs identically on every screen.
 *
 * THE ECONOMY (the heart of the game):
 *   Catches do NOT pay into your score. They pay into a PENDING POT and add a layer to
 *   your sandwich tower. Catching a tiger-crunch lid BANKS the pot into your score with a
 *   bonus that grows with tower height. Stack past the collapse limit and the tower falls —
 *   the whole unbanked pot is lost. Anything unbanked when time runs out is also lost.
 */

export type ItemGroup = "protein" | "topping" | "lid" | "hazard";

export type ItemKind =
  | "turkey" | "pastrami" | "roast"
  | "bacon" | "lettuce" | "tomato" | "onion" | "pickle" | "pepper"
  | "lid"
  | "sauce";

export type ItemSpec = {
  /** Name shown to the player. */
  label: string;
  group: ItemGroup;
  /** Points added to the pending pot (before combo and phase bonuses). */
  points: number;
  /** How fast it falls. Lower = slower = easier to catch. */
  fallSpeed: number;
  /** Sprite size. 1 is normal. */
  size: number;
};

/**
 * THE FALLING ITEMS
 * Per FALLING_ASSET_SYSTEM.md: proteins are slow, heavy and valuable; toppings are fast
 * and cheap; the lid is the bank. The pickle jar and wilted lettuce were cut from the
 * approved render package — the tipped sauce cup is the one fumble object.
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

  // The bank. Catch it to cash in your pot. Miss it and the gamble continues.
  lid:      { label: "Tiger-crunch lid", group: "lid",     points: 0,   fallSpeed: 34, size: 1.45 },

  // The fumble. Catching one costs a life.
  sauce:    { label: "Sauce cup",        group: "hazard",  points: 0,   fallSpeed: 48, size: 1.05 },
};

export const PROTEINS: ItemKind[] = ["turkey", "pastrami", "roast"];
export const TOPPINGS: ItemKind[] = ["bacon", "lettuce", "tomato", "onion", "pickle", "pepper"];
export const HAZARDS: ItemKind[] = ["sauce"];

/** THE ROUND */
export const ROUND = {
  /** Length of one game, in seconds. */
  seconds: 60,
  /** Fumbles allowed before the round ends. */
  maxFumbles: 3,
  /** Hazards never spawn during the first N seconds — new players learn catching first. */
  gracePeriod: 8,
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
  maxItems: 12,
};

/**
 * DIFFICULTY CURVE
 * Each phase spawns faster and falls faster, so the last stretch is a rush.
 * `potScale` multiplies what each catch adds to the pot — surviving to the RUSH is
 * where the money is.
 */
export const PHASES = [
  { untilSecond: 20, label: "WARM UP",  spawnMs: 850, hazardChance: 0.10, speedScale: 1.0,  potScale: 1.0 },
  { untilSecond: 42, label: "STACK IT", spawnMs: 620, hazardChance: 0.16, speedScale: 1.2,  potScale: 1.35 },
  { untilSecond: 60, label: "RUSH!",    spawnMs: 420, hazardChance: 0.20, speedScale: 1.45, potScale: 1.8 },
];

/**
 * THE TOWER AND THE BANK — the push-your-luck core.
 */
export const TOWER = {
  /** The tower collapses at this many layers and the whole pot is lost. */
  collapseAt: 12,
  /** The tower starts visibly wobbling from this many layers. */
  wobbleAt: 8,
  /** Lids only start arriving once the tower is a real sandwich. */
  lidMinLayers: 3,
  /** Seconds between lid opportunities (random inside this window)... */
  lidIntervalMin: 1.5,
  lidIntervalMax: 4,
  /** ...tightened by this many seconds per layer above the minimum (mercy for deep stacks). */
  lidMercyPerLayer: 0.3,
  /** Banking pays the pot PLUS layers² × this. Quadratic: one 10-stack beats two 5-stacks. */
  bankBonusPerLayerSquared: 80,
};

/**
 * SPAWN FAIRNESS
 * Pure randomness produces streaks that feel rigged. These rules bend it toward fair:
 */
export const FAIRNESS = {
  /** Never two hazards in a row. */
  noConsecutiveHazards: true,
  /** If this many spawns pass without a protein, the next one is forced to be one. */
  maxSpawnsWithoutProtein: 6,
};

/**
 * COMBO — consecutive catches.
 * Catching a hazard resets it to zero. Dropping good food halves it, so one slip stings
 * without wiping out a whole round of good play.
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
 * END-OF-ROUND BONUSES — where careful play pulls away from frantic play.
 * Both are printed on the results receipt.
 */
export const END_BONUS = {
  /** Paid on a clean counter, indexed by how many fumbles you finished with. */
  cleanCounter: [15000, 6000, 1500] as number[],
  /** Paid for surviving all 60 seconds instead of fumbling out. */
  survivedRound: 10000,
};

/** The pre-round count-in, in seconds ("3 · 2 · 1 · STACK!"). */
export const COUNTDOWN_SECONDS = 3;

export const LEADERBOARD_SIZE = 5;
