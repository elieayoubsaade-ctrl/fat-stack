/**
 * Fatsandwich Super Stack — event arcade game.
 *
 * This file is the screens, the input and the animation loop.
 * The rules of the round live in `round.ts`. The tuning numbers live in `config.ts`.
 * The sounds live in `audio.ts`. Nothing about balance is decided here.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { gameAssets } from "@/game/assets";
import Ingredient from "@/game/Ingredient";
import { primeAudio, sfx } from "@/game/audio";
import { ITEMS, LEADERBOARD_SIZE, ROUND, comboMultiplier, type ItemKind } from "@/game/config";
import {
  autoDirection,
  createRound,
  stepRound,
  type EndReason,
  type FallingItem,
  type MessageTone,
  type Round,
  type SoundEvent,
} from "@/game/round";

type Screen = "start" | "how-to" | "playing" | "results" | "leaderboard";

/** The read-only slice of the round that the screen draws. */
type View = {
  items: FallingItem[];
  playerX: number;
  score: number;
  combo: number;
  multiplier: number;
  fumbles: number;
  layers: ItemKind[];
  superStacks: number;
  timeLeft: number;
  phaseLabel: string;
  message: string;
  messageTone: MessageTone;
  messageId: number;
  nextKind: ItemKind;
  lidIncoming: boolean;
};

type RunSummary = {
  score: number;
  fumbles: number;
  superStacks: number;
  bestCombo: number;
  caught: number;
  dropped: number;
  bonusClean: number;
  bonusSurvived: number;
  reason: EndReason;
};

type ScoreEntry = { name: string; score: number };

/**
 * Seed board. These are set from the measured score range in `pnpm balance`, so the
 * board is aspirational without being impossible on the first play of the day.
 */
const DEFAULT_SCORES: ScoreEntry[] = [
  { name: "AYA", score: 86400 },
  { name: "MO", score: 79250 },
  { name: "SAM", score: 71800 },
  { name: "LEO", score: 64300 },
  { name: "NOOR", score: 57900 },
];

const SCORES_KEY = "fatsandwich-super-stack-scores";

/** The simulation always advances in steps of at most this long. */
const PHYSICS_STEP_SECONDS = 1 / 120;
/** After a stall longer than this the game gives up catching up, rather than freezing. */
const MAX_FRAME_SECONDS = 0.25;

function toView(round: Round): View {
  return {
    items: round.items,
    playerX: round.playerX,
    score: round.score,
    combo: round.combo,
    multiplier: comboMultiplier(round.combo),
    fumbles: round.fumbles,
    layers: round.layers,
    superStacks: round.superStacks,
    timeLeft: round.timeLeft,
    phaseLabel: round.phaseLabel,
    message: round.message,
    messageTone: round.messageTone,
    messageId: round.messageId,
    nextKind: round.nextKind,
    lidIncoming: round.nextKind === "lid",
  };
}

function playSounds(events: SoundEvent[]) {
  for (const event of events) {
    switch (event.type) {
      case "catch-protein": sfx.catchProtein(event.combo); break;
      case "catch-topping": sfx.catchTopping(event.combo); break;
      case "combo-up": sfx.comboUp(event.multiplier); break;
      case "super-stack": sfx.superStack(); break;
      case "fumble": sfx.fumble(); break;
      case "drop": sfx.drop(); break;
      case "tick": sfx.tick(event.urgent); break;
    }
  }
  events.length = 0;
}

function StatBurst({ label, value, red = false }: { label: string; value: string | number; red?: boolean }) {
  return (
    <div className={`stat-burst ${red ? "stat-burst-red" : ""}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

export default function SuperStackGame() {
  const [screen, setScreen] = useState<Screen>("start");
  const [view, setView] = useState<View>(() => toView(createRound()));
  const [lastRun, setLastRun] = useState<RunSummary | null>(null);
  const [scores, setScores] = useState<ScoreEntry[]>(() => {
    try {
      const saved = localStorage.getItem(SCORES_KEY);
      const parsed = saved ? (JSON.parse(saved) as ScoreEntry[]) : DEFAULT_SCORES;
      return Array.isArray(parsed) && parsed.length ? parsed : DEFAULT_SCORES;
    } catch {
      return DEFAULT_SCORES;
    }
  });

  const roundRef = useRef<Round | null>(null);
  const keysRef = useRef({ left: false, right: false });
  const screenRef = useRef(screen);
  const demoMode = useMemo(() => new URLSearchParams(window.location.search).has("demo"), []);

  useEffect(() => {
    screenRef.current = screen;
  }, [screen]);

  useEffect(() => {
    localStorage.setItem(SCORES_KEY, JSON.stringify(scores));
  }, [scores]);

  /** Lowest score that still makes the board — the on-screen copy quotes this, never a guess. */
  const boardCutoff = scores.length >= LEADERBOARD_SIZE ? (scores[scores.length - 1]?.score ?? 0) : 0;

  const finishRound = useCallback((round: Round) => {
    sfx.roundOver();
    setLastRun({
      score: round.score,
      fumbles: round.fumbles,
      superStacks: round.superStacks,
      bestCombo: round.bestCombo,
      caught: round.caught,
      dropped: round.dropped,
      bonusClean: round.bonusClean,
      bonusSurvived: round.bonusSurvived,
      reason: round.ended,
    });
    setScores((current) => {
      const cutoff = current.length >= LEADERBOARD_SIZE ? (current[current.length - 1]?.score ?? 0) : 0;
      if (round.score <= cutoff) return current;
      return [...current, { name: "YOU", score: round.score }]
        .sort((a, b) => b.score - a.score)
        .slice(0, LEADERBOARD_SIZE);
    });
    setScreen("results");
  }, []);

  const finishRef = useRef(finishRound);
  useEffect(() => {
    finishRef.current = finishRound;
  }, [finishRound]);

  const startGame = useCallback(() => {
    primeAudio();
    keysRef.current.left = false;
    keysRef.current.right = false;
    const round = createRound();
    roundRef.current = round;
    setView(toView(round));
    setScreen("playing");
  }, []);

  const goTo = useCallback((next: Screen) => {
    primeAudio();
    sfx.uiPress();
    setScreen(next);
  }, []);

  /**
   * The animation loop.
   *
   * Its only dependencies are `screen` and `demoMode`, both constant for the whole round.
   * Nothing that changes during play can restart it — which is what keeps the countdown honest.
   */
  useEffect(() => {
    if (screen !== "playing") return;
    const round = roundRef.current;
    if (!round) return;

    let raf = 0;
    let previous = performance.now();

    const tick = (now: number) => {
      // A slow frame is split into small fixed steps rather than one big jump. That keeps
      // the round running at real-world speed on a stuttering machine, while never letting
      // an item skip straight past the tray between two frames.
      const elapsed = Math.min(MAX_FRAME_SECONDS, Math.max(0, (now - previous) / 1000));
      previous = now;

      round.direction = demoMode
        ? autoDirection(round)
        : (keysRef.current.right ? 1 : 0) - (keysRef.current.left ? 1 : 0);

      let remaining = elapsed;
      while (remaining > 0 && !round.ended) {
        const slice = Math.min(PHYSICS_STEP_SECONDS, remaining);
        stepRound(round, slice);
        remaining -= slice;
      }
      playSounds(round.events);
      setView(toView(round));

      if (round.ended) {
        finishRef.current(round);
        return;
      }
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [screen, demoMode]);

  /** Keyboard and arcade-joystick input. Held keys slide; they no longer teleport. */
  useEffect(() => {
    const isLeft = (key: string) => key === "ArrowLeft" || key.toLowerCase() === "a";
    const isRight = (key: string) => key === "ArrowRight" || key.toLowerCase() === "d";

    const onKeyDown = (event: KeyboardEvent) => {
      if (isLeft(event.key)) {
        event.preventDefault();
        keysRef.current.left = true;
        return;
      }
      if (isRight(event.key)) {
        event.preventDefault();
        keysRef.current.right = true;
        return;
      }
      if (event.repeat) return;
      if (event.key === " " || event.key === "Enter") {
        event.preventDefault();
        const current = screenRef.current;
        if (current === "start") goTo("how-to");
        else if (current !== "playing") startGame();
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

  useEffect(() => {
    if (!demoMode || screen !== "start") return;
    const timeout = window.setTimeout(startGame, 500);
    return () => window.clearTimeout(timeout);
  }, [demoMode, screen, startGame]);

  const topScore = scores[0]?.score ?? 0;
  const seconds = Math.ceil(view.timeLeft);
  const urgent = seconds <= 10;

  return (
    <main className="super-stack-app">
      <div className="paper-wash" />
      <header className="game-topline" aria-label="Fatsandwich game header">
        <img className="brand-logo" src={gameAssets.logo} alt="Fat Sandwich" />
        <div className="super-title">
          <span>SUPER</span>
          <strong>STACK</strong>
          <small>STACK IT. WIN IT.</small>
        </div>
        <button className="leaderboard-link" onClick={() => goTo("leaderboard")}>
          TODAY’S TOP STACKS
        </button>
      </header>

      {screen === "start" && (
        <section className="screen-overlay start-screen" aria-label="Start screen">
          <div className="host host-mami">
            <img src={gameAssets.pastramiMami} alt="Pastrami Mami" />
          </div>
          <div className="host host-tuna">
            <img src={gameAssets.captainTuna} alt="Captain Tuna" />
          </div>
          <div className="start-center">
            <img className="stack-icon" src={gameAssets.superStack} alt="Super Stack" />
            <h1>
              BUILD THE BIGGEST
              <br />
              <em>FAT</em> STACK.
            </h1>
            <p>Catch the good stuff. Avoid the fumbles. Own the board.</p>
            <button className="red-button big-button" onClick={() => goTo("how-to")}>
              PRESS RED BUTTON TO PLAY
            </button>
            <div className="start-hint">
              <b>JOYSTICK</b> = MOVE <span>•</span> <b>RED BUTTON</b> = START
            </div>
          </div>
          <StatBurst label="TODAY’S TOP STACK" value={topScore.toLocaleString()} />
        </section>
      )}

      {screen === "how-to" && (
        <section className="screen-overlay tutorial-screen" aria-label="How to play">
          <h2>HOW TO STACK</h2>
          <div className="tutorial-grid">
            <article>
              <span className="step-num">01</span>
              <div className="joystick-doodle" />
              <h3>MOVE</h3>
              <p>SLIDE LEFT + RIGHT</p>
            </article>
            <article>
              <span className="step-num">02</span>
              <div className="tutorial-items">
                <Ingredient kind="pastrami" />
                <Ingredient kind="tomato" />
                <Ingredient kind="lettuce" />
              </div>
              <h3>CATCH</h3>
              <p>MEAT 250 • TOPPINGS 100</p>
            </article>
            <article>
              <span className="step-num">03</span>
              <div className="tutorial-items">
                <Ingredient kind="lid" />
              </div>
              <h3>FINISH</h3>
              <p>THE LID = SUPER STACK</p>
            </article>
            <article>
              <span className="step-num">04</span>
              <div className="tutorial-items">
                <Ingredient kind="sauce" />
                <Ingredient kind="jar" />
                <Ingredient kind="wilted" />
              </div>
              <h3>AVOID</h3>
              <p>3 FUMBLES = GAME OVER</p>
            </article>
          </div>
          <button className="red-button big-button" onClick={startGame}>
            PRESS RED BUTTON TO START
          </button>
        </section>
      )}

      {screen === "playing" && (
        <section className="play-screen" aria-label="Live game">
          <aside className="left-rail">
            <StatBurst label="SCORE" value={view.score.toString().padStart(5, "0")} />
            <div className="scorekeeper">
              <img src={gameAssets.captainTuna} alt="Captain Tuna scorekeeper" />
              <span>
                OFFICIAL
                <br />
                SCOREKEEPER
              </span>
            </div>
            <div className="super-stack-count">
              <span>SUPER STACKS</span>
              <b>{view.superStacks}</b>
            </div>
            <div className="fumble-card">
              <strong>FUMBLES</strong>
              <div className="fumble-dots">
                {Array.from({ length: ROUND.maxFumbles }, (_, dot) => (
                  <i className={dot < view.fumbles ? "used" : ""} key={dot}>
                    !
                  </i>
                ))}
              </div>
              <small>SAUCE • JAR • WILT</small>
            </div>
          </aside>

          <div
            className="game-lane"
            style={{
              backgroundImage: `linear-gradient(90deg, rgba(123,94,167,.9) 0 5%, rgba(255,249,232,.35) 5% 95%, rgba(123,94,167,.9) 95%), url(${gameAssets.deliPaper})`,
            }}
          >
            <div className={`lane-top ${urgent ? "urgent" : ""}`}>
              <span>TIME</span>
              <b>{seconds.toString().padStart(2, "0")}</b>
              <i className="phase-flag">{view.phaseLabel}</i>
            </div>

            {view.items.map((item) => (
              <div
                key={item.id}
                className={`falling-item ${ITEMS[item.kind].group} kind-${item.kind}`}
                style={{
                  left: `${item.x}%`,
                  top: `${item.y}%`,
                  transform: `translate(-50%, -50%) rotate(${item.tilt}deg) scale(${ITEMS[item.kind].size})`,
                }}
              >
                <Ingredient kind={item.kind} />
              </div>
            ))}

            <div className="stack-on-tray" style={{ left: `${view.playerX}%` }}>
              <div className="stack-layers">
                {view.layers.map((kind, index) => (
                  <span key={`${kind}-${index}`} className={`stack-layer ${kind}`} />
                ))}
              </div>
              <div className="bread-base" />
              <img src={gameAssets.player} alt="The Fat Sandwich player" />
            </div>

            <div key={view.messageId} className={`catch-message tone-${view.messageTone}`}>
              {view.message}
            </div>
          </div>

          <aside className="right-rail">
            <StatBurst label="TODAY’S TOP STACK" value={topScore.toLocaleString()} red />
            <div className={`next-ticket ${view.lidIncoming ? "lid-incoming" : ""}`}>
              <img src={gameAssets.pastramiMami} alt="Pastrami Mami" />
              <strong>NEXT UP</strong>
              <div className="next-item">
                <Ingredient kind={view.nextKind} />
              </div>
              <span>{ITEMS[view.nextKind].label}</span>
            </div>
            <div className="combo-card">
              <span>COMBO</span>
              <b>x{view.multiplier}</b>
              <i style={{ height: `${Math.min(100, view.combo * 10)}%` }} />
            </div>
          </aside>

          <div className="mobile-controls">
            <button
              onPointerDown={() => {
                keysRef.current.left = true;
              }}
              onPointerUp={() => {
                keysRef.current.left = false;
              }}
              onPointerLeave={() => {
                keysRef.current.left = false;
              }}
              aria-label="Move left"
            >
              ←
            </button>
            <span>MOVE</span>
            <button
              onPointerDown={() => {
                keysRef.current.right = true;
              }}
              onPointerUp={() => {
                keysRef.current.right = false;
              }}
              onPointerLeave={() => {
                keysRef.current.right = false;
              }}
              aria-label="Move right"
            >
              →
            </button>
          </div>
        </section>
      )}

      {screen === "results" && lastRun && (
        <section className="screen-overlay results-screen" aria-label="Results screen">
          <img className="results-mami" src={gameAssets.pastramiMami} alt="Pastrami Mami" />
          <div className="result-center">
            <h2>{resultHeadline(lastRun)}</h2>
            <img src={gameAssets.superStack} alt="Completed Super Stack" />
            <div className="score-receipt">
              <span>YOUR SCORE</span>
              <b>{lastRun.score.toLocaleString()}</b>
              <small>{resultCaption(lastRun)}</small>
              <div className="receipt-lines">
                <div>
                  <span>SUPER STACKS</span>
                  <b>{lastRun.superStacks}</b>
                </div>
                <div>
                  <span>BEST COMBO</span>
                  <b>x{comboMultiplier(lastRun.bestCombo)}</b>
                </div>
                <div>
                  <span>CAUGHT</span>
                  <b>{lastRun.caught}</b>
                </div>
                <div>
                  <span>DROPPED</span>
                  <b>{lastRun.dropped}</b>
                </div>
                {lastRun.bonusSurvived > 0 && (
                  <div className="bonus-line">
                    <span>SURVIVED THE RUSH</span>
                    <b>+{lastRun.bonusSurvived.toLocaleString()}</b>
                  </div>
                )}
                {lastRun.bonusClean > 0 && (
                  <div className="bonus-line">
                    <span>CLEAN COUNTER</span>
                    <b>+{lastRun.bonusClean.toLocaleString()}</b>
                  </div>
                )}
              </div>
            </div>
            <div className="result-actions">
              <button className="red-button" onClick={startGame}>
                PLAY AGAIN
              </button>
              <button className="white-button" onClick={() => goTo("leaderboard")}>
                VIEW BOARD
              </button>
            </div>
          </div>
          <div className="merch-burst">
            HIGH SCORE
            <br />= MERCH
          </div>
        </section>
      )}

      {screen === "leaderboard" && (
        <section className="screen-overlay leaderboard-screen" aria-label="High score screen">
          <img className="board-bird" src={gameAssets.captainTuna} alt="Captain Tuna" />
          <div className="board-center">
            <h2>TODAY’S TOP STACKS</h2>
            <div className="score-list">
              {scores.map((entry, index) => (
                <div className={index === 0 ? "first" : ""} key={`${entry.name}-${entry.score}-${index}`}>
                  <span>
                    {index + 1}. {entry.name}
                  </span>
                  <b>{entry.score.toLocaleString()}</b>
                </div>
              ))}
            </div>
            <p>
              {boardCutoff > 0
                ? `SCORE ${(boardCutoff + 1).toLocaleString()}+ TO JOIN THE BOARD`
                : "ANY SCORE JOINS THE BOARD"}
            </p>
            <button className="red-button" onClick={startGame}>
              PLAY AGAIN
            </button>
          </div>
          <div className="claim-card">
            <img src={gameAssets.superStack} alt="Prize icon" />
            <b>
              CLAIM YOUR
              <br />
              MERCH
            </b>
            <span>SHOW STAFF YOUR SCORE</span>
          </div>
        </section>
      )}
    </main>
  );
}

function resultHeadline(run: RunSummary) {
  if (run.superStacks >= 2) return "SUPER STACK LEGEND!";
  if (run.superStacks === 1) return "THAT’S A FAT STACK!";
  if (run.score >= 4000) return "SOLID STACKING!";
  if (run.score === 0) return "NOTHING ON THE BREAD.";
  return "DECENT SANDWICH.";
}

function resultCaption(run: RunSummary) {
  if (run.score === 0) return "YOU CAUGHT NOTHING. HAVE ANOTHER GO.";
  if (run.reason === "fumbles") return `${run.fumbles} FUMBLES. THE COUNTER WON THAT ONE.`;
  if (run.fumbles === 0 && run.dropped === 0) return "CLEAN ROUND. NOTHING DROPPED.";
  if (run.fumbles === 0) return "NO FUMBLES. NICE.";
  return `${run.fumbles} FUMBLE${run.fumbles > 1 ? "S" : ""}. STILL TASTY.`;
}
