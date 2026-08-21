/**
 * The Fat Stack round — pure simulation.
 *
 * No React and no browser code in this file, on purpose: the round can be played thousands
 * of times in a script to verify the balance before any human touches it
 * (see `scripts/simulate-balance.ts`, run with `pnpm balance`).
 *
 * THE LOOP THIS FILE IMPLEMENTS
 *   Catches fill a PENDING POT and grow the tower. A tiger-crunch lid arrives on a random
 *   timer once the tower is a real sandwich — catch it to BANK the pot (plus a bonus that
 *   grows with the square of the height). Stack past the limit and the tower collapses:
 *   the pot spills, the round continues. Time running out also forfeits the pot.
 *   Hazards are a separate axis: catch three and the round ends.
 *
 * The simulation advances by elapsed seconds, never frame count, so the game plays
 * identically on a 60 Hz laptop and a 120 Hz event TV.
 */
import {
  END_BONUS,
  FAIRNESS,
  HAZARDS,
  ITEMS,
  PHASES,
  PROTEINS,
  ROUND,
  TOPPINGS,
  TOWER,
  comboMultiplier,
  phaseAt,
  type ItemKind,
} from "./config";

export type EndReason = "time" | "fumbles" | null;

/**
 * Things the round wants the outside world to show or play. The UI drains this list every
 * frame; the simulator ignores it.
 */
export type GameEvent =
  | { type: "pot"; amount: number; x: number; y: number; group: "protein" | "topping"; combo: number }
  | { type: "combo-up"; multiplier: number }
  | { type: "bank"; amount: number; layers: number; x: number; y: number }
  | { type: "collapse"; lost: number; x: number; y: number }
  | { type: "fumble"; x: number; y: number }
  | { type: "drop" }
  | { type: "lid-spawned" }
  | { type: "lid-incoming" }
  | { type: "phase"; label: string }
  | { type: "bank-it" }
  | { type: "tick"; urgent: boolean };

export type FallingItem = {
  id: number;
  kind: ItemKind;
  x: number;
  y: number;
  speed: number;
  tilt: number;
};

export type Round = {
  items: FallingItem[];
  itemId: number;
  playerX: number;
  /** -1 left, 0 still, 1 right. Set by the UI each frame. */
  direction: number;
  /** Optional pointer-follow target; when set, overrides `direction`. */
  targetX: number | null;

  /** BANKED points — the only ones that count at the end. */
  score: number;
  /** UNBANKED points riding on the current tower. */
  pot: number;
  /** The tower itself, bottom-up. Its length is the height. */
  tower: ItemKind[];

  combo: number;
  bestCombo: number;
  lastMultiplier: number;
  fumbles: number;

  banks: number;
  biggestBank: number;
  /** The layers of the biggest banked sandwich — drawn as the hero on the results screen. */
  biggestBankLayers: ItemKind[];
  caught: number;
  dropped: number;
  spawned: number;
  potLostToCollapse: number;
  potLostToTime: number;
  collapses: number;

  elapsed: number;
  timeLeft: number;
  lastSpawnAt: number;
  /** Elapsed-time at which the next lid becomes available. */
  nextLidAt: number;
  lastTickSecond: number;
  phaseLabel: string;
  saidBankIt: boolean;
  /** True once the one-second lid warning has fired for the current lid timer. */
  lidWarned: boolean;

  /** Spawn fairness state. */
  lastWasHazard: boolean;
  spawnsSinceProtein: number;

  nextKind: ItemKind;
  message: string;
  messageTone: "good" | "bad" | "big";
  messageId: number;

  bonusClean: number;
  bonusSurvived: number;
  finalised: boolean;
  ended: EndReason;
  events: GameEvent[];
  /** Injectable so simulations are repeatable. */
  random: () => number;
};

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

function pick<T>(list: T[], random: () => number): T {
  return list[Math.floor(random() * list.length)];
}

/** What a bank is worth right now: the pot plus the quadratic height bonus. */
export function bankValue(pot: number, layers: number) {
  return pot + layers * layers * TOWER.bankBonusPerLayerSquared;
}

/** Schedule the next lid. Deeper towers wait less — the game shows mercy to gamblers. */
function scheduleLid(round: Round) {
  const spread = TOWER.lidIntervalMax - TOWER.lidIntervalMin;
  const base = TOWER.lidIntervalMin + round.random() * spread;
  const mercy = Math.max(0, round.tower.length - TOWER.lidMinLayers) * TOWER.lidMercyPerLayer;
  round.nextLidAt = round.elapsed + Math.max(2.5, base - mercy);
  round.lidWarned = false;
}

/**
 * Decide what falls next. Chosen one spawn ahead so NEXT UP always tells the truth.
 * Applies the fairness rules: no double hazards, no protein droughts, no hazards during
 * the opening grace period, and the lid arrives by timer — never by dice.
 */
function chooseKind(round: Round): ItemKind {
  if (round.tower.length >= TOWER.lidMinLayers && round.elapsed >= round.nextLidAt) {
    scheduleLid(round);
    return "lid";
  }

  const phase = phaseAt(round.elapsed);
  const hazardAllowed =
    round.elapsed >= ROUND.gracePeriod &&
    !(FAIRNESS.noConsecutiveHazards && round.lastWasHazard);

  if (round.spawnsSinceProtein >= FAIRNESS.maxSpawnsWithoutProtein) {
    return pick(PROTEINS, round.random);
  }
  if (hazardAllowed && round.random() < phase.hazardChance) {
    return pick(HAZARDS, round.random);
  }
  return round.random() < 0.32 ? pick(PROTEINS, round.random) : pick(TOPPINGS, round.random);
}

export function createRound(random: () => number = Math.random): Round {
  const round: Round = {
    items: [],
    itemId: 0,
    playerX: 50,
    direction: 0,
    targetX: null,
    score: 0,
    pot: 0,
    tower: [],
    combo: 0,
    bestCombo: 0,
    lastMultiplier: 1,
    fumbles: 0,
    banks: 0,
    biggestBank: 0,
    biggestBankLayers: [],
    caught: 0,
    dropped: 0,
    spawned: 0,
    potLostToCollapse: 0,
    potLostToTime: 0,
    collapses: 0,
    elapsed: 0,
    timeLeft: ROUND.seconds,
    lastSpawnAt: 0,
    nextLidAt: Number.POSITIVE_INFINITY,
    lastTickSecond: ROUND.seconds,
    phaseLabel: PHASES[0].label,
    saidBankIt: false,
    lidWarned: false,
    lastWasHazard: false,
    spawnsSinceProtein: 0,
    nextKind: "turkey",
    message: "CATCH IT!",
    messageTone: "good",
    messageId: 0,
    bonusClean: 0,
    bonusSurvived: 0,
    finalised: false,
    ended: null,
    events: [],
    random,
  };
  round.nextKind = chooseKind(round);
  return round;
}

function say(round: Round, message: string, tone: "good" | "bad" | "big") {
  round.message = message;
  round.messageTone = tone;
  round.messageId += 1;
}

function spawn(round: Round, kind: ItemKind, speedScale: number) {
  const spec = ITEMS[kind];
  round.itemId += 1;
  round.spawned += 1;
  round.items.push({
    id: round.itemId,
    kind,
    x: ROUND.hatch.left + round.random() * (ROUND.hatch.right - ROUND.hatch.left),
    y: ROUND.spawnY,
    speed: spec.fallSpeed * ROUND.fallScale * speedScale * (0.92 + round.random() * 0.16),
    tilt: Math.round(round.random() * 24 - 12),
  });

  // Bookkeeping for the fairness rules.
  round.lastWasHazard = spec.group === "hazard";
  if (spec.group === "protein") round.spawnsSinceProtein = 0;
  else if (spec.group !== "lid") round.spawnsSinceProtein += 1;

  if (kind === "lid") round.events.push({ type: "lid-spawned" });
}

function handleCatch(round: Round, item: FallingItem) {
  const spec = ITEMS[item.kind];

  if (spec.group === "hazard") {
    round.fumbles += 1;
    round.combo = 0;
    round.lastMultiplier = 1;
    say(round, "FAT FUMBLE!", "bad");
    round.events.push({ type: "fumble", x: item.x, y: item.y });
    if (round.fumbles >= ROUND.maxFumbles) round.ended = "fumbles";
    return;
  }

  if (spec.group === "lid") {
    // THE BANK. Pot and height bonus land in the score; the tower is complete.
    const amount = bankValue(round.pot, round.tower.length);
    round.score += amount;
    round.banks += 1;
    if (amount >= round.biggestBank) round.biggestBankLayers = [...round.tower];
    round.biggestBank = Math.max(round.biggestBank, amount);
    round.caught += 1;
    round.combo += 1;
    round.bestCombo = Math.max(round.bestCombo, round.combo);
    round.events.push({ type: "bank", amount, layers: round.tower.length, x: item.x, y: item.y });
    say(round, "FAT STACK!", "big");
    round.pot = 0;
    round.tower = [];
    round.nextLidAt = Number.POSITIVE_INFINITY;
    return;
  }

  // Food: grows the tower, fills the pot.
  round.combo += 1;
  round.bestCombo = Math.max(round.bestCombo, round.combo);
  const multiplier = comboMultiplier(round.combo);
  const phase = phaseAt(round.elapsed);
  const amount = Math.round(spec.points * multiplier * phase.potScale);

  round.tower = [...round.tower, item.kind];
  round.caught += 1;

  // Reaching the limit collapses the tower — that catch, and the whole pot, are lost.
  if (round.tower.length >= TOWER.collapseAt) {
    round.collapses += 1;
    round.potLostToCollapse += round.pot;
    round.events.push({ type: "collapse", lost: round.pot, x: item.x, y: item.y });
    say(round, "IT TOPPLED!", "bad");
    round.pot = 0;
    round.tower = [];
    round.nextLidAt = Number.POSITIVE_INFINITY;
    return;
  }

  round.pot += amount;
  round.events.push({ type: "pot", amount, x: item.x, y: item.y, group: spec.group, combo: round.combo });

  // The lid clock starts the moment the tower becomes bankable.
  if (round.tower.length === TOWER.lidMinLayers && !Number.isFinite(round.nextLidAt)) {
    scheduleLid(round);
  }

  if (multiplier > round.lastMultiplier) {
    say(round, `COMBO x${multiplier}!`, "big");
    round.events.push({ type: "combo-up", multiplier });
  } else if (spec.group === "protein") {
    say(round, `${spec.label.toUpperCase()}!`, "good");
  } else {
    say(round, "NICE CATCH!", "good");
  }
  round.lastMultiplier = multiplier;
}

function handleMiss(round: Round, item: FallingItem) {
  const group = ITEMS[item.kind].group;
  // Dodging a hazard is correct play; declining a lid is a legitimate gamble. No penalty.
  if (group === "hazard" || group === "lid") return;

  round.dropped += 1;
  if (round.combo >= 3) say(round, "DROPPED IT!", "bad");
  round.combo = Math.floor(round.combo / 2);
  round.lastMultiplier = comboMultiplier(round.combo);
  round.events.push({ type: "drop" });
}

/** Where the top of the tower is right now — the catch point. */
export function catchY(round: Round) {
  return TOWER.trayY - round.tower.length * TOWER.layerUnits;
}

/**
 * The band where a catch registers, following the top of the tower. Sized in grid units
 * but scaled with the fall speed, so it is the same fraction of a SECOND as it always was.
 */
export function catchBand(round: Round) {
  const y = catchY(round);
  return { top: y - 8 * ROUND.fallScale, bottom: y + 6 * ROUND.fallScale };
}

/** How wide the player's catching area is for a given item. */
export function catchReach(kind: ItemKind) {
  return ROUND.playerHalfWidth + ITEMS[kind].size * 2.5;
}

/** Advance the round by `dt` seconds. */
export function stepRound(round: Round, dt: number) {
  round.elapsed += dt;
  round.timeLeft = Math.max(0, ROUND.seconds - round.elapsed);

  const phase = phaseAt(round.elapsed);
  if (phase.label !== round.phaseLabel) {
    round.phaseLabel = phase.label;
    round.events.push({ type: "phase", label: phase.label });
  }

  const second = Math.ceil(round.timeLeft);
  if (second !== round.lastTickSecond) {
    if (second > 0 && second <= 5) round.events.push({ type: "tick", urgent: second <= 3 });
    round.lastTickSecond = second;
  }

  // The endgame warning: unbanked money is about to expire.
  if (!round.saidBankIt && round.timeLeft <= 10 && round.pot > 0) {
    round.saidBankIt = true;
    round.events.push({ type: "bank-it" });
    say(round, "BANK IT!", "big");
  }

  // Heads-up: the lid drops in about a second. The hatch glows and the horn sounds.
  if (!round.lidWarned && round.tower.length >= TOWER.lidMinLayers && round.elapsed >= round.nextLidAt - 1) {
    round.lidWarned = true;
    round.events.push({ type: "lid-incoming" });
  }

  // Movement — distance per second, so speed never depends on the monitor.
  if (round.targetX !== null) {
    const dx = round.targetX - round.playerX;
    const step = ROUND.playerSpeed * dt;
    round.playerX += Math.abs(dx) <= step ? dx : Math.sign(dx) * step;
  } else {
    round.playerX += round.direction * ROUND.playerSpeed * dt;
  }
  round.playerX = clamp(round.playerX, ROUND.playerHalfWidth, 100 - ROUND.playerHalfWidth);

  // Spawning
  if (round.elapsed - round.lastSpawnAt > phase.spawnMs / 1000 && round.items.length < ROUND.maxItems) {
    round.lastSpawnAt = round.elapsed;
    spawn(round, round.nextKind, phase.speedScale);
    round.nextKind = chooseKind(round);
  }

  // Falling, catching, missing
  const remaining: FallingItem[] = [];
  for (const item of round.items) {
    item.y += item.speed * dt;

    // Recomputed per item: a catch grows the tower, which moves the band for the next one.
    const band = catchBand(round);
    const inBand = item.y >= band.top && item.y <= band.bottom;
    if (inBand && Math.abs(item.x - round.playerX) < catchReach(item.kind)) {
      handleCatch(round, item);
      continue;
    }
    if (item.y > ROUND.despawnY) {
      handleMiss(round, item);
      continue;
    }
    remaining.push(item);
  }
  round.items = remaining;

  if (!round.ended && round.timeLeft <= 0) round.ended = "time";
  if (round.ended) finalise(round);
}

/** Runs once, the moment the round ends: forfeit the pot, pay the bonuses. */
function finalise(round: Round) {
  if (round.finalised) return;
  round.finalised = true;
  round.potLostToTime = round.pot;
  round.pot = 0;
  round.bonusClean = END_BONUS.cleanCounter[round.fumbles] ?? 0;
  round.bonusSurvived = round.ended === "time" ? END_BONUS.survivedRound : 0;
  round.score += round.bonusClean + round.bonusSurvived;
}

/**
 * Autopilot for the attract mode and `?demo`: chases the most valuable reachable good
 * item, prefers the lid when the tower is deep, and dodges hazards.
 */
export function autoDirection(round: Round): number {
  // Dodge first: anything nasty about to land on us.
  for (const item of round.items) {
    if (ITEMS[item.kind].group !== "hazard") continue;
    const timeToBand = (catchBand(round).top - item.y) / item.speed;
    if (timeToBand > 0.55 || timeToBand < -0.2) continue;
    if (Math.abs(item.x - round.playerX) < catchReach(item.kind) + 3) {
      return item.x > round.playerX ? -1 : 1;
    }
  }

  let target: FallingItem | null = null;
  let bestValue = -1;
  for (const item of round.items) {
    const spec = ITEMS[item.kind];
    if (spec.group === "hazard") continue;
    const timeToFloor = (catchBand(round).bottom - item.y) / item.speed;
    if (timeToFloor < 0) continue;
    const travel = Math.abs(item.x - round.playerX) / ROUND.playerSpeed;
    if (travel > timeToFloor + 0.1) continue;
    const worth =
      spec.group === "lid"
        ? bankValue(round.pot, round.tower.length) + 500
        : spec.points;
    const value = worth / Math.max(0.25, timeToFloor);
    if (value > bestValue) {
      bestValue = value;
      target = item;
    }
  }
  if (!target) return 0;
  const dx = target.x - round.playerX;
  if (Math.abs(dx) < 1.5) return 0;
  return dx > 0 ? 1 : -1;
}
