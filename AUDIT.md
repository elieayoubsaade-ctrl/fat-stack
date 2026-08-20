# Super Stack — Full Review

Branch: `elie-edits`

Reviewed by running the game at **1920×1080** (event-TV size), walking every screen, measuring the
real on-screen layout, and reading every line of game logic. Install, type-check and production build
all pass — so this is not a "broken build". It is a game that has not been balanced, composed, or
finished.

**Verdict: the screens exist and function, but the game underneath them has no design tension, and
the layout was never composed for a widescreen TV.**

---

# Part 1 — What's on screen

## 1.1 The screen flow does exist

For the record, all five screens render and connect correctly:

**Start → How To Stack → Play → Results → Leaderboard**, with `TODAY'S TOP STACKS` in the header
jumping to the board from anywhere. Space/Enter and the red button both advance. I walked the whole
loop.

So if the flow appeared to be missing, it is one of these — worth confirming which:

- The **`?demo` URL parameter skips the start screen entirely** and drops straight into autoplay
  ([SuperStackGame.tsx:236-240](client/src/game/SuperStackGame.tsx#L236)). If the link being opened
  has `?demo` on it, pages one and two never appear.
- The screens are so empty that they don't read as designed pages (see below).
- Or "pages" means **game levels/stages**, which genuinely do not exist — there is one flat 60-second
  round and nothing else.

## 1.2 The layout was not composed for a 16:9 screen

Measured at 1920×1080:

| Screen | Problem | Measured |
|---|---|---|
| **Play** | The play lane is **square on a widescreen** | Lane is 872×897 px — a **0.97:1 box on a 1.78:1 screen** |
| **Play** | Side rails are mostly empty air | Each rail is **450 px wide holding a 158 px card** — 584 px of the screen (30%) is padding |
| **Tutorial** | Content clings to the top | **383 px of dead space below the button — 35% of the screen** |
| **Start** | The centre panel is an island | Panel is **680 px wide on a 1920 px screen — 35% of the width** |

The tutorial dead space has a precise cause: `.screen-overlay` sets `place-items:center`, then
`.tutorial-screen` overrides it with `display:flex` and never sets `justify-content:center`
([index.css](client/src/index.css)). The centring is silently cancelled, so everything piles at the
top.

## 1.3 Things overlapping and cut off

- **The "CATCH IT!" banner sits on top of the player character.** Measured overlap: player occupies
  y 853–1050, the banner y 980–1037 — straight across the character's body. The player is obscured
  during play.
- **Pastrami Mami overlaps the "TODAY'S TOP STACK" score burst** on the start screen. Confirmed
  collision.
- **Both characters are cut off by the bottom of the screen.** `transform:scale(1.65)` pushes Mami's
  box to 1099 px and Captain Tuna's to 1107 px on a 1080 px screen — 19 px and 27 px of each
  character is chopped off.
- **The TIME counter is 84×44 px** on a 1920 px screen. That is unreadable from across an event
  space, and it is the single most important number in a timed game.

## 1.4 Art that isn't finished

- **No game-world background at all.** `super-stack-deli-counter-game-world.png` is a 493-byte error
  placeholder reading *"Image generation failed"*, saved with a `.png` name but containing SVG. The
  browser can't decode it, so the whole game falls back to flat cream. The deli counter does not
  exist.
- **7 of 10 ingredients are typed symbols**, not food: lettuce `≈`, tomato `●`, onion `◉`, pickles
  `≋`, pepperoncini `✺`, bacon `✦`, hazard `!`. Only turkey, pastrami and roast beef have artwork.
  `FALLING_ASSET_SYSTEM.md` explicitly forbids "geometric substitutes, letter glyphs, generic
  circles, or emoji".
- **The characters are full artwork, not clean cut-outs.** Pastrami Mami and Captain Tuna carry their
  printed names inside the image, so their names appear as part of the art at odd angles.
- **The logo is a JPEG with a white box behind it**, sitting on cream — it reads as a broken tile.
- **The lane background is lined notebook paper with red comic starbursts baked into it.** Those
  bursts look like floating debris and compete with the actual falling ingredients.

---

# Part 2 — Why the game isn't fun

This is the core of it. The game has **one difficulty knob, one way to lose, and no decisions to
make.**

## 2.1 There are no scoring decisions

Every ingredient is worth **exactly the same 100 points** ([line 170](client/src/game/SuperStackGame.tsx#L170))
and every ingredient **falls at the same random speed** ([line 51](client/src/game/SuperStackGame.tsx#L51)).

The approved design says otherwise:

| Item | Design doc | In the game |
|---|---:|---:|
| Turkey / pastrami / roast beef | 250, slow, wide | 100, same speed |
| Bacon bits | 125, medium | 100, same speed |
| Lettuce, tomato, onion, pickle, pepperoncini | 100, fast | 100, same speed |
| **Tiger-crunch lid** | **750 + completion bonus** | **does not exist** |

Because a tomato and a pastrami are worth the same and behave the same, there is never a reason to
choose one over the other. The player just drifts toward whatever is nearest. **That is why it feels
flat.**

## 2.2 The maths of a round

With a 780 ms → 420 ms spawn ramp over 60 seconds:

- roughly **100 items per round**, of which **~12 are hazards** (fixed 12%)
- the catch zone is **26 units wide** in a spawn range of 80 units — so **a third of everything that
  falls lands on you if you stand still**
- expected hazards caught while standing still: **12 × 0.325 ≈ 4** — and 3 ends the round

I tested exactly this: **standing completely still, the round ended in 15 seconds.** Doing nothing
kills you, which sounds like pressure but isn't — because:

## 2.3 Missing food is free

Only touching a hazard costs anything. Dropping an ingredient has no penalty at all. So the game
never punishes caution, only contact. There is no reason to chase a difficult catch, and no cost to
letting a whole wave fall.

**One failure mode, no reward for risk.** That combination is what "out of balance" feels like.

## 2.4 The only thing that gets harder is spawn rate

Fall speed never changes. Hazard rate never changes. Nothing escalates but the number of objects. No
waves, no stages, no rush at the end, no reason for a 60-second round to feel different at second 55
than at second 5.

## 2.5 The "NEXT UP" panel is fiction

It shows `GOOD_ITEMS[(stack.length + 1) % 9]` ([line 243](client/src/game/SuperStackGame.tsx#L243)) —
a value derived from how many items you've stacked, **completely unrelated to what actually falls
next**, which is random. It is presented to the player as information, and it isn't. Either wire it
to the real spawn queue or remove it.

## 2.6 The round has no fixed length

The 60-second clock **restarts every time you catch a good ingredient.** Measured live: the clock sat
at 60 while the score climbed 1,100 → 3,600, then finally counted down only once catching stopped.

Cause: the game loop lists `catchItem` as a dependency ([line 214](client/src/game/SuperStackGame.tsx#L214));
`catchItem` is rebuilt whenever the combo changes ([line 173](client/src/game/SuperStackGame.tsx#L173));
rebuilding restarts the loop and resets its start time ([line 177](client/src/game/SuperStackGame.tsx#L177)).

A good player is never timed out. For an event with a queue, that alone is disqualifying.

## 2.7 Scoring zero is congratulated

A round that ended with **0 points** still displays **"THAT'S A FAT STACK!"** and **"NO FUMBLES.
NICE."** There is no losing state, no "so close", no reason to feel you did badly — or well.

## 2.8 The leaderboard contradicts itself

- Printed on screen: **"SCORE 5,000+ TO JOIN THE HIGH SCORE CLUB"**
- In the code: anyone above **300** is admitted ([line 129](client/src/game/SuperStackGame.tsx#L129))
- Every entry is saved as the name **"YOU"** — no name entry, so the board fills with identical rows
- Stored in one browser's local storage: **a second screen shows a different board, and clearing
  browser data erases the day**

## 2.9 Movement doesn't feel like an arcade cabinet

Each key press **teleports** the player 7% across the lane ([line 220](client/src/game/SuperStackGame.tsx#L220)).
Holding the joystick relies on the operating system's key-repeat, which stalls for about half a
second before repeating. `PLAN.md` specifies movement should "follow held arrow input" — it doesn't.

## 2.10 Difficulty depends on the monitor

Items move a fixed distance **per drawn frame** rather than per second
([line 200](client/src/game/SuperStackGame.tsx#L200)). On a 120 Hz screen the game runs at roughly
double speed; if the machine stutters, items slow down and pile up.

*(I measured severe pile-up in testing, but the test browser throttles animation, so I can't put a
real number on how bad this is on your hardware. The design flaw is real regardless: the game's
difficulty should not depend on which TV it is plugged into.)*

## 2.11 No sound

Nothing. No catch sound, no fumble sound, no music, no countdown. A silent cabinet at a loud event
attracts nobody, and the player gets no feedback for a good catch beyond a small banner that is
sitting on top of their own character.

---

# Part 3 — Weight and leftovers

| Issue | Detail |
|---|---|
| **~29 MB of images load before play** | Ingredient art is **1920×1920 px displayed at 65 px**. The Super Stack icon alone is 6.5 MB |
| **38 MB more shipped but never used** | Four `_original` duplicates plus mockup and art-direction sheets |
| **367 KB of builder tooling injected into the page** | `vite-plugin-manus-runtime` inlines a script — including a **second copy of React** — into production HTML |
| **A 3D engine drawing nothing** | Babylon.js runs a render loop over an empty transparent canvas; it is the bulk of the 848 KB bundle |
| **A guaranteed 404 on every load** | The analytics tag ships unresolved: the browser requests `%VITE_ANALYTICS_ENDPOINT%/umami` |
| **Dead code** | 53 unused UI-kit components, plus `ErrorBoundary`, `ManusDialog`, `Map`, `pages/Home`, `pages/NotFound`, and a 14 KB `template.json` scaffold copy |
| **`pnpm start` fails on Windows** | Unix-only syntax in the script. `pnpm dev` and `pnpm build` work fine |

---

# Part 4 — What I'd actually do

Fixing these one at a time will not produce a good game, because the problems are not independent:
the flat scoring, the single failure mode, the flat difficulty and the missing lid are all *the same
missing design*. I'd treat it as three pieces of work.

### A. Make it a real game (the important one)
Rebuild the round logic around the design doc that already exists: per-ingredient values and speeds,
the tiger-crunch lid as a completion move, a difficulty curve across the 60 seconds, a genuine reason
to take risks, and a fixed round length. Add sound.

### B. Compose the screens for a TV
Fill the 16:9 frame properly: a wide lane instead of a square box, a readable clock, characters that
aren't cut off or overlapping, and a real background behind the counter. Give the start and tutorial
screens a composition rather than a centred island.

### C. Finish the art and cut the weight
Draw the seven missing ingredients, replace the failed background, clean cut-outs for the characters,
and resize everything to display size. Strip the builder tooling and the unused 3D engine.

**Order:** A before B before C. There is no point polishing the composition of a round that isn't fun
yet.

---

# Verified working

- `pnpm install`, `pnpm check` (no type errors), `pnpm build` — all pass
- All five screens render and navigate correctly; keyboard and on-screen controls both work
- Scoring, combo multiplier, fumble counting and local high-score saving all function as written
