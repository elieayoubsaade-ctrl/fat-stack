/**
 * Fatsandwich Fat Stack — event arcade game.
 *
 * This file is the screens, the input, and the animation loop. The rules live in
 * `round.ts`, the tuning numbers in `config.ts`, the sound in `audio.ts` — nothing about
 * balance is decided here.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { gameAssets } from "./assets";
import Ingredient, { artFor } from "./Ingredient";
import { isMuted, primeAudio, setMuted, setMusicIntensity, sfx, startMusic, stopMusic } from "./audio";
import { CHARACTERS, characterById } from "./characters";
import { COUNTDOWN_SECONDS, ITEMS, LEADERBOARD_SIZE, ROUND, TOWER, type ItemKind } from "./config";
import {
  autoDirection,
  bankValue,
  createRound,
  stepRound,
  type EndReason,
  type FallingItem,
  type GameEvent,
  type Round,
} from "./round";

// ─────────────────────────────────────────────────────────────────────────────
// 1. Helpers and local types
// ─────────────────────────────────────────────────────────────────────────────

type Screen = "start" | "select" | "how-to" | "playing" | "results" | "board";

type View = {
  items: FallingItem[];
  playerX: number;
  score: number;
  pot: number;
  layers: ItemKind[];
  combo: number;
  multiplier: number;
  fumbles: number;
  banks: number;
  timeLeft: number;
  phaseLabel: string;
  message: string;
  messageTone: string;
  messageId: number;
  nextKind: ItemKind;
};

type RunSummary = {
  score: number;
  banks: number;
  biggestBank: number;
  bestCombo: number;
  fumbles: number;
  collapses: number;
  caught: number;
  potLost: number;
  bonusClean: number;
  bonusSurvived: number;
  reason: EndReason;
};

type FloatText = { id: number; text: string; x: number; y: number; tone: "topping" | "protein" | "bank" | "bad" };
type Slam = { id: number; text: string; tone: "phase" | "go" | "warn" | "time" };
type Debris = { id: number; kind: ItemKind; dx: number; rot: number };
type ScoreEntry = { name: string; score: number };
type ResultStage = "counting" | "reveal" | "initials" | "done";

const SCORES_KEY = "fatsandwich-super-stack-scores";
const BEST_KEY = "fatsandwich-super-stack-best";
const CHAR_KEY = "fatsandwich-super-stack-char";

/** The simulation always advances in steps of at most this long. */
const PHYSICS_STEP = 1 / 120;
/** After a stall longer than this the game stops trying to catch up. */
const MAX_FRAME = 0.25;
/** Seconds of inactivity on the start screen before the attract demo begins. */
const ATTRACT_AFTER = 20;

/** Seed board, set from the measured score range in `pnpm balance`. */
const DEFAULT_SCORES: ScoreEntry[] = [
  { name: "AYA", score: 86400 },
  { name: "MO", score: 79250 },
  { name: "SAM", score: 71800 },
  { name: "LEO", score: 64300 },
  { name: "NOOR", score: 57900 },
];

const fmt = (n: number) => n.toLocaleString("en-US");

function loadScores(): ScoreEntry[] {
  try {
    const saved = localStorage.getItem(SCORES_KEY);
    const parsed = saved ? (JSON.parse(saved) as ScoreEntry[]) : DEFAULT_SCORES;
    return Array.isArray(parsed) && parsed.length ? parsed : DEFAULT_SCORES;
  } catch {
    return DEFAULT_SCORES;
  }
}

function loadBest(): number {
  try {
    return Number(localStorage.getItem(BEST_KEY)) || 0;
  } catch {
    return 0;
  }
}

function toView(round: Round): View {
  return {
    items: round.items,
    playerX: round.playerX,
    score: round.score,
    pot: round.pot,
    layers: round.tower,
    combo: round.combo,
    multiplier: round.lastMultiplier,
    fumbles: round.fumbles,
    banks: round.banks,
    timeLeft: round.timeLeft,
    phaseLabel: round.phaseLabel,
    message: round.message,
    messageTone: round.messageTone,
    messageId: round.messageId,
    nextKind: round.nextKind,
  };
}

function vibrate(pattern: number | number[]) {
  try {
    navigator.vibrate?.(pattern);
  } catch {
    /* not supported */
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. Component
// ─────────────────────────────────────────────────────────────────────────────

export default function SuperStackGame() {
  const [screen, setScreen] = useState<Screen>("start");
  const [view, setView] = useState<View>(() => toView(createRound()));
  const [lastRun, setLastRun] = useState<RunSummary | null>(null);
  const [scores, setScores] = useState<ScoreEntry[]>(loadScores);
  const [best, setBest] = useState<number>(loadBest);
  const [muted, setMutedState] = useState(isMuted());
  const [paused, setPaused] = useState(false);
  const [attract, setAttract] = useState(false);
  const [countdownDisplay, setCountdownDisplay] = useState<number | null>(null);
  const [slam, setSlam] = useState<Slam | null>(null);
  const [floats, setFloats] = useState<FloatText[]>([]);
  const [debris, setDebris] = useState<Debris[]>([]);
  const [shakeId, setShakeId] = useState(0);
  const [tunaReact, setTunaReact] = useState(0);
  const [mamiReact, setMamiReact] = useState(0);
  const [scorePulse, setScorePulse] = useState(0);
  const [hasPlayed, setHasPlayed] = useState(false);
  const [charId, setCharId] = useState<string>(() => {
    try {
      return localStorage.getItem(CHAR_KEY) ?? CHARACTERS[0].id;
    } catch {
      return CHARACTERS[0].id;
    }
  });
  const playerChar = characterById(charId);

  // Results sequencing
  const [resultStage, setResultStage] = useState<ResultStage>("done");
  const [countedScore, setCountedScore] = useState(0);
  const [initials, setInitials] = useState<[number, number, number]>([0, 0, 0]);
  const [initialSlot, setInitialSlot] = useState(0);
  const [savedRank, setSavedRank] = useState<number | null>(null);

  const roundRef = useRef<Round | null>(null);
  const keysRef = useRef({ left: false, right: false });
  const screenRef = useRef<Screen>(screen);
  const pausedRef = useRef(false);
  const attractRef = useRef(false);
  const hasPlayedRef = useRef(false);
  const countdownRef = useRef(0);
  const lastTowerRef = useRef<ItemKind[]>([]);
  const laneRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef(false);
  const uidRef = useRef(0);

  const demoMode = useMemo(() => new URLSearchParams(window.location.search).has("demo"), []);

  useEffect(() => {
    screenRef.current = screen;
  }, [screen]);
  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);
  useEffect(() => {
    attractRef.current = attract;
  }, [attract]);
  useEffect(() => {
    hasPlayedRef.current = hasPlayed;
  }, [hasPlayed]);
  useEffect(() => {
    localStorage.setItem(SCORES_KEY, JSON.stringify(scores));
  }, [scores]);
  useEffect(() => {
    localStorage.setItem(BEST_KEY, String(best));
  }, [best]);
  useEffect(() => {
    localStorage.setItem(CHAR_KEY, charId);
  }, [charId]);

  const boardCutoff = scores.length >= LEADERBOARD_SIZE ? (scores[scores.length - 1]?.score ?? 0) : 0;
  const topScore = scores[0]?.score ?? 0;

  const pushSlam = useCallback((text: string, tone: Slam["tone"]) => {
    uidRef.current += 1;
    const id = uidRef.current;
    setSlam({ id, text, tone });
    window.setTimeout(() => setSlam((current) => (current?.id === id ? null : current)), 950);
  }, []);

  const pushFloat = useCallback((text: string, x: number, y: number, tone: FloatText["tone"]) => {
    uidRef.current += 1;
    const id = uidRef.current;
    setFloats((current) => [...current.slice(-9), { id, text, x, y, tone }]);
    window.setTimeout(() => setFloats((current) => current.filter((f) => f.id !== id)), 1000);
  }, []);

  /** Turn one frame's worth of round events into sound, floats, shakes and reactions. */
  const drainEvents = useCallback(
    (events: GameEvent[]) => {
      for (const event of events) {
        switch (event.type) {
          case "pot":
            if (event.group === "protein") sfx.catchProtein(event.combo);
            else sfx.catchTopping(event.combo);
            pushFloat(`+${fmt(event.amount)}`, event.x, event.y, event.group);
            vibrate(20);
            break;
          case "combo-up":
            sfx.comboUp(event.multiplier);
            break;
          case "bank":
            sfx.bank(event.layers);
            pushFloat(`+${fmt(event.amount)} BANKED!`, event.x, Math.min(70, event.y), "bank");
            setScorePulse((n) => n + 1);
            setMamiReact((n) => n + 1);
            vibrate([40, 40, 40]);
            break;
          case "collapse": {
            sfx.collapse();
            setShakeId((n) => n + 1);
            setTunaReact((n) => n + 1);
            pushFloat(event.lost > 0 ? `-${fmt(event.lost)} SPILLED!` : "TOPPLED!", event.x, Math.min(70, event.y), "bad");
            const fallen = lastTowerRef.current;
            setDebris(
              fallen.map((kind) => {
                uidRef.current += 1;
                return { id: uidRef.current, kind, dx: Math.round(Math.random() * 44 - 22), rot: Math.round(Math.random() * 240 - 120) };
              }),
            );
            window.setTimeout(() => setDebris([]), 750);
            vibrate(120);
            break;
          }
          case "fumble":
            sfx.fumble();
            setShakeId((n) => n + 1);
            setTunaReact((n) => n + 1);
            pushFloat("FUMBLE!", event.x, event.y, "bad");
            vibrate(80);
            break;
          case "drop":
            sfx.drop();
            break;
          case "lid-spawned":
            sfx.lidIncoming();
            break;
          case "phase":
            sfx.phaseSlam();
            setMusicIntensity(event.label);
            pushSlam(event.label, "phase");
            break;
          case "bank-it":
            sfx.bankItWarning();
            pushSlam("BANK IT!", "warn");
            break;
          case "tick":
            sfx.tick(event.urgent);
            break;
        }
      }
      events.length = 0;
    },
    [pushFloat, pushSlam],
  );

  const finishRound = useCallback((round: Round) => {
    stopMusic();
    if (attractRef.current) {
      setAttract(false);
      setScreen("start");
      return;
    }
    sfx.roundOver();
    setLastRun({
      score: round.score,
      banks: round.banks,
      biggestBank: round.biggestBank,
      bestCombo: round.bestCombo,
      fumbles: round.fumbles,
      collapses: round.collapses,
      caught: round.caught,
      potLost: round.potLostToCollapse + round.potLostToTime,
      bonusClean: round.bonusClean,
      bonusSurvived: round.bonusSurvived,
      reason: round.ended,
    });
    setSavedRank(null);
    setCountedScore(0);
    setResultStage("counting");
    setScreen("results");
  }, []);

  const finishRef = useRef(finishRound);
  useEffect(() => {
    finishRef.current = finishRound;
  }, [finishRound]);
  const drainRef = useRef(drainEvents);
  useEffect(() => {
    drainRef.current = drainEvents;
  }, [drainEvents]);

  const startGame = useCallback((asAttract: boolean) => {
    primeAudio();
    sfx.uiPress();
    keysRef.current.left = false;
    keysRef.current.right = false;
    dragRef.current = false;
    const round = createRound();
    roundRef.current = round;
    lastTowerRef.current = [];
    countdownRef.current = asAttract ? 0 : COUNTDOWN_SECONDS + 0.001;
    setCountdownDisplay(asAttract ? null : COUNTDOWN_SECONDS);
    setAttract(asAttract);
    setPaused(false);
    setFloats([]);
    setDebris([]);
    setSlam(null);
    setView(toView(round));
    setMusicIntensity("WARM UP");
    if (asAttract) startMusic();
    else setHasPlayed(true);
    setScreen("playing");
  }, []);

  const goTo = useCallback((next: Screen) => {
    primeAudio();
    sfx.uiPress();
    setScreen(next);
  }, []);

  /**
   * The game loop. Depends only on `screen` — nothing that changes during play can
   * restart it, which is what keeps the countdown honest.
   */
  useEffect(() => {
    if (screen !== "playing") return;
    const round = roundRef.current;
    if (!round) return;

    let raf = 0;
    let previous = performance.now();

    const tick = (now: number) => {
      const elapsed = Math.min(MAX_FRAME, Math.max(0, (now - previous) / 1000));
      previous = now;

      if (pausedRef.current) {
        raf = requestAnimationFrame(tick);
        return;
      }

      // Pre-round count-in: the world is visible but frozen.
      if (countdownRef.current > 0) {
        const before = Math.ceil(countdownRef.current);
        countdownRef.current -= elapsed;
        const after = Math.ceil(Math.max(0, countdownRef.current));
        if (after !== before) {
          if (after > 0) {
            sfx.countBeep(false);
            setCountdownDisplay(after);
          } else {
            sfx.countBeep(true);
            setCountdownDisplay(null);
            pushSlam("STACK!", "go");
            startMusic();
          }
        }
        raf = requestAnimationFrame(tick);
        return;
      }

      round.direction = attractRef.current
        ? autoDirection(round)
        : (keysRef.current.right ? 1 : 0) - (keysRef.current.left ? 1 : 0);

      lastTowerRef.current = round.tower;

      // Slow frames split into fixed sub-steps: real-world speed on a stuttering machine,
      // and an item can never skip past the tray between two frames.
      let remaining = elapsed;
      while (remaining > 0 && !round.ended) {
        const slice = Math.min(PHYSICS_STEP, remaining);
        stepRound(round, slice);
        remaining -= slice;
      }

      drainRef.current(round.events);
      setView(toView(round));

      if (round.ended) {
        finishRef.current(round);
        return;
      }
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [screen, pushSlam]);

  /** Keyboard: arrows/A/D move, Space/Enter advance, P/Escape pause. */
  useEffect(() => {
    const isLeft = (key: string) => key === "ArrowLeft" || key.toLowerCase() === "a";
    const isRight = (key: string) => key === "ArrowRight" || key.toLowerCase() === "d";

    const onKeyDown = (event: KeyboardEvent) => {
      const current = screenRef.current;

      // Any key wakes the machine out of attract mode.
      if (attractRef.current && current === "playing") {
        event.preventDefault();
        stopMusic();
        setAttract(false);
        setScreen("start");
        return;
      }

      // On the character-select screen the joystick browses the cast.
      if (current === "select" && (isLeft(event.key) || isRight(event.key))) {
        event.preventDefault();
        sfx.uiPress();
        setCharId((cur) => {
          const index = CHARACTERS.findIndex((c) => c.id === cur);
          const next = (index + (isRight(event.key) ? 1 : -1) + CHARACTERS.length) % CHARACTERS.length;
          return CHARACTERS[next].id;
        });
        return;
      }

      if (isLeft(event.key)) {
        event.preventDefault();
        keysRef.current.left = true;
        if (roundRef.current) roundRef.current.targetX = null;
        return;
      }
      if (isRight(event.key)) {
        event.preventDefault();
        keysRef.current.right = true;
        if (roundRef.current) roundRef.current.targetX = null;
        return;
      }
      if (event.repeat) return;

      if ((event.key === "Escape" || event.key.toLowerCase() === "p") && current === "playing") {
        event.preventDefault();
        setPaused((value) => !value);
        return;
      }

      if (event.key === " " || event.key === "Enter") {
        // The results screen owns Enter while its own sequence is running.
        if (current === "results" || current === "playing") return;
        event.preventDefault();
        if (current === "start" || current === "board") {
          goTo("select");
        } else if (current === "select") {
          if (hasPlayedRef.current) startGame(false);
          else goTo("how-to");
        } else if (current === "how-to") {
          startGame(false);
        }
      }
    };

    const onKeyUp = (event: KeyboardEvent) => {
      if (isLeft(event.key)) keysRef.current.left = false;
      if (isRight(event.key)) keysRef.current.right = false;
    };

    const releaseAll = () => {
      keysRef.current.left = false;
      keysRef.current.right = false;
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", releaseAll);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", releaseAll);
    };
  }, [goTo, startGame]);

  /** Attract mode: idle on the start screen for a while and the game demos itself. */
  useEffect(() => {
    if (screen !== "start") return;
    if (demoMode) {
      const t = window.setTimeout(() => startGame(true), 600);
      return () => window.clearTimeout(t);
    }
    let timer = window.setTimeout(() => startGame(true), ATTRACT_AFTER * 1000);
    const reset = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => startGame(true), ATTRACT_AFTER * 1000);
    };
    window.addEventListener("pointerdown", reset);
    window.addEventListener("keydown", reset);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("pointerdown", reset);
      window.removeEventListener("keydown", reset);
    };
  }, [screen, demoMode, startGame]);

  /** Drag control: the sandwich follows your finger or pointer across the lane. */
  const onLanePointer = useCallback((event: React.PointerEvent) => {
    if (attractRef.current) {
      stopMusic();
      setAttract(false);
      setScreen("start");
      return;
    }
    const lane = laneRef.current;
    const round = roundRef.current;
    if (!lane || !round) return;
    if (event.type === "pointerdown") dragRef.current = true;
    if (!dragRef.current) return;
    const rect = lane.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    round.targetX = Math.max(ROUND.playerHalfWidth, Math.min(100 - ROUND.playerHalfWidth, x));
  }, []);
  const onLanePointerEnd = useCallback(() => {
    dragRef.current = false;
    if (roundRef.current) roundRef.current.targetX = null;
  }, []);

  const spinInitial = useCallback(
    (slot: number, dir: number) => {
      sfx.uiPress();
      setInitials((cur) => {
        const next = [...cur] as [number, number, number];
        next[slot] = (next[slot] + dir + 26) % 26;
        return next;
      });
    },
    [],
  );

  const confirmInitials = useCallback(() => {
    if (!lastRun) return;
    sfx.fanfare();
    const name = initials.map((i) => String.fromCharCode(65 + i)).join("");
    setScores((current) => {
      const next = [...current, { name, score: lastRun.score }].sort((a, b) => b.score - a.score).slice(0, LEADERBOARD_SIZE);
      setSavedRank(next.findIndex((e) => e.name === name && e.score === lastRun.score) + 1);
      return next;
    });
    setResultStage("done");
  }, [initials, lastRun]);

  /** Results sequencing: count the score up, celebrate, then take initials. */
  useEffect(() => {
    if (screen !== "results" || !lastRun || resultStage !== "counting") return;

    let raf = 0;
    const startedAt = performance.now();
    const duration = 1100;
    const step = (now: number) => {
      const t = Math.min(1, (now - startedAt) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setCountedScore(Math.round(lastRun.score * eased));
      if (t < 1) {
        raf = requestAnimationFrame(step);
        return;
      }
      const qualifies = lastRun.score > boardCutoff || scores.length < LEADERBOARD_SIZE;
      const isBest = lastRun.score > best;
      if (isBest) setBest(lastRun.score);
      if (lastRun.score > topScore) {
        sfx.fanfare();
        pushSlam("NEW #1 TODAY!", "go");
      } else if (isBest) {
        sfx.fanfare();
        pushSlam("NEW PERSONAL BEST!", "go");
      }
      if (qualifies) {
        setResultStage("initials");
      } else {
        setResultStage("done");
      }
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [screen, resultStage, lastRun, best, boardCutoff, topScore, scores.length, pushSlam]);

  /** Keyboard entry for the three initials. */
  useEffect(() => {
    if (screen !== "results" || resultStage !== "initials") return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "ArrowUp") {
        event.preventDefault();
        spinInitial(initialSlot, 1);
      } else if (event.key === "ArrowDown") {
        event.preventDefault();
        spinInitial(initialSlot, -1);
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        setInitialSlot((s) => Math.max(0, s - 1));
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        setInitialSlot((s) => Math.min(2, s + 1));
      } else if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        confirmInitials();
      } else if (/^[a-zA-Z]$/.test(event.key)) {
        event.preventDefault();
        const code = event.key.toUpperCase().charCodeAt(0) - 65;
        setInitials((cur) => {
          const next = [...cur] as [number, number, number];
          next[initialSlot] = code;
          return next;
        });
        setInitialSlot((s) => Math.min(2, s + 1));
        sfx.uiPress();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [screen, resultStage, initialSlot, spinInitial, confirmInitials]);

  const toggleMute = () => {
    primeAudio();
    const next = !muted;
    setMuted(next);
    setMutedState(next);
  };

  const toggleFullscreen = () => {
    primeAudio();
    if (document.fullscreenElement) void document.exitFullscreen();
    else void document.documentElement.requestFullscreen?.();
  };

  // ───────────────────────────────────────────────────────────────────────────
  // 3. Screens
  // ───────────────────────────────────────────────────────────────────────────

  const seconds = Math.ceil(view.timeLeft);
  const urgent = seconds <= 10 && screen === "playing" && countdownDisplay === null;
  const layerCount = view.layers.length;
  const towerHeat = layerCount >= TOWER.collapseAt - 2 ? "hot" : layerCount >= TOWER.wobbleAt ? "warm" : "";
  const lidLive = view.nextKind === "lid" || view.items.some((item) => item.kind === "lid");
  const currentBankValue = bankValue(view.pot, layerCount);

  return (
    <main className="super-stack-app">
      <header className="game-topline" aria-label="Fatsandwich game header">
        <div className="logo-sticker">
          <img src={gameAssets.logo} alt="Fat Sandwich" />
        </div>
        <div className="super-title">
          <span>FAT</span>
          <strong>STACK</strong>
          <small>STACK IT. BANK IT. WIN IT.</small>
        </div>
        <div className="header-controls">
          <button className="chip-button" onClick={toggleMute} aria-label={muted ? "Unmute sound" : "Mute sound"}>
            {muted ? "🔇" : "🔊"}
          </button>
          <button className="chip-button" onClick={toggleFullscreen} aria-label="Toggle fullscreen">
            ⛶
          </button>
          <button className="leaderboard-link" onClick={() => goTo("board")}>
            TOP STACKS
          </button>
        </div>
      </header>

      {screen === "start" && (
        <section className="screen-overlay start-screen" aria-label="Start screen">
          <div className="start-center">
            <img className="stack-icon" src={gameAssets.superStack} alt="Fat Stack" />
            <h1>
              STACK IT HIGH.
              <br />
              <em>BANK</em> IT BIG.
            </h1>
            <p>Catch the good stuff. Grab the lid to bank your points. Don’t let it topple.</p>
            <button className="red-button big-button" onClick={() => goTo("select")}>
              {hasPlayed ? "PLAY AGAIN" : "PRESS TO PLAY"}
            </button>
            <div className="start-hint">
              <b>MOVE</b> joystick · arrows · drag <span>•</span> <b>START</b> red button · space
            </div>
            <div className="stat-row">
              <div className="stat-pill">
                <span>TODAY’S TOP STACK</span>
                <b>{fmt(topScore)}</b>
              </div>
              {best > 0 && (
                <div className="stat-pill red">
                  <span>YOUR BEST</span>
                  <b>{fmt(best)}</b>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {screen === "select" && (
        <section className="screen-overlay select-screen" aria-label="Choose your character">
          <h2>CHOOSE YOUR STACKER</h2>
          <div className="char-grid">
            {CHARACTERS.map((c) => (
              <button
                key={c.id}
                className={`char-card ${c.id === charId ? "picked" : ""}`}
                onClick={() => {
                  sfx.uiPress();
                  setCharId(c.id);
                }}
              >
                <img src={c.art} alt={c.name} />
                <b>{c.name}</b>
                <span>{c.tag}</span>
              </button>
            ))}
          </div>
          <button
            className="red-button big-button"
            onClick={() => (hasPlayed ? startGame(false) : goTo("how-to"))}
          >
            STACK AS {playerChar.name.toUpperCase()}
          </button>
        </section>
      )}

      {screen === "how-to" && (
        <section className="screen-overlay tutorial-screen" aria-label="How to play">
          <h2>HOW TO STACK</h2>
          <div className="tutorial-grid">
            <article>
              <span className="step-num">01</span>
              <div className="tutorial-items">
                <Ingredient kind="pastrami" />
                <Ingredient kind="tomato" />
                <Ingredient kind="lettuce" />
              </div>
              <h3>CATCH</h3>
              <p>EVERY CATCH FILLS YOUR POT</p>
            </article>
            <article>
              <span className="step-num">02</span>
              <div className="tutorial-items">
                <Ingredient kind="lid" />
              </div>
              <h3>BANK</h3>
              <p>THE LID CASHES YOUR POT IN. TALLER = BIGGER BONUS</p>
            </article>
            <article>
              <span className="step-num">03</span>
              <div className="tutorial-items">
                <img className="topple-demo" src={gameAssets.ingBase} alt="Tiger crunch base" />
              </div>
              <h3>DON’T TOPPLE</h3>
              <p>{TOWER.collapseAt} LAYERS = CRASH. POT LOST</p>
            </article>
            <article>
              <span className="step-num">04</span>
              <div className="tutorial-items">
                <div className="hazard-demo">
                  <Ingredient kind="sauce" />
                  <span className="hazard-mark">✕</span>
                </div>
              </div>
              <h3>AVOID</h3>
              <p>3 SAUCE SPILLS = GAME OVER</p>
            </article>
          </div>
          <button className="red-button big-button" onClick={() => startGame(false)}>
            PRESS TO START
          </button>
        </section>
      )}

      {screen === "playing" && (
        <section className="play-screen" aria-label="Live game">
          <aside className="left-rail">
            <div className="rail-card score-card">
              <span>BANKED</span>
              <b key={scorePulse} className="pulse-on-mount">
                {fmt(view.score)}
              </b>
            </div>
            <div className="rail-card fumble-card">
              <span>FUMBLES</span>
              <div className="fumble-dots">
                {Array.from({ length: ROUND.maxFumbles }, (_, dot) => (
                  <i className={dot < view.fumbles ? "used" : ""} key={dot}>
                    !
                  </i>
                ))}
              </div>
            </div>
            <div className="rail-card banks-card">
              <span>FAT STACKS</span>
              <b>{view.banks}</b>
            </div>
            <div key={`tuna-${tunaReact}`} className={`rail-character ${tunaReact > 0 ? "react-flinch" : ""}`}>
              <img src={gameAssets.captainTuna} alt="Captain Tuna" />
              <span>OFFICIAL SCOREKEEPER</span>
            </div>
          </aside>

          <div
            ref={laneRef}
            key={`lane-${shakeId}`}
            className={`game-lane ${shakeId > 0 ? "shake-on-mount" : ""}`}
            onPointerDown={onLanePointer}
            onPointerMove={onLanePointer}
            onPointerUp={onLanePointerEnd}
            onPointerLeave={onLanePointerEnd}
          >
            <div className={`big-clock ${urgent ? "urgent" : ""}`}>
              <b>{seconds.toString().padStart(2, "0")}</b>
              <i>{view.phaseLabel}</i>
            </div>

            <div className="catch-line" />

            {view.items.map((item) => {
              const spec = ITEMS[item.kind];
              const proximity = Math.max(0, Math.min(1, (item.y + 10) / (TOWER.trayY + 10)));
              return (
                <div key={item.id} className="item-holder">
                  <div
                    className="item-shadow"
                    style={{
                      left: `${item.x}%`,
                      opacity: 0.06 + proximity * 0.24,
                      transform: `translateX(-50%) scale(${0.4 + proximity * 0.7})`,
                    }}
                  />
                  <div
                    className={`falling-item ${spec.group}`}
                    style={{
                      left: `${item.x}%`,
                      top: `${item.y}%`,
                      transform: `translate(-50%, -50%) rotate(${item.tilt}deg) scale(${spec.size})`,
                    }}
                  >
                    <Ingredient kind={item.kind} />
                    {spec.group === "hazard" && <span className="hazard-mark">✕</span>}
                  </div>
                </div>
              );
            })}

            {debris.map((piece) => (
              <div
                key={piece.id}
                className="debris"
                style={{
                  left: `${view.playerX}%`,
                  ["--dx" as string]: `${piece.dx}%`,
                  ["--rot" as string]: `${piece.rot}deg`,
                }}
              >
                <img src={artFor(piece.kind)} alt="" />
              </div>
            ))}

            <div className={`stack-on-tray ${towerHeat}`} style={{ left: `${view.playerX}%` }}>
              {view.pot > 0 && (
                <div className={`pot-chip ${lidLive ? "lid-live" : ""}`}>
                  <span>POT</span>
                  <b>{fmt(view.pot)}</b>
                  {lidLive && <i>LID = {fmt(currentBankValue)}</i>}
                </div>
              )}
              <div className="tower">
                <img className="tower-base" src={gameAssets.ingBase} alt="" />
                {view.layers.map((kind, index) => (
                  <img
                    key={`${kind}-${index}`}
                    className="tower-layer"
                    src={artFor(kind)}
                    alt=""
                    style={{ transform: `rotate(${((index * 37) % 9) - 4}deg)`, zIndex: index + 2 }}
                  />
                ))}
              </div>
              <img className="player-sprite" src={playerChar.art} alt={playerChar.name} />
              {layerCount > 0 && (
                <div className={`height-chip ${towerHeat}`}>
                  {layerCount}/{TOWER.collapseAt}
                </div>
              )}
            </div>

            <div key={`msg-${view.messageId}`} className={`catch-message tone-${view.messageTone}`}>
              {view.message}
            </div>

            {floats.map((float) => (
              <div key={float.id} className={`float-text float-${float.tone}`} style={{ left: `${float.x}%`, top: `${float.y}%` }}>
                {float.text}
              </div>
            ))}

            {countdownDisplay !== null && (
              <div className="countdown-overlay">
                <b key={countdownDisplay}>{countdownDisplay}</b>
              </div>
            )}
            {countdownDisplay === null && slam && (
              <div key={slam.id} className={`slam slam-${slam.tone}`}>
                {slam.text}
              </div>
            )}

            {attract && (
              <div className="attract-overlay">
                <b>PRESS ANY BUTTON TO PLAY</b>
              </div>
            )}

            {paused && (
              <div className="pause-overlay">
                <h2>PAUSED</h2>
                <button className="red-button" onClick={() => setPaused(false)}>
                  RESUME
                </button>
                <button
                  className="white-button"
                  onClick={() => {
                    stopMusic();
                    setPaused(false);
                    setScreen("start");
                  }}
                >
                  QUIT ROUND
                </button>
              </div>
            )}
          </div>

          <aside className="right-rail">
            <div className="rail-card top-card">
              <span>TODAY’S TOP</span>
              <b>{fmt(topScore)}</b>
            </div>
            <div
              className={`next-ticket ${ITEMS[view.nextKind].group === "hazard" ? "danger" : ""} ${view.nextKind === "lid" ? "gold" : ""}`}
            >
              <strong>
                {ITEMS[view.nextKind].group === "hazard" ? "DODGE!" : view.nextKind === "lid" ? "BANK!" : "NEXT UP"}
              </strong>
              <div className="next-item">
                <Ingredient kind={view.nextKind} />
              </div>
              <span>{ITEMS[view.nextKind].label}</span>
            </div>
            <div className="rail-card combo-card">
              <span>COMBO</span>
              <b>x{view.multiplier}</b>
              <i style={{ height: `${Math.min(100, view.combo * 6)}%` }} />
            </div>
            <div key={`mami-${mamiReact}`} className={`rail-character ${mamiReact > 0 ? "react-cheer" : ""}`}>
              <img src={gameAssets.pastramiMami} alt="Pastrami Mami" />
              <span>ORDER UP!</span>
            </div>
          </aside>
        </section>
      )}

      {screen === "results" && lastRun && (
        <section className="screen-overlay results-screen" aria-label="Results screen">
          <div className="result-center">
            <h2>{resultHeadline(lastRun)}</h2>
            <div className="score-receipt">
              <span>YOUR SCORE</span>
              <b>{fmt(countedScore)}</b>
              <small>{resultCaption(lastRun)}</small>
              {resultStage !== "counting" && (
                <div className="receipt-lines">
                  <div>
                    <span>FAT STACKS BANKED</span>
                    <b>{lastRun.banks}</b>
                  </div>
                  <div>
                    <span>BIGGEST BANK</span>
                    <b>{fmt(lastRun.biggestBank)}</b>
                  </div>
                  <div>
                    <span>TOPPLES</span>
                    <b>{lastRun.collapses}</b>
                  </div>
                  <div>
                    <span>POT LEFT UNBANKED</span>
                    <b>{fmt(lastRun.potLost)}</b>
                  </div>
                  {lastRun.bonusSurvived > 0 && (
                    <div className="bonus-line">
                      <span>SURVIVED THE RUSH</span>
                      <b>+{fmt(lastRun.bonusSurvived)}</b>
                    </div>
                  )}
                  {lastRun.bonusClean > 0 && (
                    <div className="bonus-line">
                      <span>CLEAN COUNTER</span>
                      <b>+{fmt(lastRun.bonusClean)}</b>
                    </div>
                  )}
                  {best > 0 && lastRun.score < best && (
                    <div className="bonus-line delta-line">
                      <span>YOUR BEST</span>
                      <b>{fmt(best)}</b>
                    </div>
                  )}
                </div>
              )}
            </div>

            {resultStage === "initials" && (
              <div className="initials-entry">
                <strong>YOU MADE THE BOARD — SIGN IT</strong>
                <div className="initials-slots">
                  {initials.map((letter, slot) => (
                    <div
                      key={slot}
                      className={`initial-slot ${slot === initialSlot ? "active" : ""}`}
                      onClick={() => setInitialSlot(slot)}
                    >
                      <button
                        className="spin"
                        onClick={(e) => {
                          e.stopPropagation();
                          setInitialSlot(slot);
                          spinInitial(slot, 1);
                        }}
                      >
                        ▲
                      </button>
                      <b>{String.fromCharCode(65 + letter)}</b>
                      <button
                        className="spin"
                        onClick={(e) => {
                          e.stopPropagation();
                          setInitialSlot(slot);
                          spinInitial(slot, -1);
                        }}
                      >
                        ▼
                      </button>
                    </div>
                  ))}
                </div>
                <button className="red-button" onClick={confirmInitials}>
                  LOCK IT IN
                </button>
              </div>
            )}

            {resultStage === "done" && (
              <div className="merch-note">HIGH SCORE = MERCH · SHOW STAFF YOUR SCORE</div>
            )}
            {resultStage === "done" && (
              <div className="result-actions">
                {savedRank !== null && <div className="rank-badge">#{savedRank} TODAY</div>}
                <button className="red-button big-button" onClick={() => startGame(false)}>
                  PLAY AGAIN
                </button>
                <button className="white-button" onClick={() => goTo("board")}>
                  VIEW BOARD
                </button>
              </div>
            )}
          </div>
          {slam && (
            <div key={slam.id} className={`slam slam-${slam.tone}`}>
              {slam.text}
            </div>
          )}
        </section>
      )}

      {screen === "board" && (
        <section className="screen-overlay leaderboard-screen" aria-label="High score screen">
          <div className="board-center">
            <h2>TODAY’S TOP STACKS</h2>
            <div className="score-list">
              {scores.map((entry, index) => (
                <div className={index === 0 ? "first" : ""} key={`${entry.name}-${entry.score}-${index}`}>
                  <span>
                    {index + 1}. {entry.name}
                  </span>
                  <b>{fmt(entry.score)}</b>
                </div>
              ))}
            </div>
            <p>{boardCutoff > 0 ? `SCORE ${fmt(boardCutoff + 1)}+ TO JOIN THE BOARD` : "ANY SCORE JOINS THE BOARD"}</p>
            <div className="merch-note">CLAIM YOUR MERCH · SHOW STAFF YOUR SCORE</div>
            <button className="red-button big-button" onClick={() => goTo("select")}>
              PLAY
            </button>
          </div>
        </section>
      )}
    </main>
  );
}

function resultHeadline(run: RunSummary) {
  if (run.banks >= 4) return "FAT STACK LEGEND!";
  if (run.banks >= 2) return "THAT’S A FAT STACK!";
  if (run.banks === 1) return "FIRST BANK IN!";
  if (run.score >= 15000) return "SOLID STACKING!";
  if (run.score === 0) return "NOTHING ON THE BREAD.";
  return "DECENT SANDWICH.";
}

function resultCaption(run: RunSummary) {
  if (run.score === 0) return "YOU CAUGHT NOTHING. HAVE ANOTHER GO.";
  if (run.reason === "fumbles") return `${run.fumbles} SAUCE SPILLS. THE COUNTER WON THAT ONE.`;
  if (run.potLost > run.score / 2) return `${fmt(run.potLost)} POINTS NEVER REACHED THE BANK. GRAB THE LID!`;
  if (run.fumbles === 0 && run.collapses === 0) return "CLEAN ROUND. NOTHING SPILLED, NOTHING TOPPLED.";
  if (run.collapses > 0) return `${run.collapses} TOPPLE${run.collapses > 1 ? "S" : ""}. BANK BEFORE IT FALLS.`;
  if (run.fumbles > 0) return `${run.fumbles} FUMBLE${run.fumbles > 1 ? "S" : ""}. STILL TASTY.`;
  return "NO FUMBLES. NICE.";
}
