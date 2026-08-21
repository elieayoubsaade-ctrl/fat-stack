/**
 * The Super Stack round — pure simulation.
 *
 * There is no React and no browser code in this file on purpose: the round can be run
 * thousands of times in a script to check the balance before anyone plays it.
 * See `scripts/simulate-balance.ts`.
 *
 * The simulation advances by elapsed seconds, never by frame count, so the game plays
 * identically on a 60 Hz laptop and a 120 Hz event TV.
 */
import {
  END_BONUS,
  HAZARDS,
  ITEMS,
  LID,
  MAX_VISIBLE_LAYERS,
  PHASES,
  PROTEINS,
  ROUND,
  TOPPINGS,
  comboMultiplier,
  phaseAt,
  type ItemKind,
} from "./config";

export type MessageTone = "good" | "bad" | "big";
export type EndReason = "time" | "fumbles" | null;

/** Sounds the round wants played. The UI drains this list each frame. */
export type SoundEvent =
  | { type: "catch-protein"; combo: number }
  | { type: "catch-topping"; combo: number }
  | { type: "combo-up"; multiplier: number }
  | { type: "super-stack" }
  | { type: "fumble" }
  | { type: "drop" }
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
  score: number;
  combo: number;
  bestCombo: number;
  lastMultiplier: number;
  fumbles: number;
  /** Layers caught since the last completed Super Stack. */
  stack: ItemKind[];
  /** Layers currently drawn on the tray. */
  layers: ItemKind[];
  superStacks: number;
  caught: number;
  dropped: number;
  spawned: number;
  elapsed: number;
  lastSpawnAt: number;
  lastLidAt: number;
  lastTickSecond: number;
  nextKind: ItemKind;
  timeLeft: number;
  phaseLabel: string;
  message: string;
  messageTone: MessageTone;
  messageId: number;
  ended: EndReason;
  /** Filled in once the round ends, and shown on the receipt. */
  bonusClean: number;
  bonusSurvived: number;
  finalised: boolean;
  events: SoundEvent[];
  /** Injectable so simulations are repeatable. */
  random: () => number;
};

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

function pick<T>(list: T[], random: () => number): T {
  return list[Math.floor(random() * list.length)];
}

function countGroup(stack: ItemKind[], group: "protein" | "topping") {
  return stack.reduce((total, kind) => (ITEMS[kind].group === group ? total + 1 : total), 0);
}

function lidIsReady(round: Round) {
  return (
    countGroup(round.stack, "protein") >= LID.proteinsNeeded &&
    countGroup(round.stack, "topping") >= LID.toppingsNeeded &&
    round.elapsed - round.lastLidAt > LID.cooldownMs / 1000
  );
}

/** Decide what falls next. Called one spawn early so "NEXT UP" can show the truth. */
function chooseKind(round: Round, hazardChance: number): ItemKind {
  if (lidIsReady(round) && round.random() < LID.chancePerSpawn) {
    round.lastLidAt = round.elapsed;
    return "lid";
  }
  if (round.random() < hazardChance) return pick(HAZARDS, round.random);
  // Proteins are deliberately rarer than toppings so a big catch feels like a prize.
  return round.random() < 0.32 ? pick(PROTEINS, round.random) : pick(TOPPINGS, round.random);
}

export function createRound(random: () => number = Math.random): Round {
  const round: Round = {
    items: [],
    itemId: 0,
    playerX: 50,
    direction: 0,
    score: 0,
    combo: 0,
    bestCombo: 0,
    lastMultiplier: 1,
    fumbles: 0,
    stack: [],
    layers: [],
    superStacks: 0,
    caught: 0,
    dropped: 0,
    spawned: 0,
    elapsed: 0,
    lastSpawnAt: 0,
    lastLidAt: 0,
    lastTickSecond: ROUND.seconds,
    nextKind: "turkey",
    timeLeft: ROUND.seconds,
    phaseLabel: PHASES[0].label,
    message: "CATCH IT!",
    messageTone: "good",
    messageId: 0,
    ended: null,
    bonusClean: 0,
    bonusSurvived: 0,
    finalised: false,
    events: [],
    random,
  };
  round.nextKind = chooseKind(round, PHASES[0].hazardChance);
  return round;
}

function say(round: Round, message: string, tone: MessageTone) {
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
    x: ROUND.spawnMargin + round.random() * (100 - ROUND.spawnMargin * 2),
    y: ROUND.spawnY,
    speed: spec.fallSpeed * speedScale * (0.92 + round.random() * 0.16),
    tilt: Math.round(round.random() * 24 - 12),
  });
}

function handleCatch(round: Round, item: FallingItem, scoreScale: number) {
  const spec = ITEMS[item.kind];

  if (spec.group === "hazard") {
    round.fumbles += 1;
    round.combo = 0;
    round.lastMultiplier = 1;
    say(round, "FAT FUMBLE!", "bad");
    round.events.push({ type: "fumble" });
    if (round.fumbles >= ROUND.maxFumbles) round.ended = "fumbles";
    return;
  }

  round.combo += 1;
  round.bestCombo = Math.max(round.bestCombo, round.combo);
  const multiplier = comboMultiplier(round.combo);

  if (spec.group === "lid") {
    const layers = round.stack.length;
    round.score += Math.round((spec.points + layers * LID.bonusPerLayer) * multiplier * scoreScale);
    round.superStacks += 1;
    round.caught += 1;
    round.stack = [];
    round.layers = [];
    round.lastMultiplier = multiplier;
    say(round, "SUPER STACK!", "big");
    round.events.push({ type: "super-stack" });
    return;
  }

  round.score += Math.round(spec.points * multiplier * scoreScale);
  round.caught += 1;
  round.stack.push(item.kind);
  round.layers = [...round.layers, item.kind].slice(-MAX_VISIBLE_LAYERS);

  if (multiplier > round.lastMultiplier) {
    say(round, `COMBO x${multiplier}!`, "big");
    round.events.push({ type: "combo-up", multiplier });
  } else if (spec.group === "protein") {
    say(round, `${spec.label.toUpperCase()}!`, "good");
  } else {
    say(round, "NICE CATCH!", "good");
  }
  round.lastMultiplier = multiplier;
  round.events.push(
    spec.group === "protein"
      ? { type: "catch-protein", combo: round.combo }
      : { type: "catch-topping", combo: round.combo },
  );
}

function handleMiss(round: Round, item: FallingItem) {
  // Dodging a fumble object is correct play, so it costs nothing.
  if (ITEMS[item.kind].group === "hazard") return;

  round.dropped += 1;
  if (round.combo >= 3) say(round, "DROPPED IT!", "bad");
  // A slip halves the combo rather than wiping it, so consistent play still compounds.
  round.combo = Math.floor(round.combo / 2);
  round.lastMultiplier = comboMultiplier(round.combo);
  round.events.push({ type: "drop" });
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
  round.phaseLabel = phase.label;

  const second = Math.ceil(round.timeLeft);
  if (second !== round.lastTickSecond) {
    if (second > 0 && second <= 5) round.events.push({ type: "tick", urgent: second <= 3 });
    round.lastTickSecond = second;
  }

  // Movement — distance per second, so speed never depends on the monitor.
  round.playerX = clamp(
    round.playerX + round.direction * ROUND.playerSpeed * dt,
    ROUND.playerHalfWidth,
    100 - ROUND.playerHalfWidth,
  );

  // Spawning
  if (round.elapsed - round.lastSpawnAt > phase.spawnMs / 1000 && round.items.length < ROUND.maxItems) {
    round.lastSpawnAt = round.elapsed;
    spawn(round, round.nextKind, phase.speedScale);
    round.nextKind = chooseKind(round, phase.hazardChance);
  }

  // Falling, catching, missing
  const remaining: FallingItem[] = [];
  for (const item of round.items) {
    item.y += item.speed * dt;

    const inBand = item.y >= ROUND.catchTop && item.y <= ROUND.catchBottom;
    if (inBand && Math.abs(item.x - round.playerX) < catchReach(item.kind)) {
      handleCatch(round, item, phase.scoreScale);
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

/** Award the end-of-round bonuses. Runs once, the moment the round ends. */
function finalise(round: Round) {
  if (round.finalised) return;
  round.finalised = true;
  round.bonusClean = END_BONUS.cleanCounter[round.fumbles] ?? 0;
  round.bonusSurvived = round.ended === "time" ? END_BONUS.survivedRound : 0;
  round.score += round.bonusClean + round.bonusSurvived;
}

/** Autoplay: chase the lowest good item, ignore fumble objects. Used by `?demo`. */
export function autoDirection(round: Round) {
  let target: FallingItem | null = null;
  for (const item of round.items) {
    if (ITEMS[item.kind].group === "hazard") continue;
    if (item.y > ROUND.catchBottom) continue;
    if (!target || item.y > target.y) target = item;
  }
  if (!target) return 0;
  const dx = target.x - round.playerX;
  if (Math.abs(dx) < 1.5) return 0;
  return dx > 0 ? 1 : -1;
}
