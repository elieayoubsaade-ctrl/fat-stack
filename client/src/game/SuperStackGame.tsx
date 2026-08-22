/**
 * Fatsandwich Fat Stack — event arcade game.
 *
 * This file is the screens, the input, and the animation loop. The rules live in
 * `round.ts`, the tuning numbers in `config.ts`, the sound in `audio.ts` — nothing about
 * balance is decided here.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { gameAssets } from "./assets";
import Scene from "./Scene";
import Player, { type PlayerMood } from "./Player";
import Hud from "./Hud";
import StartScreen from "./screens/StartScreen";
import SelectScreen from "./screens/SelectScreen";
import HowToScreen from "./screens/HowToScreen";
import ResultsScreen, { type ResultStage, type RunSummary } from "./screens/ResultsScreen";
import BoardScreen from "./screens/BoardScreen";
import {
  backendConfigured,
  fetchBothBoards,
  flushQueuedPlays,
  setInitials as pushInitials,
  submitPlay,
  type BoardEntry,
  type BoardScope,
} from "./api";
import { track } from "./analytics";
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
  direction: number;
  message: string;
  messageTone: string;
  messageId: number;
  nextKind: ItemKind;
};


type FloatText = { id: number; text: string; x: number; y: number; tone: "topping" | "protein" | "bank" | "bad" };
type Slam = { id: number; text: string; tone: "phase" | "go" | "warn" | "time" };
type Debris = { id: number; kind: ItemKind; dx: number; rot: number };

const BEST_KEY = "fatsandwich-super-stack-best";
const CHAR_KEY = "fatsandwich-super-stack-char";

/** The simulation always advances in steps of at most this long. */
const PHYSICS_STEP = 1 / 120;
/** After a stall longer than this the game stops trying to catch up. */
const MAX_FRAME = 0.25;
/** Seconds of inactivity on the start screen before the attract demo begins. */
const ATTRACT_AFTER = 20;

const fmt = (n: number) => n.toLocaleString("en-US");

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
    direction: round.direction,
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
  const [board, setBoard] = useState<BoardEntry[]>([]);
  const [allTimeBoard, setAllTimeBoard] = useState<BoardEntry[]>([]);
  const [boardScope, setBoardScope] = useState<BoardScope>("today");
  const [boardLive, setBoardLive] = useState(false);
  const [qualified, setQualified] = useState(false);
  const [claimToken, setClaimToken] = useState<string | null>(null);
  const [best, setBest] = useState<number>(loadBest);
  const [muted, setMutedState] = useState(isMuted());
  const [paused, setPaused] = useState(false);
  const [attract, setAttract] = useState(false);
  const [countdownDisplay, setCountdownDisplay] = useState<number | null>(null);
  const [slam, setSlam] = useState<Slam | null>(null);
  const [floats, setFloats] = useState<FloatText[]>([]);
  const [debris, setDebris] = useState<Debris[]>([]);
  const [shakeId, setShakeId] = useState(0);
  const [scorePulse, setScorePulse] = useState(0);
  const [hatchFlash, setHatchFlash] = useState(0);
  const [hatchDanger, setHatchDanger] = useState(0);
  const [mood, setMood] = useState<PlayerMood>("idle");
  const [moodKey, setMoodKey] = useState(0);
  const moodTimer = useRef(0);
  const [hasPlayed, setHasPlayed] = useState(false);
  const [charId, setCharId] = useState<string>(() => {
    try {
      return localStorage.getItem(CHAR_KEY) ?? CHARACTERS[0].id;
    } catch {
      return CHARACTERS[0].id;
    }
  });
  const playerChar = characterById(charId);
  const characterRef = useRef(charId);
  const qualifiedRef = useRef(false);
  useEffect(() => {
    characterRef.current = charId;
  }, [charId]);

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
  const resultStageRef = useRef<ResultStage>("done");
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
    resultStageRef.current = resultStage;
  }, [resultStage]);
  /** Pull the live board; push anything a dropped connection stranded earlier. */
  const refreshBoard = useCallback(async () => {
    // Both ranges are fetched together so the TODAY/ALL TIME tabs switch instantly.
    const { today, alltime } = await fetchBothBoards();
    setBoard(today.entries);
    setAllTimeBoard(alltime.entries);
    setBoardLive(today.live);
  }, []);

  useEffect(() => {
    void refreshBoard();
    void flushQueuedPlays().then((sent) => {
      if (sent > 0) void refreshBoard();
    });
    track("game_opened", { backend: backendConfigured });
  }, [refreshBoard]);
  useEffect(() => {
    localStorage.setItem(BEST_KEY, String(best));
  }, [best]);
  useEffect(() => {
    localStorage.setItem(CHAR_KEY, charId);
  }, [charId]);

  const boardCutoff = board.length >= 5 ? (board[board.length - 1]?.score ?? 0) : 0;
  const topScore = board[0]?.score ?? 0;

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

  /** Show a mood for a moment, then settle back to idle (or panic, if the tower is tall). */
  const setMoodFor = useCallback((next: PlayerMood, ms: number) => {
    window.clearTimeout(moodTimer.current);
    setMood(next);
    setMoodKey((n) => n + 1);
    moodTimer.current = window.setTimeout(() => setMood("idle"), ms);
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
            setMoodFor("catch", 180);
            vibrate(20);
            break;
          case "combo-up":
            sfx.comboUp(event.multiplier);
            break;
          case "bank":
            sfx.bank(event.layers);
            pushFloat(`+${fmt(event.amount)} BANKED!`, event.x, Math.min(70, event.y), "bank");
            setScorePulse((n) => n + 1);
            setMoodFor("cheer", 500);
            vibrate([40, 40, 40]);
            break;
          case "collapse": {
            sfx.collapse();
            setShakeId((n) => n + 1);
            setMoodFor("stunned", 600);
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
            setMoodFor("stunned", 400);
            pushFloat("FUMBLE!", event.x, event.y, "bad");
            vibrate(80);
            break;
          case "drop":
            sfx.drop();
            break;
          case "lid-spawned":
            sfx.lidIncoming();
            break;
          case "lid-incoming":
            sfx.lidHorn();
            setHatchFlash((n) => n + 1);
            break;
          case "hazard-incoming":
            sfx.hazardIncoming();
            setHatchDanger((n) => n + 1);
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
    [pushFloat, pushSlam, setMoodFor],
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
      biggestLayers: round.biggestBankLayers,
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
    setClaimToken(null);
    setQualified(false);
    qualifiedRef.current = false;
    setCountedScore(0);
    setResultStage("counting");
    setScreen("results");

    track("round_completed", {
      score: round.score,
      banks: round.banks,
      biggest_bank: round.biggestBank,
      fumbles: round.fumbles,
      collapses: round.collapses,
      caught: round.caught,
      pot_lost: round.potLostToCollapse + round.potLostToTime,
      ended_reason: round.ended,
      character_id: characterRef.current,
      duration: Math.round(round.elapsed),
    });

    // Send the round. Never blocks the screen — a failure just means no claim QR
    // this time, and the score is queued for the next moment we have signal.
    void submitPlay({
      score: round.score,
      banks: round.banks,
      biggestBank: round.biggestBank,
      bestCombo: round.bestCombo,
      fumbles: round.fumbles,
      collapses: round.collapses,
      caught: round.caught,
      potLost: round.potLostToCollapse + round.potLostToTime,
      characterId: characterRef.current,
      endedReason: round.ended,
      durationSeconds: round.elapsed,
    }).then((result) => {
      if (!result) return;
      setSavedRank(result.rank);
      setQualified(result.qualifies);
      qualifiedRef.current = result.qualifies;
      if (result.qualifies) {
        setClaimToken(result.claimToken);
        track("made_leaderboard", { rank: result.rank, score: round.score });
      }
      void refreshBoard();
    });
  }, [refreshBoard]);

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
    if (asAttract) {
      startMusic();
      track("attract_shown", {});
    } else {
      setHasPlayed(true);
      track("round_started", { character_id: characterRef.current });
    }
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
        // The results screen owns Enter while its own sequence is running; once it is
        // done, the one button starts the next round (an event box has no other key).
        if (current === "playing") return;
        if (current === "results") {
          if (resultStageRef.current !== "done") return;
          event.preventDefault();
          startGame(false);
          return;
        }
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

  /** Initials hit the shared board the moment they are confirmed. */
  const confirmInitials = useCallback(() => {
    if (!lastRun) return;
    sfx.fanfare();
    const name = initials.map((i) => String.fromCharCode(65 + i)).join("");
    if (claimToken) {
      void pushInitials(claimToken, name).then(() => void refreshBoard());
    }
    setResultStage("done");
  }, [initials, lastRun, claimToken, refreshBoard]);

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
      const isBest = lastRun.score > best;
      if (isBest) setBest(lastRun.score);
      if (topScore > 0 && lastRun.score > topScore) {
        sfx.fanfare();
        pushSlam("NEW #1 TODAY!", "go");
      } else if (isBest) {
        sfx.fanfare();
        pushSlam("NEW PERSONAL BEST!", "go");
      }
      setResultStage(qualifiedRef.current ? "initials" : "done");
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [screen, resultStage, lastRun, best, topScore, pushSlam]);

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
        // A joystick has no up/down, so left/right spin the letter...
        event.preventDefault();
        spinInitial(initialSlot, -1);
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        spinInitial(initialSlot, 1);
      } else if (event.key === "Enter" || event.key === " ") {
        // ...and the one button moves to the next slot; on the last one it locks in.
        event.preventDefault();
        if (initialSlot < 2) setInitialSlot(initialSlot + 1);
        else confirmInitials();
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
  const towerHeat: "calm" | "warm" | "hot" = layerCount >= TOWER.collapseAt - 2 ? "hot" : layerCount >= TOWER.wobbleAt ? "warm" : "calm";
  const lidLive = view.nextKind === "lid" || view.items.some((item) => item.kind === "lid");
  const currentBankValue = bankValue(view.pot, layerCount);

  return (
    <main className="super-stack-app">
      <Scene hatchFlash={hatchFlash} hatchDanger={hatchDanger} bank={scorePulse} />
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
        <StartScreen hasPlayed={hasPlayed} topScore={topScore} best={best} onStart={() => goTo("select")} />
      )}

      {screen === "select" && (
        <SelectScreen
          characters={CHARACTERS}
          selectedId={charId}
          onSelect={(id) => {
            sfx.uiPress();
            setCharId(id);
            track("character_selected", { character_id: id });
          }}
          onPick={() => (hasPlayed ? startGame(false) : goTo("how-to"))}
        />
      )}

      {screen === "how-to" && <HowToScreen onStart={() => startGame(false)} />}

      {screen === "playing" && (
        <section className="play-screen" aria-label="Live game">
          <div
            ref={laneRef}
            key={`lane-${shakeId}`}
            className={`game-lane ${shakeId > 0 ? "shake-on-mount" : ""}`}
            onPointerDown={onLanePointer}
            onPointerMove={onLanePointer}
            onPointerUp={onLanePointerEnd}
            onPointerLeave={onLanePointerEnd}
          >

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

            <Player
              character={playerChar}
              x={view.playerX}
              direction={view.direction}
              layers={view.layers}
              pot={view.pot}
              lidLive={lidLive}
              bankValue={currentBankValue}
              heat={towerHeat}
              mood={mood === "idle" && towerHeat === "hot" ? "panic" : mood}
              moodKey={moodKey}
              debris={debris}
            />

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

          <Hud
            score={view.score}
            banks={view.banks}
            fumbles={view.fumbles}
            seconds={seconds}
            phaseLabel={view.phaseLabel}
            urgent={urgent}
            combo={view.combo}
            multiplier={view.multiplier}
            topScore={topScore}
            scorePulse={scorePulse}
          />
        </section>
      )}

      {screen === "results" && lastRun && (
        <ResultsScreen
          run={lastRun}
          stage={resultStage}
          countedScore={countedScore}
          best={best}
          initials={initials}
          initialSlot={initialSlot}
          savedRank={savedRank}
          onSlot={setInitialSlot}
          onSpin={spinInitial}
          onConfirmInitials={confirmInitials}
          claimToken={claimToken}
          onPlayAgain={() => startGame(false)}
          onBoard={() => goTo("board")}
          slam={
            slam && (
              <div key={slam.id} className={`slam slam-${slam.tone}`}>
                {slam.text}
              </div>
            )
          }
        />
      )}

      {screen === "board" && (
        <BoardScreen
          scope={boardScope}
          onScope={(next) => {
            sfx.uiPress();
            setBoardScope(next);
          }}
          entries={boardScope === "today" ? board : allTimeBoard}
          cutoff={
            boardScope === "today"
              ? boardCutoff
              : allTimeBoard.length >= 5
                ? (allTimeBoard[allTimeBoard.length - 1]?.score ?? 0)
                : 0
          }
          offline={backendConfigured && !boardLive}
          onPlay={() => goTo("select")}
        />
      )}
    </main>
  );
}
