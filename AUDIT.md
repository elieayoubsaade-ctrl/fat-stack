# Super Stack — Code & Game Audit

Branch: `elie-edits` · Audited against a live run of the game, a clean `pnpm install`, a passing
type-check, and a successful production build.

**Health summary:** the project builds and runs with no crashes and no type errors. The problems are
not "it's broken" problems — they are "it doesn't yet do what the design documents say it does"
problems, plus one bug that stops the game being a 60-second game.

---

## P0 — Blocks running this at an event

### 1. The 60-second timer stops while you're catching

**This is the most important finding.** The round clock resets to 60 every time a good ingredient is
caught, so a player who keeps catching is never timed out.

Measured live (`?demo`, one continuous round, real seconds vs. displayed TIME):

| Real time | Score | TIME shown |
|---|---|---|
| 0.0s | 1,100 | 60 |
| 2.4s | 2,000 | 60 |
| 5.4s | 3,600 | 60 |
| *catching stops here* | | |
| 9.4s | 3,600 | 57 |
| 17.4s | 3,600 | 49 |
| 27.4s | 3,600 | 39 |

The clock only ran once the player stopped scoring.

**Cause:** the game loop in `client/src/game/SuperStackGame.tsx:214` lists `catchItem` as a
dependency. `catchItem` is rebuilt whenever `combo` changes (line 173), which happens on every catch.
Rebuilding it restarts the whole loop, and the loop sets its start time on line 177 — so the
countdown begins again from zero.

**Impact at an event:** rounds have no fixed length, the queue can't be managed, and scores between
players aren't comparable. **Fix before anything else.**

### 2. The game-world background does not exist

`client/public/assets/super-stack-deli-counter-game-world.png` is not an image. It is a 493-byte
error placeholder whose text reads *"Image generation failed"*, and it is saved with a `.png` name
while actually containing SVG. The browser cannot decode it, so the background of the entire game
silently falls back to flat cream.

It is applied as the app background at `SuperStackGame.tsx:246`. The deli-counter environment — the
thing `todo.md` calls the next major design task — is simply absent.

### 3. Seven of the ten ingredients are typed symbols, not food

Only turkey, pastrami and roast beef have artwork. Everything else renders as a character in a
coloured circle (`SuperStackGame.tsx:59-68`):

| Ingredient | Currently shown as |
|---|---|
| Bacon bits | `✦` |
| Lettuce | `≈` |
| Tomato | `●` |
| Red onion | `◉` |
| Pickles | `≋` |
| Pepperoncini | `✺` |
| Hazard / fumble | `!` |

`FALLING_ASSET_SYSTEM.md` states the playfield "must never use geometric substitutes, letter glyphs,
generic circles, or emoji." Seven of ten items break that rule. Confirmed live: 23 of 31 items on
screen were symbols.

---

## P1 — The game doesn't match its own design documents

### 4. Every ingredient is worth the same

Code gives a flat **100 points × combo multiplier** for everything (`SuperStackGame.tsx:170`). The
approved design says:

| Item | Design doc | In the code |
|---|---:|---:|
| Turkey / pastrami / roast beef | 250 | 100 |
| Bacon bits | 125 | 100 |
| Lettuce, tomato, onion, pickle, pepperoncini | 100 | 100 |
| Tiger-crunch lid | 750 + bonus | **not in the game** |

Nothing rewards going for the good stuff, so there is no reason to aim.

### 5. The tiger-crunch top lid is missing entirely

The "complete the Super Stack" finish move — the moment the game is named after — has no code behind
it. There is no lid item, no completion state, no bonus.

### 6. Fall speed is identical for everything

All items fall at a random 16–24 regardless of type (`SuperStackGame.tsx:51`). The design calls for
proteins slow and heavy, toppings fast. Right now a tomato and a pastrami behave the same.

### 7. The leaderboard contradicts the screen it's printed on

- The screen tells players **"SCORE 5,000+ TO JOIN THE HIGH SCORE CLUB"** (line 320)
- The code admits anyone over **300** (line 129)
- Every entry is saved as the name **"YOU"** (line 131) — there is no name entry, so the board fills
  with identical rows
- Scores live in that one browser's local storage. **A second screen shows a different leaderboard,
  and clearing browser data erases the day.**

For a merch giveaway driven by the board, this needs deciding before the event.

---

## P2 — Feel and reliability

### 8. Game speed depends on the monitor

Items move a fixed distance per drawn frame, not per second (`SuperStackGame.tsx:200`). On a 120 Hz
screen the game runs at roughly double speed; when the browser stutters it slows to a crawl. Observed
live: items piled up to **31 on screen at once** as the page got busy, far beyond what the lane is
designed for.

The fix is to scale movement by elapsed time. This also makes the game behave identically on any
venue TV.

### 9. Movement teleports instead of sliding

Each key press jumps the player 7% across the lane (`SuperStackGame.tsx:220`). Holding the joystick
relies on the operating system's key-repeat, which pauses for about half a second before repeating.
`PLAN.md` specifies "left/right movement follows held arrow input" — that isn't what's built.

### 10. No sound at all

No audio anywhere in the project. A silent arcade cabinet at a busy event draws nobody in.

### 11. Missing a good ingredient costs nothing

Only catching a hazard causes a fumble. Dropping food is free, so the safe strategy is to stand still
and only move for guaranteed catches.

### 12. Combos miscount on simultaneous catches

If two items land in the same frame, both read the same old combo value (`SuperStackGame.tsx:167`),
so the combo advances by one instead of two.

---

## P3 — Weight and leftovers from the tool that generated this

### 13. Roughly 29 MB of images load before the game starts

Ingredient stickers are **1920×1920 pixels** but are displayed at a maximum of **65 pixels**. The
Super Stack icon is 6.5 MB.

| | |
|---|---|
| Downloaded on every play | **28.8 MB** |
| In the folder but never used by the game | **38.1 MB** |

The unused files are the four `_original` duplicates plus the mockup and art-direction sheets.
Resizing the real assets to display size would cut load time by well over 90%.

### 14. 367 KB of builder tooling is injected into the shipped page

`vite-plugin-manus-runtime` inlines a **367 KB script — including a second copy of React —** directly
into the production HTML. It has nothing to do with gameplay and delays first paint.

### 15. A 3D engine renders an empty screen

Babylon.js loads a full 3D engine and runs a render loop over a transparent, empty scene
(`client/src/game/scene.ts`, `client/src/components/GameCanvas.tsx`). It draws nothing, and is the
bulk of the 848 KB JavaScript bundle.

### 16. Every page load fires a guaranteed 404

`client/index.html:12` ships an analytics tag with the placeholder text unresolved — the browser
literally requests `%VITE_ANALYTICS_ENDPOINT%/umami`. Confirmed live.

### 17. Dead code

Nothing imports **53 UI-kit components** in `client/src/components/ui/`, nor `ErrorBoundary.tsx`,
`ManusDialog.tsx`, `Map.tsx`, `pages/Home.tsx` or `pages/NotFound.tsx`. `template.json` (14 KB) is a
copy of the original scaffold. `.gitkeep` and `.manus/` are empty leftovers.

### 18. `pnpm start` fails on Windows

The production script uses Unix-only syntax (`NODE_ENV=production node ...`) in `package.json`.
`pnpm dev` and `pnpm build` both work fine.

---

## Verified working

- `pnpm install` → clean (native builds need approving once)
- `pnpm check` → **no type errors**
- `pnpm build` → **succeeds**
- No crashes, no React errors, no missing-file errors other than the analytics tag
- Screens, navigation, scoring, combo multiplier, fumbles and the results/leaderboard flow all
  function
- Keyboard and on-screen mobile controls both work

## Suggested order of work

1. **Fix the timer** (#1) — one-line dependency change; without it there is no round.
2. **Decide the leaderboard** (#7) — shared across devices, or accept it is per-screen? Changes what
   we build.
3. **Replace the background** (#2) and **draw the seven missing ingredients** (#3).
4. **Apply the real scoring, speeds and the tiger-crunch lid** (#4, #5, #6).
5. **Time-based movement and held-key sliding** (#8, #9) — makes it feel like an arcade game.
6. **Shrink the images, strip the dead tooling** (#13–#17) — fast load on venue wifi.
7. **Sound** (#10).
