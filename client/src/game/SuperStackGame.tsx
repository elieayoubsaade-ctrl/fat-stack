/**
 * Comic Counter Carnival UI: a one-screen, event-TV-first arcade game.
 * The game is deliberately DOM-rendered so score cards and event copy stay large and readable.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { gameAssets } from "@/game/assets";

type Screen = "start" | "how-to" | "playing" | "results" | "leaderboard";
type ItemKind = "turkey" | "pastrami" | "roast" | "bacon" | "lettuce" | "tomato" | "onion" | "pickle" | "pepper" | "hazard";

type FallingItem = {
  id: number;
  kind: ItemKind;
  x: number;
  y: number;
  speed: number;
};

type ScoreEntry = { name: string; score: number };

const GOOD_ITEMS: ItemKind[] = ["turkey", "pastrami", "roast", "bacon", "lettuce", "tomato", "onion", "pickle", "pepper"];
const STACK_LABELS: Record<ItemKind, string> = {
  turkey: "Turkey",
  pastrami: "Pastrami",
  roast: "Roast beef",
  bacon: "Bacon bits",
  lettuce: "Lettuce",
  tomato: "Tomato",
  onion: "Red onion",
  pickle: "Pickles",
  pepper: "Pepperoncini",
  hazard: "Fumble",
};

const DEFAULT_SCORES: ScoreEntry[] = [
  { name: "AYA", score: 8620 },
  { name: "MO", score: 7540 },
  { name: "SAM", score: 6850 },
  { name: "LEO", score: 6610 },
  { name: "NOOR", score: 6320 },
];

function randomItem(id: number): FallingItem {
  const hazard = Math.random() < 0.12;
  const kind = hazard ? "hazard" : GOOD_ITEMS[Math.floor(Math.random() * GOOD_ITEMS.length)];
  return {
    id,
    kind,
    x: 10 + Math.random() * 80,
    y: -12,
    speed: 16 + Math.random() * 8,
  };
}

function itemSprite(kind: ItemKind) {
  if (kind === "turkey") return <img src={gameAssets.turkey} alt="Turkey" />;
  if (kind === "pastrami") return <img src={gameAssets.pastrami} alt="Pastrami" />;
  if (kind === "roast") return <img src={gameAssets.roastBeef} alt="Roast beef" />;
  const glyphs: Record<Exclude<ItemKind, "turkey" | "pastrami" | "roast">, string> = {
    bacon: "✦",
    lettuce: "≈",
    tomato: "●",
    onion: "◉",
    pickle: "≋",
    pepper: "✺",
    hazard: "!",
  };
  return <span className={`ingredient-glyph ${kind}`}>{glyphs[kind]}</span>;
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
  const [playerX, setPlayerX] = useState(50);
  const [items, setItems] = useState<FallingItem[]>([]);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(60);
  const [fumbles, setFumbles] = useState(0);
  const [combo, setCombo] = useState(0);
  const [stack, setStack] = useState<ItemKind[]>([]);
  const [message, setMessage] = useState("CATCH IT!");
  const [scores, setScores] = useState<ScoreEntry[]>(() => {
    try {
      const saved = localStorage.getItem("fatsandwich-super-stack-scores");
      return saved ? JSON.parse(saved) : DEFAULT_SCORES;
    } catch {
      return DEFAULT_SCORES;
    }
  });
  const itemId = useRef(0);
  const itemsRef = useRef<FallingItem[]>([]);
  const playerRef = useRef(50);
  const scoreRef = useRef(0);
  const stackRef = useRef<ItemKind[]>([]);
  const fumbleRef = useRef(0);
  const lastSpawn = useRef(0);
  const demoMode = useMemo(() => new URLSearchParams(window.location.search).has("demo"), []);

  useEffect(() => {
    playerRef.current = playerX;
  }, [playerX]);
  useEffect(() => {
    itemsRef.current = items;
  }, [items]);
  useEffect(() => {
    scoreRef.current = score;
  }, [score]);
  useEffect(() => {
    stackRef.current = stack;
  }, [stack]);
  useEffect(() => {
    fumbleRef.current = fumbles;
  }, [fumbles]);
  useEffect(() => {
    localStorage.setItem("fatsandwich-super-stack-scores", JSON.stringify(scores));
  }, [scores]);

  const finishGame = useCallback(() => {
    setScreen("results");
    const finishedScore = scoreRef.current;
    if (finishedScore >= 300) {
      setScores((current) => {
        const next = [...current, { name: "YOU", score: finishedScore }].sort((a, b) => b.score - a.score).slice(0, 5);
        return next;
      });
    }
  }, []);

  const resetGame = useCallback(() => {
    setItems([]);
    setScore(0);
    setTimeLeft(60);
    setFumbles(0);
    setCombo(0);
    setStack([]);
    setPlayerX(50);
    setMessage("CATCH IT!");
    lastSpawn.current = 0;
  }, []);

  const startGame = useCallback(() => {
    resetGame();
    if (demoMode) {
      itemId.current += 1;
      setItems([{ id: itemId.current, kind: "pastrami", x: 50, y: 58, speed: 24 }]);
    }
    setScreen("playing");
  }, [demoMode, resetGame]);

  const catchItem = useCallback((item: FallingItem) => {
    if (item.kind === "hazard") {
      const nextFumbles = fumbleRef.current + 1;
      setFumbles(nextFumbles);
      setCombo(0);
      setMessage("FAT FUMBLE!");
      if (nextFumbles >= 3) window.setTimeout(finishGame, 180);
      return;
    }
    const nextCombo = combo + 1;
    const multiplier = nextCombo >= 10 ? 4 : nextCombo >= 6 ? 3 : nextCombo >= 3 ? 2 : 1;
    setCombo(nextCombo);
    setScore((current) => current + 100 * multiplier);
    setStack((current) => [...current, item.kind].slice(-12));
    setMessage(multiplier > 1 ? `COMBO x${multiplier}!` : "NICE CATCH!");
  }, [combo, finishGame]);

  useEffect(() => {
    if (screen !== "playing") return;
    const startedAt = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const elapsed = (now - startedAt) / 1000;
      const remaining = Math.max(0, 60 - elapsed);
      setTimeLeft(Math.ceil(remaining));
      if (remaining <= 0) {
        finishGame();
        return;
      }
      if (demoMode) {
        const safeTarget = itemsRef.current.find((item) => item.kind !== "hazard");
        const targetX = safeTarget?.x ?? 50 + Math.sin(elapsed * 2.4) * 31;
        setPlayerX(Math.max(8, Math.min(92, targetX)));
      }
      if (now - lastSpawn.current > Math.max(420, 780 - elapsed * 6)) {
        lastSpawn.current = now;
        itemId.current += 1;
        setItems((current) => [...current, randomItem(itemId.current)]);
      }
      setItems((current) => {
        const caught: FallingItem[] = [];
        const active = current.flatMap((item) => {
          const updated = { ...item, y: item.y + item.speed * 0.04 };
          if (updated.y >= 76 && updated.y <= 87 && Math.abs(updated.x - playerRef.current) < 13) {
            caught.push(updated);
            return [];
          }
          return updated.y > 104 ? [] : [updated];
        });
        if (caught.length) window.setTimeout(() => caught.forEach(catchItem), 0);
        return active;
      });
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [screen, catchItem, demoMode, finishGame]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "ArrowLeft" || event.key.toLowerCase() === "a") {
        event.preventDefault();
        if (screen === "playing") setPlayerX((value) => Math.max(7, value - 7));
      }
      if (event.key === "ArrowRight" || event.key.toLowerCase() === "d") {
        event.preventDefault();
        if (screen === "playing") setPlayerX((value) => Math.min(93, value + 7));
      }
      if (event.key === " " || event.key === "Enter") {
        event.preventDefault();
        if (screen === "start") setScreen("how-to");
        else if (screen === "how-to" || screen === "results" || screen === "leaderboard") startGame();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [screen, startGame]);

  useEffect(() => {
    if (!demoMode || screen !== "start") return;
    const timeout = window.setTimeout(startGame, 500);
    return () => window.clearTimeout(timeout);
  }, [demoMode, screen, startGame]);

  const topScore = scores[0]?.score ?? 0;
  const nextUp = GOOD_ITEMS[(stack.length + 1) % GOOD_ITEMS.length];

  return (
    <main className="super-stack-app" style={{ backgroundImage: `url(${gameAssets.deliCounterWorld})` }}>
      <div className="paper-wash" />
      <header className="game-topline" aria-label="Fatsandwich game header">
        <img className="brand-logo" src={gameAssets.logo} alt="Fat Sandwich" />
        <div className="super-title"><span>SUPER</span><strong>STACK</strong><small>STACK IT. WIN IT.</small></div>
        <button className="leaderboard-link" onClick={() => setScreen("leaderboard")}>TODAY’S TOP STACKS</button>
      </header>

      {screen === "start" && (
        <section className="screen-overlay start-screen" aria-label="Start screen">
          <div className="host host-mami"><img src={gameAssets.pastramiMami} alt="Pastrami Mami" /></div>
          <div className="host host-tuna"><img src={gameAssets.captainTuna} alt="Captain Tuna" /></div>
          <div className="start-center">
            <img className="stack-icon" src={gameAssets.superStack} alt="Super Stack" />
            <h1>BUILD THE BIGGEST<br /><em>FAT</em> STACK.</h1>
            <p>Catch the good stuff. Avoid the fumbles. Own the board.</p>
            <button className="red-button big-button" onClick={() => setScreen("how-to")}>PRESS RED BUTTON TO PLAY</button>
            <div className="start-hint"><b>JOYSTICK</b> = MOVE <span>•</span> <b>RED BUTTON</b> = START</div>
          </div>
          <StatBurst label="TODAY’S TOP STACK" value={topScore.toLocaleString()} />
        </section>
      )}

      {screen === "how-to" && (
        <section className="screen-overlay tutorial-screen" aria-label="How to play">
          <h2>HOW TO STACK</h2>
          <div className="tutorial-grid">
            <article><span className="step-num">01</span><div className="joystick-doodle" /><h3>MOVE</h3><p>SLIDE LEFT + RIGHT</p></article>
            <article><span className="step-num">02</span><img src={gameAssets.superStack} alt="Stack ingredients" /><h3>CATCH</h3><p>BUILD THE SUPER STACK</p></article>
            <article><span className="step-num">03</span><div className="fumble-stack"><b>✕</b><i>! </i><i>! </i><i>! </i></div><h3>AVOID</h3><p>3 FUMBLES = GAME OVER</p></article>
          </div>
          <button className="red-button big-button" onClick={startGame}>PRESS RED BUTTON TO START</button>
        </section>
      )}

      {screen === "playing" && (
        <section className="play-screen" aria-label="Live game">
          <aside className="left-rail">
            <StatBurst label="SCORE" value={score.toString().padStart(5, "0")} />
            <div className="scorekeeper"><img src={gameAssets.captainTuna} alt="Captain Tuna scorekeeper" /><span>OFFICIAL<br />SCOREKEEPER</span></div>
            <div className="fumble-card"><strong>FUMBLES</strong><div className="fumble-dots">{[0, 1, 2].map((dot) => <i className={dot < fumbles ? "used" : ""} key={dot}>!</i>)}</div><small>WILT • SAUCE • JAR</small></div>
          </aside>

          <div className="game-lane" style={{ backgroundImage: `linear-gradient(90deg, rgba(123,94,167,.9) 0 5%, rgba(255,249,232,.35) 5% 95%, rgba(123,94,167,.9) 95%), url(${gameAssets.deliPaper})` }}>
            <div className="lane-top"><span>TIME</span><b>{timeLeft.toString().padStart(2, "0")}</b></div>
            {items.map((item) => <div key={item.id} className={`falling-item ${item.kind}`} style={{ left: `${item.x}%`, top: `${item.y}%` }}>{itemSprite(item.kind)}</div>)}
            <div className="stack-on-tray" style={{ left: `${playerX}%` }}>
              <div className="stack-layers">{stack.slice(-6).map((kind, index) => <span key={`${kind}-${index}`} className={`stack-layer ${kind}`} />)}</div>
              <div className="bread-base" />
              <img src={gameAssets.player} alt="The Fat Sandwich player" />
            </div>
            <div className={`catch-message ${message.includes("FUMBLE") ? "danger" : ""}`}>{message}</div>
          </div>

          <aside className="right-rail">
            <StatBurst label="TODAY’S TOP STACK" value={topScore.toLocaleString()} red />
            <div className="next-ticket"><img src={gameAssets.pastramiMami} alt="Pastrami Mami" /><strong>NEXT UP</strong><div className="next-item">{itemSprite(nextUp)}</div><span>{STACK_LABELS[nextUp]}</span></div>
            <div className="combo-card"><span>COMBO</span><b>x{Math.max(1, combo >= 10 ? 4 : combo >= 6 ? 3 : combo >= 3 ? 2 : 1)}</b><i style={{ height: `${Math.min(100, combo * 11)}%` }} /></div>
          </aside>
          <div className="mobile-controls"><button onClick={() => setPlayerX((value) => Math.max(7, value - 9))}>←</button><span>MOVE</span><button onClick={() => setPlayerX((value) => Math.min(93, value + 9))}>→</button></div>
        </section>
      )}

      {screen === "results" && (
        <section className="screen-overlay results-screen" aria-label="Results screen">
          <img className="results-mami" src={gameAssets.pastramiMami} alt="Pastrami Mami celebrating" />
          <div className="result-center"><h2>THAT’S A FAT STACK!</h2><img src={gameAssets.superStack} alt="Completed Super Stack" /><div className="score-receipt"><span>YOUR SCORE</span><b>{score.toLocaleString()}</b><small>{fumbles === 0 ? "NO FUMBLES. NICE." : `${fumbles} FUMBLE${fumbles > 1 ? "S" : ""}. STILL TASTY.`}</small></div><div className="result-actions"><button className="red-button" onClick={startGame}>PLAY AGAIN</button><button className="white-button" onClick={() => setScreen("leaderboard")}>VIEW BOARD</button></div></div>
          <div className="merch-burst">HIGH SCORE<br />= MERCH</div>
        </section>
      )}

      {screen === "leaderboard" && (
        <section className="screen-overlay leaderboard-screen" aria-label="High score screen">
          <img className="board-bird" src={gameAssets.captainTuna} alt="Captain Tuna" />
          <div className="board-center"><h2>TODAY’S TOP STACKS</h2><div className="score-list">{scores.map((entry, index) => <div className={index === 0 ? "first" : ""} key={`${entry.name}-${entry.score}`}><span>{index + 1}. {entry.name}</span><b>{entry.score.toLocaleString()}</b></div>)}</div><p>SCORE 5,000+ TO JOIN THE HIGH SCORE CLUB</p><button className="red-button" onClick={startGame}>PLAY AGAIN</button></div>
          <div className="claim-card"><img src={gameAssets.superStack} alt="Prize icon" /><b>CLAIM YOUR<br />MERCH</b><span>SHOW STAFF YOUR SCORE</span></div>
        </section>
      )}
    </main>
  );
}
