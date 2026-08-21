# Super Stack — Complete Game Audit (v3)

**Goal:** a smooth, addictive, genuinely playable arcade game with clean UI/UX.
**Audited:** the live build at https://fatsandwich-super-stack.netlify.app — every screen, every
interaction, the full codebase, plus 300 simulated rounds to measure fairness and pacing.
Earlier audits covered "what's broken"; this one covers **what stands between the current game
and a great one.**

## Scorecard

| Area | Grade | One-line verdict |
|---|---|---|
| Core game rules | **B** | Balanced, skill-testing, verified by simulation — the foundation is now good |
| Game feel ("juice") | **D** | Catches feel like spreadsheet updates. Almost zero visual feedback |
| Fairness | **B–** | Everything is catchable, but hazard streaks feel rigged 1.4×/round |
| Addictive loop | **C–** | The "one more go" machinery is missing: no celebration, no near-miss, no name on the board |
| Screen layout | **D+** | Square lane on a widescreen, 30% of the play screen is empty air |
| Visual design | **C–** | Brand colours are right; logo, lane texture and hierarchy are not |
| Onboarding / UX flow | **C** | Flow works, but the game's key rule (the lid) is never taught |
| Technical smoothness | **C+** | Solid simulation; but movement has built-in input lag and 900KB of dead code ships |

---

# 1 · The addictive loop — what's missing

An arcade game keeps people playing through a loop: **act → feedback → grow → almost-win → try again.**
The rules now support this loop, but almost every *emotional* beat in it is silent. These are the seven
loop-breakers, in order of damage:

### 1.1 Catches have no visual reward
Catch a 250-point pastrami at combo x4 and here is everything that happens on screen: a number in the
left rail changes, and a small banner changes its text. No points fly up from the catch. Nothing
flashes. The sandwich doesn't react. The item just vanishes.

**This is the single biggest gap in the game.** The fix list (each is small):
- **Floating score text** at the catch point — "+1,000" popping up and fading. The player must *see*
  the reward where the action happened, not do mental math against a distant counter.
- The stack/player **squashes** slightly on catch (classic squash-and-stretch, 100ms).
- A brief **burst** (CSS particles or a comic starburst flash) on protein and lid catches.
- **Screen shake** (4–6px, 150ms) on a fumble — losing a life should feel physical.
- The score counter should **tick up** rather than jump.

### 1.2 The sandwich you're building is invisible
The entire fantasy is "build the biggest fat stack" — and the stack renders as up to eight
**7-pixel-tall CSS ovals** hidden behind the player character. The one thing the game is named after
is unreadable from two feet away, let alone across a room.

The stack should be the hero: big, layered, comically tall as it grows, wobbling slightly, with each
ingredient visibly distinct. When it's one lid away from completion it should glow. This is both the
core feedback mechanism *and* the spectator hook — a tall teetering sandwich on an event TV is what
makes the next person queue up.

### 1.3 The lid rule is a secret
To spawn the tiger-crunch lid you need 2 proteins + 4 toppings stacked. **Nothing on screen ever
communicates this.** Players can't work toward a goal they can't see — the lid just appears
"randomly", which throws away the anticipation the mechanic was built for.

Natural fix that uses existing brand assets: turn Pastrami Mami's "NEXT UP" ticket into an **ORDER
ticket** — 🥩🥩 🥬🥬🥬🥬 with items checked off as you stack them, then "LID INCOMING!" when
qualified. Suddenly the player has a visible mission at all times.

### 1.4 Nothing celebrates a high score
Beat every score on today's board and the results screen says… "THAT'S A FAT STACK!", same as any
round. The single most triumphant moment the game can produce — **NEW #1 TODAY** — literally cannot
be triggered. There is also no rank reveal ("You came 3rd today"), no near-miss ("1,200 short of the
board — one more pastrami"), and no name entry, so the board fills with rows all called "YOU".

The results screen should be a sequence, not a card: score ticks up → rank slides in → if top-5,
arcade-style 3-initial entry → "PLAY AGAIN" pulsing. That sequence *is* the retry loop.

### 1.5 The round starts and ends with no punctuation
Press start and items are already falling while your hand is still on the button. The round ends by
cutting instantly to the results card. Add a **"3 · 2 · 1 · STACK!"** count-in (~1.5s) and a
**"TIME!"** freeze-frame beat (~0.8s) before results. Phases change silently too — "RUSH!" should
slam onto the screen with a sound, because it's the moment the game gets exciting.

### 1.6 The RUSH doesn't look like a rush
Measured across 300 simulated rounds: average items on screen is **2.2 in WARM UP → 3.1 in RUSH**,
peaking at 6. The finale of the round is 40% busier than the warm-up — it should feel *twice* as
busy. The `maxItems: 9` cap is never even reached. Spawn interval in RUSH should drop to ~380–420ms
(fairness holds: see §3).

### 1.7 No attract mode
At an event, an idle screen is a dead stand. The demo autoplay already exists (`?demo`) but only via
URL. After ~20s idle on the start screen, the game should slide into autoplay with a "PRESS TO PLAY"
overlay, and any input snaps back to the start screen. This is standard arcade-cabinet behaviour and
it's nearly free to add since the autopilot is already written.

---

# 2 · Game feel — input and motion

### 2.1 Movement has ~120ms of built-in lag ⚠
`index.css` still has `transition: left 120ms` on `.stack-on-tray` — written for the old
teleport-style movement. The new engine updates position every frame, so the CSS transition now makes
the sprite **chase its real position with ~120ms of rubber-banding**. This is why movement will feel
slightly "floaty" even though the simulation is exact. Remove the transition (and animate with
`transform` instead of `left`, which also avoids layout work every frame — this matters on cheap
event-TV hardware).

### 2.2 Movement dynamics
Constant-speed slide (1.03s to cross the full lane) is a reasonable arcade baseline. Two upgrades
worth testing once the transition-lag is fixed:
- **30–50ms of ease-in** so direction changes feel weighty rather than robotic (keep it tiny; heavy
  easing would undo the fix above).
- A touch more speed in RUSH (the phase already scales fall speed ×1.45 but the player never speeds up).

### 2.3 Mobile controls are the weakest input path
On-screen ◄ ► buttons require thumb-hopping. The standard for catch games is **drag anywhere —
sandwich follows your finger x-position**. Big improvement, small change. Add `navigator.vibrate(30)`
on catch / `(80)` on fumble for cheap haptic feedback.

### 2.4 Items fall dead straight
Every item falls at fixed rotation in a straight line. Cheap life: slow rotation during fall (±20°
drift), and give bacon bits a slight sway. Not per-item physics — just enough motion that the lane
looks alive.

### 2.5 Sound is functional but thin
The synth SFX layer works (catches rise with combo — good). Missing: an ambient **music loop**
(tension rises in RUSH), a distinct "lid incoming" sting, and a "3-2-1" count-in sound. Also: **there
is no mute button anywhere in the UI** even though the audio module supports it. An event staffer
must be able to silence the cabinet; testers in an office will want it too.

---

# 3 · Fairness — measured

Simulation of 300 full rounds (static-centre player for spawn measurements):

| Check | Result | Verdict |
|---|---|---|
| Good items impossible to reach from spawn | **0.0%** | ✅ Fair — every item is catchable |
| Worst-case margin (RUSH topping, far edge) | **+0.16s** | ✅ Tight but humanly possible |
| Back-to-back hazard spawns | **1.38 per round** | ⚠ Feels rigged |
| Hidden-rule deaths (lid) | n/a | ⚠ see §1.3 |

**The hazard-streak problem:** spawns are independent random rolls, so double (occasionally triple)
hazards cluster. In a 3-life game, a double-hazard drop right above the player reads as "the game
cheated" — the exact feeling that makes people walk away rather than retry. Standard fix is a
**shuffle-bag / pity system**: never allow two hazards in a row, and guarantee at least one protein
every N spawns so droughts can't happen either. Randomness players *perceive* as fair is slightly
less random than true random.

**A UX trap in NEXT UP:** the ticket happily shows a hazard as "next up" with the same friendly
styling as food. A new player reads "NEXT UP: Sauce cup" as *catch this*. Hazards in the ticket need
danger styling — red border, ✕, "DODGE!" label. (Strategically, warning the player is great — it
creates a plan-ahead moment — it just has to *read* as a warning.)

**Two small correctness notes:**
- The live score displays `padStart(5, "0")` but tuned scores reach 90,000+ — six digits, and no
  thousands separators during play. Format the live score properly.
- Balance file still says `maxItems: 9` "so the screen never floods" — the real max observed is 6;
  after the RUSH densification (§1.6) re-verify with `pnpm balance`.

---

# 4 · Screen-by-screen UI/UX

*(Layout measurements at 1920×1080 from the previous audit still stand — step B was never started.
Summarised here so this document is complete.)*

### 4.1 Start screen
- Centre panel occupies **35% of the screen width**; the rest is empty cream.
- Pastrami Mami **overlaps** the TODAY'S TOP STACK badge; both characters are **cut off** at the
  bottom edge (scale transform pushes them past the viewport).
- CTA says "PRESS RED BUTTON TO PLAY" — correct for the arcade cabinet, confusing on a phone or
  laptop where there is no red button. Detect input mode (touch vs. keyboard) and adapt the copy.
- No attract mode (§1.7).

### 4.2 How-to screen
- 4 cards work as content, but **35% of the screen below the button is dead space** (a one-line CSS
  fix: the flex container lost its centring).
- It's static. The cards should *demonstrate* — the joystick doodle wiggling, an item dropping into a
  stack, a hazard bouncing off with an ✕. Motion teaches faster than labels.
- The lid rule ("2 meats + 4 toppings unlock the lid") is still not stated — the FINISH card just
  shows bread.
- **Repeat-player friction:** every player passes through this screen every time via the start
  screen. After the first play of a session, "PRESS RED BUTTON TO PLAY" should go straight to the
  countdown, with how-to reachable but skippable.

### 4.3 Play screen
- The lane is a **~1:1 square centred in a 16:9 frame**; each side rail is 450px wide holding 158px
  cards. ~30% of the screen is padding. The lane should be wide — it *is* the game.
- **TIME is 84×44px** — the most important number on screen is the least visible. During the last
  10 seconds it should dominate.
- The **"CATCH IT!" banner sits on top of the player character** at the bottom-centre — the message
  overlaps the thing you're controlling. Move messages to mid-lane height, or make them float up from
  the catch position (which §1.1 wants anyway).
- The **catch zone is invisible.** Players learn by dropping things. A subtle tray-line / shadow zone
  at y=76–90 shows where catching happens; item shadows growing as they approach would do the same
  job more elegantly.
- The lane texture is lined notebook paper with **baked-in red starbursts that read as game objects**
  and compete with real items. The playfield needs to be the *calmest* part of the screen, not the
  busiest: plain deli-paper texture, keep the decoration in the rails.
- Phase flag ("WARM UP") is a 9px label inside the timer chip — invisible. Phase changes deserve a
  full-lane announcement (§1.5).

### 4.4 Results screen
Structurally good (receipt with breakdown, itemised bonuses). Missing the sequence that makes it
land: count-up, rank reveal, NEW HIGH SCORE moment, name entry (§1.4). The characters are also
absent-or-clipped issues here as on start.

### 4.5 Leaderboard
- Seeds are placeholder names with plausible scores — fine.
- The cutoff copy ("SCORE 57,901+ TO JOIN") is honest now — good.
- Every real entry says "YOU" — needs the 3-initials entry to mean anything.
- **Per-device storage:** two screens at one event show different boards, and clearing browser data
  wipes the day. For a single-cabinet event this is acceptable; for anything more it needs a tiny
  backend. **Decision needed before the event, not a code problem.**

### 4.6 Missing system UI
No pause. No mute (§2.5). No fullscreen button (an event cabinet wants `requestFullscreen`, and
browser chrome kills the look). No Escape-to-quit-round. All small.

---

# 5 · Visual design

- **Logo:** a JPEG in a white box sitting on cream — reads as a broken image tile. Needs the
  transparent-background version (the brand library has cut-out logo art).
- **Characters:** the full-artwork exports with names baked in at angles ("PASTRAMI MAMI!") — they
  read as stickers pasted on, not characters *in* the scene. The brand library has clean transparent
  cut-outs (`brand-reference-library/02_Character_Artwork/02_Transparent_Cutouts_PNG/`) — use those,
  and let characters *react*: Captain Tuna flinches on a fumble, Mami cheers on a Super Stack.
  Characters that respond to gameplay are worth more than any static art.
- **Typography:** Impact for display is period-correct for the comic style, but the supporting
  hierarchy collapses at distance — labels of 9–11px everywhere. For an event TV, minimum ~18px for
  any label that matters; the type scale needs 3 sizes, not 8.
- **The 7 placeholder ingredients** (CSS shapes) are readable but flat, and the real art brief
  already exists in `FALLING_ASSET_SYSTEM.md`. The swap point is one line per item in
  `Ingredient.tsx`. This is a content task, not a code task — it can run in parallel with everything
  else.
- **Colour:** the cream/purple/red system is right and matches the palette JSON. The main sin is
  *noise* — starburst decorations on the field of play (§4.3) and purple 90%-opacity gradient rails
  inside the lane. Decoration belongs outside the lane.
- **No favicon and no social meta.** The tab shows a blank page icon (`/favicon.ico` falls through
  the SPA redirect and returns HTML). No `og:` tags — pasting the link into WhatsApp/Slack/iMessage
  shows nothing. For a link you're sharing around for testing, an icon + a title/image card is a
  10-minute fix that changes how legit it looks.

---

# 6 · Technical smoothness

| Issue | Size | Why it matters |
|---|---|---|
| CSS transition on player movement | — | ~120ms perceived input lag (§2.1) — **the** feel bug |
| Items positioned via `top/left` % | — | Forces layout every frame; `transform` is the smooth path on weak hardware |
| Babylon.js still ships | ~600KB of the 860KB JS | Renders an empty transparent canvas. Nothing uses it. Remove engine + canvas |
| Manus builder runtime inlined in HTML | 367KB (105KB gz) | Includes a **second copy of React**; delays first paint; pure leftover |
| 53 unused UI-kit components + dead pages | — | Noise; slows every future search/build |
| React re-render per frame | — | Fine at this scale; revisit only if TV hardware stutters after transform fix |

Current transfer: ~1.7MB total (down from 69MB). After removing Babylon + the manus runtime it lands
around **500–600KB** — near-instant even on venue Wi-Fi. `pnpm start` is also still broken on
Windows (Unix-only env syntax) — trivial fix, worth doing for completeness.

---

# 7 · The roadmap

Ordered so every phase is independently shippable and testable on the live URL.

### Phase 1 — Feel (the game becomes fun to touch)
1. Kill the 120ms movement lag; transform-based positioning
2. Floating score numbers, catch flash, fumble screen-shake, squash on catch
3. Count-in ("3·2·1·STACK!"), "TIME!" beat, phase slams ("RUSH!")
4. Shuffle-bag spawner (no double hazards, no protein droughts) + denser RUSH
5. Hazard warning styling in NEXT UP; visible catch zone (item shadows)
6. Mute button; live score formatting; mobile drag control + haptics

### Phase 2 — The loop (the game becomes addictive)
7. Order-ticket lid progress (the hidden rule becomes the visible mission)
8. Hero sandwich stack — big, layered, wobbling, glowing when lid-ready
9. Results sequence: count-up → rank reveal → NEW #1 celebration → 3-initial entry
10. Attract mode after 20s idle
11. Character reactions (Tuna flinches, Mami cheers)
12. Music loop + remaining stings

### Phase 3 — The look (the game becomes clean)
13. Recompose all screens for 16:9: wide lane, giant clock, no overlaps, no dead zones
14. Clean lane field; decoration moved to rails; type scale for TV distance
15. Transparent logo + clean character cut-outs from the brand library
16. Favicon + og-tags; fullscreen button
17. Strip Babylon + manus runtime (load drops to ~0.5MB)

### Parallel track — Art (not code)
Real ingredient art for the 7 placeholders + lid + 3 hazards per `FALLING_ASSET_SYSTEM.md`, the
deli-counter background, and (decision) whether the leaderboard needs to be shared across devices.

---

*Previous audits (v1 code audit, v2 screen review) are in git history. Balance harness: `pnpm balance`.*
