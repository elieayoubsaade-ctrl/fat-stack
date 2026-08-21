# MOTB Night Rebuild Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild Fat Stack's presentation so the chosen character holds the growing tiger-bread sandwich in front of the Fat Sandwich truck at an MOTB night festival, with the catch point at the top of the tower — scoring maths untouched.

**Architecture:** `round.ts` stays the pure simulation; it gains a moving catch band (`catchY`) and a lid-incoming event. `SuperStackGame.tsx` is split: the state machine + loop stay, and the scene, player, HUD and screens move into their own components with their own CSS files. All art is brand cutouts plus SVG/CSS drawn in code.

**Tech Stack:** React 19, TypeScript 5.6, Vite 7, Tailwind 4 (only the reset is used), vitest (added), Playwright for screenshots (already available via the MCP plugin; a throwaway script is fine).

**Spec:** `docs/superpowers/specs/2026-08-21-motb-night-rebuild-design.md`

## Global Constraints

- Branch `Talal-Edits`. Plain-language commit messages, no conventional-commit prefixes (matches Elie's history).
- Scoring constants in `config.ts` (`ITEMS`, `PHASES`, `TOWER.collapseAt/wobbleAt/lidMinLayers/lidInterval*/bankBonusPerLayerSquared`, `COMBO_TIERS`, `END_BONUS`) are **not** changed.
- Every screen works with only ArrowLeft / ArrowRight / Space (Enter). No screen requires a pointer.
- Target 16:9 landscape, 1920×1080 and 1280×720 must both look right.
- Palette tokens: purple `#5b1a8a`, purple-deep `#2a0b3d`, orange `#f26a1b`, red `#e02b2b`, yellow `#ffcf3a`, ink `#111`, cream `#fff4e3`. Outlines 4px ink.
- No new AI-generated art. No Disney references.
- `pnpm check` and `pnpm build` green after every task.

---

### Task 1: Test harness + moving catch band in the simulation

**Files:**
- Modify: `package.json` (add vitest, `test` script)
- Modify: `client/src/game/config.ts:78-95` (ROUND) and `TOWER`
- Modify: `client/src/game/round.ts:219-222` (spawn x), `:318-320` (`catchReach`), `:366-370` (catch test), `:402-420` (`autoDirection`)
- Modify: `scripts/simulate-balance.ts:83,98`
- Test: `client/src/game/round.test.ts`

**Interfaces:**
- Produces: `export function catchY(round: Round): number` and `export function catchBand(round: Round): { top: number; bottom: number }` in `round.ts`; `TOWER.trayY = 84`, `TOWER.layerUnits = 2.8`, `ROUND.hatch = { left: 22, right: 78 }` in `config.ts`.

- [ ] **Step 1: Add vitest**

```bash
cd ~/Desktop/fat-stack && pnpm add -D vitest@^3
```
In `package.json` scripts add `"test": "vitest run"`.

- [ ] **Step 2: Write the failing tests**

`client/src/game/round.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { ROUND, TOWER } from "./config";
import { catchBand, catchY, createRound, stepRound } from "./round";

const seeded = (seed = 1) => () => {
  seed = (seed * 16807) % 2147483647;
  return (seed - 1) / 2147483646;
};

describe("catch geometry", () => {
  it("catches at the tray when the tower is empty", () => {
    const round = createRound(seeded());
    expect(catchY(round)).toBe(TOWER.trayY);
  });
  it("rises by layerUnits per layer", () => {
    const round = createRound(seeded());
    round.tower = ["turkey", "lettuce", "tomato"];
    expect(catchY(round)).toBeCloseTo(TOWER.trayY - 3 * TOWER.layerUnits);
    const band = catchBand(round);
    expect(band.top).toBeCloseTo(catchY(round) - 5);
    expect(band.bottom).toBeCloseTo(catchY(round) + 4);
  });
});

describe("spawning", () => {
  it("only spawns inside the truck hatch", () => {
    const round = createRound(seeded(7));
    for (let t = 0; t < 60; t += 1 / 60) stepRound(round, 1 / 60);
    const xs: number[] = [];
    const r2 = createRound(seeded(9));
    for (let t = 0; t < 60; t += 1 / 60) {
      stepRound(r2, 1 / 60);
      for (const item of r2.items) xs.push(item.x);
    }
    expect(Math.min(...xs)).toBeGreaterThanOrEqual(ROUND.hatch.left);
    expect(Math.max(...xs)).toBeLessThanOrEqual(ROUND.hatch.right);
  });
});
```

- [ ] **Step 3: Run, expect failure**

`pnpm test` → fails: `catchY` is not exported, `ROUND.hatch` undefined.

- [ ] **Step 4: Implement**

`config.ts` — inside `ROUND` replace `catchTop`/`catchBottom`/`spawnMargin` with:
```ts
  /** The truck hatch, in grid units. Everything falls out of it. */
  hatch: { left: 22, right: 78 },
```
and inside `TOWER` add:
```ts
  /** Where the tray sits on the 0–100 grid (y). The catch point starts here... */
  trayY: 84,
  /** ...and rises this many grid units per layer. Tall tower = earlier catch. */
  layerUnits: 2.8,
```
Keep `createRound(random?)` signature — check it accepts a random fn (it has `random` on the Round; if `createRound` has no parameter, add `random: () => number = Math.random`).

`round.ts`:
```ts
/** Where the top of the tower is right now — the catch point. */
export function catchY(round: Round) {
  return TOWER.trayY - round.tower.length * TOWER.layerUnits;
}
export function catchBand(round: Round) {
  const y = catchY(round);
  return { top: y - 5, bottom: y + 4 };
}
```
Spawn x (line ~220): `x: ROUND.hatch.left + round.random() * (ROUND.hatch.right - ROUND.hatch.left),`
Catch test (line ~368): compute `const band = catchBand(round);` once before the loop; `const inBand = item.y >= band.top && item.y <= band.bottom;`
`autoDirection`: replace `ROUND.catchTop` with `catchBand(round).top` and `ROUND.catchBottom` with `catchBand(round).bottom`.
`scripts/simulate-balance.ts:83,98`: same replacement (import `catchBand`).
`SuperStackGame.tsx:856`: replace `ROUND.catchBottom` with `TOWER.trayY` for the shadow proximity.

- [ ] **Step 5: Run tests, balance, check**

`pnpm test` → PASS. `pnpm balance` → the three verdicts still print as passing (skill ≥ 2×, greed pays, never-bank loses). If a verdict fails, lower `layerUnits` to 2.4 and re-run; record the final value in the commit message. `pnpm check` green.

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "Catch at the top of the tower, spawn from the truck hatch, add vitest"
```

---

### Task 2: Lid warning event + horn

**Files:**
- Modify: `client/src/game/round.ts` (`GameEvent`, `Round`, `scheduleLid`, `stepRound`)
- Modify: `client/src/game/audio.ts` (add `lidHorn`)
- Modify: `client/src/game/SuperStackGame.tsx:229-300` (`drainEvents`)
- Test: `client/src/game/round.test.ts`

**Interfaces:**
- Produces: `GameEvent` variant `{ type: "lid-incoming" }`, `Round.lidWarned: boolean`, `sfx.lidHorn()`.

- [ ] **Step 1: Failing test**

```ts
describe("lid warning", () => {
  it("fires lid-incoming one second before a lid becomes available", () => {
    const round = createRound(seeded(3));
    round.tower = ["turkey", "lettuce", "tomato"];
    round.nextLidAt = 5;
    const seen: number[] = [];
    for (let t = 0; t < 6; t += 1 / 60) {
      stepRound(round, 1 / 60);
      if (round.events.some((e) => e.type === "lid-incoming")) seen.push(round.elapsed);
      round.events.length = 0;
    }
    expect(seen.length).toBe(1);
    expect(seen[0]).toBeGreaterThan(3.9);
    expect(seen[0]).toBeLessThan(4.1);
  });
});
```

- [ ] **Step 2: Run → fails** (`lid-incoming` never pushed).

- [ ] **Step 3: Implement**

`round.ts`: add `| { type: "lid-incoming" }` to `GameEvent`; add `lidWarned: boolean` to `Round` (init `false` in `createRound`); in `scheduleLid` set `round.lidWarned = false;`; in `stepRound` after the BANK IT block:
```ts
  if (!round.lidWarned && round.tower.length >= TOWER.lidMinLayers && round.elapsed >= round.nextLidAt - 1) {
    round.lidWarned = true;
    round.events.push({ type: "lid-incoming" });
  }
```
`audio.ts`: add a `lidHorn()` — two-note sawtooth (440→660 Hz, 180ms each, gain 0.18) using the same helper the file uses for `lidIncoming`; export it in the `sfx` object.
`SuperStackGame.tsx` `drainEvents`: `case "lid-incoming": sfx.lidHorn(); setHatchFlash((n) => n + 1); break;` — add `const [hatchFlash, setHatchFlash] = useState(0);` (consumed by Task 4).

- [ ] **Step 4: `pnpm test`, `pnpm check` → green. Commit**

```bash
git add -A && git commit -m "Warn one second before the lid drops"
```

---

### Task 3: Fonts, tokens, and the night Scene

**Files:**
- Create: `client/public/fonts/Bangers-Regular.woff2`, `client/public/fonts/Rubik-Variable.woff2` (download from Google Fonts' GitHub: `google/fonts` repo, `ofl/bangers/Bangers-Regular.ttf` → convert with `pip install fonttools brotli; pyftsubset ... --flavor=woff2`, or fetch the woff2 straight from `https://fonts.gstatic.com` via the CSS URL)
- Create: `client/src/styles/tokens.css`, `client/src/styles/scene.css`
- Create: `client/src/game/Scene.tsx`
- Modify: `client/src/index.css` (import the new files; delete `:root` palette lines that conflict)
- Modify: `client/src/game/SuperStackGame.tsx` (render `<Scene hatchFlash={hatchFlash} />` as the first child of the root element)

**Interfaces:**
- Produces: `<Scene hatchFlash?: number; bank?: number />` — `bank` increments make the bulbs flash. CSS vars `--purple --purple-deep --orange --red --yellow --ink --cream --font-display --font-ui`.

- [ ] **Step 1: tokens.css**

```css
@font-face { font-family: "Bangers"; src: url("/fonts/Bangers-Regular.woff2") format("woff2"); font-display: swap; }
@font-face { font-family: "Rubik"; src: url("/fonts/Rubik-Variable.woff2") format("woff2"); font-weight: 300 900; font-display: swap; }
:root {
  --purple: #5b1a8a; --purple-deep: #2a0b3d; --orange: #f26a1b; --red: #e02b2b;
  --yellow: #ffcf3a; --ink: #111; --cream: #fff4e3; --bulb: #ffd98a;
  --font-display: "Bangers", Impact, "Arial Black", sans-serif;
  --font-ui: "Rubik", "Trebuchet MS", Arial, sans-serif;
  --outline: 4px;
  --burst-shadow: 6px 6px 0 var(--ink);
}
```

- [ ] **Step 2: Scene.tsx**

One absolutely-positioned `<div class="scene">` containing, back to front:
1. `.sky` (CSS gradient `linear-gradient(180deg, #1a0628 0%, var(--purple-deep) 45%, #7a2a9c 80%, var(--orange) 100%)`) with 40 `.star` spans positioned from a seeded list (no `Math.random` in render — hardcode a `const STARS = [[x,y,size],...]` of 40 entries).
2. `<svg class="lights">` — two catenary `<path>` strokes across the top with `<circle>` bulbs every 4% of width; class `flash` when `bank` changes (key on `bank`).
3. `<svg class="truck" viewBox="0 0 1200 560">` drawn from the photo (`Fat Sandwich MOTB Pitch/assets/truck.jpg`): orange body `rx=28`, black 8px stroke; purple service window at `x 250..950, y 120..330`; a red 14-point burst on the right; `FAT SANDWICH` in `--font-display` fill red with a black stroke; roof marquee rect with `MOTB · WINTER 2027`; a row of red dots along the bottom like the real truck; two wheels. The window interior is the **hatch** and its screen-x range must equal `ROUND.hatch` (22%–78% of the stage): size the truck to 100% stage width with the window from x=264 to x=936 on the 1200 viewBox. `hatchFlash` keys a `.hatch-glow` rect that animates gold → transparent over 900ms.
4. `.crowd` — an SVG path of bumpy silhouettes along the bottom 14%, fill `#0d0416`, with a 3px `#8a3fc4` top stroke.
5. `.ground` — a 10% tall strip, `repeating-linear-gradient` boardwalk planks in `#3b1650`/`#2a0b3d`.

Everything `pointer-events: none; user-select: none`.

- [ ] **Step 3: scene.css** — positions, the `bulb-flash` and `hatch-glow` keyframes, a slow 8s `twinkle` on `.star:nth-child(3n)`. Compositor-only properties (opacity/transform).

- [ ] **Step 4: Mount it**

In `SuperStackGame.tsx` render `<Scene hatchFlash={hatchFlash} bank={scorePulse} />` as the first child of the root `.super-stack-app`. Make `.super-stack-app` `position: relative; background: var(--purple-deep)` and every screen layer `position: relative; z-index: 1`. Remove the deli-paper background image rule.

- [ ] **Step 5: Screenshot check**

`pnpm dev`, open `http://localhost:5173/?demo` at 1920×1080 with Playwright, screenshot to `~/Desktop/fat-stack-shots/03-scene.png`. The truck must be centred, the hatch between 22% and 78% of the width, lights at the top, crowd at the bottom. Fix before committing.

- [ ] **Step 6: `pnpm check`, commit**

```bash
git add -A && git commit -m "The MOTB night scene: truck, lights, crowd, boardwalk"
```

---

### Task 4: Character cut-outs + Player component

**Files:**
- Create: `scripts/cut-characters.py` (Pillow: trim transparent bbox, pad 4%, resize to 700px tall, save PNG)
- Replace: `client/public/assets/chars/*.png` from `~/Desktop/Fat Sandwich Marketing/References/Characters /No Background/*.png` (add `chop-chop.png`)
- Modify: `client/src/game/characters.ts` (add `trayY`, `lean`, Chop-Chop)
- Create: `client/src/game/Player.tsx`, `client/src/styles/player.css`
- Modify: `client/src/game/SuperStackGame.tsx:915-940` — replace the `.stack-on-tray` block with `<Player …/>`

**Interfaces:**
- `Character` gains `trayY: number` (0–1, fraction of the sprite height from the top where the tray sits) and `lean: boolean`.
- Produces:
```ts
export type PlayerProps = {
  character: Character; x: number; direction: number; layers: ItemKind[];
  pot: number; lidLive: boolean; bankValue: number; heat: "calm" | "warm" | "hot";
  mood: "idle" | "catch" | "cheer" | "panic" | "stunned"; moodKey: number;
  debris: { id: number; kind: ItemKind; dx: number; rot: number }[];
};
```

- [ ] **Step 1: Cut the characters**

```python
# scripts/cut-characters.py
from PIL import Image; import glob, os, re
SRC = os.path.expanduser("~/Desktop/Fat Sandwich Marketing/References/Characters /No Background")
OUT = "client/public/assets/chars"
NAMES = {"Birdman":"birdman","Captain Tuna":"captain-tuna","Chop-Chop":"chop-chop","Egghead":"egghead",
         "Lil Sprout":"lil-sprout","PB&J":"pbj","Pastrami Mami No BG":"pastrami-mami",
         "Runny Sunny No BG":"runny-sunny","The Fat Sandwich":"fat-sandwich","Uncle Kraut":"uncle-kraut"}
for path in glob.glob(SRC + "/*.png"):
    stem = os.path.splitext(os.path.basename(path))[0]
    if stem not in NAMES: continue
    im = Image.open(path).convert("RGBA"); im = im.crop(im.getbbox())
    pad = int(im.height * 0.04); canvas = Image.new("RGBA", (im.width + 2*pad, im.height + 2*pad)); canvas.paste(im, (pad, pad))
    canvas.thumbnail((1400, 700)); canvas.save(f"{OUT}/{NAMES[stem]}.png", optimize=True); print(NAMES[stem], canvas.size)
```
Run `python3 scripts/cut-characters.py`. Each file must be under 250 KB; if bigger, `thumbnail((1000, 500))`.

- [ ] **Step 2: characters.ts** — add `trayY` and `lean` to every entry. Starting values (tune from screenshots): fat-sandwich 0.62, pastrami-mami 0.55, captain-tuna 0.6, birdman 0.6, egghead 0.58, pbj 0.6, runny-sunny 0.62, lil-sprout 0.6, uncle-kraut 0.52, chop-chop 0.5 (`lean:false`). All others `lean:true`. Add `{ id: "chop-chop", name: "Chop-Chop", tag: "Fast hands", art: …, trayY: 0.5, lean: false }`.

- [ ] **Step 3: Player.tsx**

```tsx
export default function Player(p: PlayerProps) {
  const lean = p.character.lean ? p.direction * 6 : 0;
  const wobble = Math.max(0, p.layers.length - TOWER.wobbleAt + 1);
  return (
    <div className="player" style={{ left: `${p.x}%` }}>
      <div key={p.moodKey} className={`player-body mood-${p.mood}`} style={{ transform: `rotate(${lean}deg)` }}>
        <img className="player-art" src={p.character.art} alt={p.character.name} draggable={false} />
        {p.mood === "panic" && <span className="sweat" />}
      </div>
      <div className="tray" style={{ bottom: `${(1 - p.character.trayY) * 100}%` }}>
        <svg className="tray-art" viewBox="0 0 200 46"><ellipse cx="100" cy="23" rx="96" ry="19" fill="#d9d4e3" stroke="#111" strokeWidth="5"/><ellipse cx="100" cy="18" rx="78" ry="11" fill="#f2eff7"/></svg>
        <div className={`tower heat-${p.heat}`} style={{ ["--wobble" as string]: wobble }}>
          <img className="tower-base" src={gameAssets.ingBase} alt="" />
          {p.layers.map((kind, i) => (
            <img key={`${kind}-${i}`} className="tower-layer" src={artFor(kind)} alt="" style={{ transform: `rotate(${((i * 37) % 9) - 4}deg)`, zIndex: i + 2 }} />
          ))}
        </div>
        {p.pot > 0 && (
          <div className={`pot-chip ${p.lidLive ? "lid-live" : ""}`} style={{ bottom: `${p.layers.length * LAYER_PX + 30}px` }}>
            <span>POT</span><b>{p.pot.toLocaleString("en-US")}</b>{p.lidLive && <i>LID = {p.bankValue.toLocaleString("en-US")}</i>}
          </div>
        )}
        {p.layers.length > 0 && <div className={`height-chip heat-${p.heat}`}>{p.layers.length}/{TOWER.collapseAt}</div>}
      </div>
      {p.debris.map((d) => (
        <div key={d.id} className="debris" style={{ ["--dx" as string]: `${d.dx}%`, ["--rot" as string]: `${d.rot}deg` }}><img src={artFor(d.kind)} alt="" /></div>
      ))}
    </div>
  );
}
```
`export const LAYER_PX = 26;` lives in `Player.tsx`. Stage height is 100vh → 12 layers = 312px + base ≈ 30% of 1080; scale `--layer-px` with `clamp(18px, 2.6vh, 30px)` in CSS and use `calc(var(--layer-px) * N)` instead of the px constant where possible.

- [ ] **Step 4: player.css** — `.player { position:absolute; bottom: 9%; height: 26%; transform: translateX(-50%); transition: none; }`, `.player-art { height: 100%; filter: drop-shadow(0 8px 0 rgba(0,0,0,.35)); }`, `.tower` stacked with negative margins so each layer overlaps (`margin-top: calc(var(--layer-px) * -0.55)`), `.tower.heat-warm` and `.heat-hot` run `sway` keyframes with `--wobble`-scaled amplitude (`rotate(calc(var(--wobble) * 1.2deg))`), mood keyframes: `mood-catch` (squash 1.06/0.94, 180ms), `mood-cheer` (hop 12px, 400ms), `mood-panic` (shake ±3px, infinite), `mood-stunned` (tilt 12°, 600ms). `.debris` throw arc (existing keyframes from `index.css` moved here).

- [ ] **Step 5: Wire into SuperStackGame**

Replace the `.stack-on-tray` JSX with `<Player character={playerChar} x={view.playerX} direction={view.direction} layers={view.layers} pot={view.pot} lidLive={lidLive} bankValue={currentBankValue} heat={towerHeat} mood={mood} moodKey={moodKey} debris={debris} />`. Add `direction` to `View` (from `round.direction`). Add `const [mood, setMood] = useState<PlayerProps["mood"]>("idle"); const [moodKey, setMoodKey] = useState(0);` and a `setMoodFor(m, ms)` helper that sets then returns to `idle` (or `panic` if `towerHeat==="hot"`). In `drainEvents`: `pot` → `catch` 180ms; `bank` → `cheer` 500ms; `collapse` → `stunned` 600ms; `fumble` → `stunned` 400ms. Remove the left/right rail characters (`.rail-character`) entirely.

- [ ] **Step 6: Screenshots** of 3 characters mid-game at 1920×1080 → `~/Desktop/fat-stack-shots/04-player-*.png`. The tray must sit on the character's hands/front, the tower must be readable at 1 and 10 layers. Adjust `trayY` values until true.

- [ ] **Step 7: `pnpm check`, commit**

```bash
git add -A && git commit -m "The chosen character holds the sandwich: new cut-outs, tray, tower, moods"
```

---

### Task 5: HUD boards

**Files:**
- Create: `client/src/game/Hud.tsx`, `client/src/styles/hud.css`
- Modify: `client/src/game/SuperStackGame.tsx` — delete `.left-rail` / `.right-rail` / `.big-clock` JSX; render `<Hud …/>` inside `.play-screen`

**Interfaces:**
```ts
export type HudProps = { score: number; banks: number; fumbles: number; seconds: number; phaseLabel: string; urgent: boolean;
  nextKind: ItemKind; combo: number; multiplier: number; topScore: number; scorePulse: number };
```

- [ ] **Step 1: Hud.tsx** — four fixed boards:
  - `.board.board-banked` top-left: eyebrow `BANKED`, big number keyed on `scorePulse` with `pulse-on-mount`; below it `FAT STACKS · {banks}`.
  - `.board.board-clock` top-right: `{seconds}` in display font, `{phaseLabel}` chip; class `urgent` when `urgent`. Under it three `<svg class="cup">` sauce cups; `tipped` class for the first `fumbles` of them (rotate 70°, opacity .5).
  - `.hatch-sign` centred at top 30%/left 50%: `NEXT UP` / `DODGE!` / `BANK!` with `<Ingredient kind={nextKind}/>`, classes `danger` / `gold` as today.
  - `.combo-meter` right edge, vertical: `x{multiplier}` on a burst, a bar filled to `min(100, combo*6)%`.
  - `.board.board-top` bottom-left small: `TODAY'S TOP {topScore}`.
  Every board: `background: var(--purple)`, 4px ink outline, `--burst-shadow`, text in `--font-display`, cream/yellow numbers.

- [ ] **Step 2: hud.css** — positions use `%` of the stage; nothing inside x 22–78% / y 30–90% except the hatch sign (which sits on the truck window top edge at y≈26%). `.urgent b { animation: pulse-red .5s infinite alternate }`.

- [ ] **Step 3: Wire** — compute the props from `view` as today (`seconds`, `urgent`, `topScore` already exist). Delete the old rail markup and the `.rail-*`, `.big-clock`, `.next-ticket`, `.combo-card` CSS.

- [ ] **Step 4: Screenshot** `05-hud.png` at both sizes; nothing overlaps the fall lane.

- [ ] **Step 5: `pnpm check`, commit**

```bash
git add -A && git commit -m "HUD boards hang off the truck instead of the old paper rails"
```

---

### Task 6: Screens — Start, Select carousel, How-to

**Files:**
- Create: `client/src/game/screens/StartScreen.tsx`, `SelectScreen.tsx`, `HowToScreen.tsx`, `client/src/styles/screens.css`
- Modify: `client/src/game/SuperStackGame.tsx:700-790` (replace JSX), `:620-660` (the select-screen key handler — ArrowUp/Down go away, Left/Right move the carousel)

**Interfaces:**
- `StartScreen({ hasPlayed, topScore, best, onStart })`
- `SelectScreen({ characters, index, onIndex, onPick })` — `index` is the centred card; `onPick()` confirms.
- `HowToScreen({ onStart })`.

- [ ] **Step 1: StartScreen** — logo image `client/public/assets/logo.png` (copy from `~/Desktop/Fat Sandwich MOTB Pitch/assets/logo.png`), headline `STACK IT HIGH.` / `BANK IT BIG.` in display font at `clamp(48px, 9vh, 120px)`, one red button `PRESS TO PLAY` with a 1.2s `breathe` animation, a hint row `◀ ▶ MOVE · ● START`, stat pills for today's top / your best. Overlay background `rgba(42,11,61,.72)` with `backdrop-filter: blur(6px)`.

- [ ] **Step 2: SelectScreen** — a horizontal track of all cards translated so card `index` is centred (`transform: translateX(calc(50% - (index + .5) * var(--card-w)))`, 250ms ease-out); centre card scale 1.15 with a yellow burst behind it, others 0.85 at 0.6 opacity. Left/Right change `index` (wraps), Space/Enter calls `onPick`. Pointer click on a card sets the index; click on the centred card picks. Name + tag under the centre card only. Big red button `STACK AS {NAME}`.

- [ ] **Step 3: HowToScreen** — the four existing articles, restyled as purple boards; `PRESS TO START`.

- [ ] **Step 4: Key handler** — in the select-screen `useEffect` replace the ArrowUp/Down grid logic with: Left → `setSelIndex(i => (i - 1 + n) % n)`, Right → `(i + 1) % n`, Enter/Space → pick. `charId` is derived: `CHARACTERS[selIndex].id`, persisted as today.

- [ ] **Step 5: Screenshots** `06-start.png`, `06-select.png`, `06-howto.png` at 1920×1080. Walk the carousel with ArrowRight ×3 + Enter in Playwright to prove keyboard-only works.

- [ ] **Step 6: `pnpm check`, commit**

```bash
git add -A && git commit -m "Start, character carousel and how-to screens in the night scene"
```

---

### Task 7: Screens — Results + Board with the hero sandwich

**Files:**
- Create: `client/src/game/screens/ResultsScreen.tsx`, `BoardScreen.tsx`, `client/src/game/HeroSandwich.tsx`
- Modify: `client/src/game/SuperStackGame.tsx:1000-1154` (replace JSX; keep `resultStage`, initials, `confirmInitials` logic and pass as props)
- Modify: `client/src/game/round.ts` — record `biggestBankLayers: ItemKind[]` on the `Round` when `biggestBank` is set (copy `round.tower` before reset)

**Interfaces:**
- `HeroSandwich({ layers: ItemKind[] })` — draws base + layers + lid at `--layer-px`, closed.
- `ResultsScreen({ run, stage, countedScore, initials, initialSlot, savedRank, boardCutoff, onConfirmInitials, onPlayAgain, onBoard })`.
- `BoardScreen({ scores, onPlay })`.
- `RunSummary` gains `biggestLayers: ItemKind[]`.

- [ ] **Step 1: round.ts** — in `handleCatch` where `biggestBank` updates: `round.biggestBankLayers = [...round.tower];` (before the tower resets). Init `[]`. Add a vitest: after a scripted bank of a 4-layer tower, `biggestBankLayers.length === 4`.

- [ ] **Step 2: ResultsScreen** — left: `<HeroSandwich layers={run.biggestLayers}/>` with a caption `YOUR FATTEST STACK · {n} LAYERS`; right: the receipt (score count-up, banks, biggest bank, best combo, bonuses, pot lost) and the initials entry (Left/Right move slot, Up/Down not required — use Left/Right to move, Space to advance letter? No: keep Elie's spin: ArrowUp/Down spin letters, but ALSO make Left/Right spin when the joystick has no up/down: Left = previous letter, Right = next letter, Space/Enter = confirm slot, three confirms = save). Merch note kept.

- [ ] **Step 3: BoardScreen** — `TOP STACKS` list, rank bursts for 1–3, `PLAY` button.

- [ ] **Step 4: Screenshots** `07-results.png`, `07-board.png`.

- [ ] **Step 5: `pnpm check`, `pnpm test`, commit**

```bash
git add -A && git commit -m "Results and leaderboard: the biggest stack is the hero"
```

---

### Task 8: Delete the old CSS, split the stylesheet, final pass

**Files:**
- Modify: `client/src/index.css` → keep only `@import "tailwindcss"` + imports of `styles/{tokens,scene,player,hud,screens}.css` + the app shell rules (`.super-stack-app`, buttons, `.slam`, `.float-text`, `.countdown-overlay`, `.pause-overlay`, `.attract-overlay`, keyframes).
- Delete: `client/public/assets/super-stack-deli-paper-bg.jpg`, `captain-tuna-scorekeeper.png`, `pastrami-mami-host.png`, `the-fat-sandwich-player.png`, `fatsandwich-logo-purple-burst.jpeg` if no longer referenced (`grep -rn` first).
- Modify: `client/src/game/assets.ts` — remove the deleted entries.
- Modify: `README.md` — "Run locally" unchanged; add a "Talal Edits" section: what changed, the MOTB scene, joystick mapping, where the shots are.

- [ ] **Step 1: grep every `className` used in TSX against the CSS; delete unused rules.** `grep -o 'className="[^"]*"' -r client/src | tr ' "' '\n' | sort -u` vs `grep -o '^\.[a-z0-9-]*' client/src/styles/*.css client/src/index.css | sort -u`.
- [ ] **Step 2: `pnpm build`; `du -sh dist/public`** — must stay under 4 MB.
- [ ] **Step 3: Play 3 full rounds by hand with the keyboard.** Fix anything that feels wrong (catch timing, tray offsets, wobble amplitude). Record what was changed in the commit message.
- [ ] **Step 4: Playwright pass** — every screen at 1920×1080 and 1280×720 into `~/Desktop/fat-stack-shots/final-*.png`, plus a 20s `?demo` capture (`gif_creator` or a video via `browser_run_code`).
- [ ] **Step 5: Commit + push**

```bash
git add -A && git commit -m "Talal Edits: clean-up, README, screenshots" && git push -u origin Talal-Edits
```

---

## Self-review

- Spec §1 scene → Task 3. §2 player → Task 4. §3 catch geometry + lid warning → Tasks 1–2. §4 HUD → Task 5. §5 screens → Tasks 6–7. §6 input → Tasks 6–7 (carousel + initials with Left/Right). §7 files → all. §8 testing → vitest in 1, 2, 7; balance in 1; screenshots in 3–8; hand play in 8.
- Names consistent: `catchY`, `catchBand`, `ROUND.hatch`, `TOWER.trayY`, `TOWER.layerUnits`, `lid-incoming`, `sfx.lidHorn`, `Character.trayY/lean`, `PlayerProps`, `HudProps`, `biggestBankLayers` / `RunSummary.biggestLayers`.
