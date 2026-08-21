# Fat Stack — MOTB night rebuild (Talal Edits)

Date: 21 Aug 2026 · Branch: `Talal-Edits` · Owner: Talal

## Why

The game's economy (pot → bank with the tiger lid → collapse past 12 layers) is good and
simulator-tuned. What it is missing is the thing the 625 Sandwich Stacker gets right: a
character front and centre holding the sandwich, a sandwich that visibly grows in their
hands, and a real place to stand. Today it is a flat green lane, a thumbnail sandwich, and
characters parked in the margins. Nothing says MOTB.

This rebuild changes the presentation layer and the catch geometry. It does not change the
scoring maths.

## Decisions (approved 21 Aug)

| Question | Answer |
|---|---|
| Scoring | Keep the gamble: pot / bank / collapse exactly as in `config.ts` + `round.ts` |
| Scene | MOTB night: the Fat Sandwich truck at a festival at dusk |
| Player | The chosen character holds a tray; the sandwich builds on the tray |
| Platform | 16:9 event TV, joystick left/right + one button; keyboard fallback |
| Art | No new AI art. Brand cutouts + drawn-in-code scene |

## 1 · The world

One full-bleed `<Scene>` component behind everything (SVG + CSS, under 40 KB):

- Sky: deep purple (`#2a0b3d` → `#5b1a8a`) gradient, a few stars, a sliver of orange dusk
  at the horizon.
- Two strings of bulb lights across the top. Bulbs glow warm; they flicker on BANK.
- The truck: orange body, purple service window, red burst badge, `FAT SANDWICH` in the
  comic logo face on the side, a `MOTB · WINTER 2027` marquee board on the roof. Centred,
  spanning ~60% of the width, its hatch at ~22% from the top. **Ingredients fall out of the
  hatch** — spawn x is clamped to the hatch's width (`ROUND.spawnMargin` becomes hatch
  bounds).
- Crowd silhouettes along the bottom edge, behind the player, flat black with a purple rim.
- The ground: a dark boardwalk strip the player stands on.

Brand rules: purple / orange / red, black hand-drawn outlines (4px), comic bursts for every
text pop, the logo face (already in `index.css` as the display font stack) for headings.
The cream deli-paper UI is removed.

## 2 · The player

`<Player>` replaces the current `stack-on-tray` block:

- The selected character cutout, ~26% of the stage height, bottom-centre, moved with
  `transform: translateX` on `playerX`.
- A drawn tray (SVG: grey oval with a rim and a black outline) sits at the character's
  "hands" — a per-character `trayY` offset in `characters.ts`, because the cutouts differ.
- The tower renders on the tray: `base.png`, each layer, `lid.png` on bank. Layer height is
  fixed at `LAYER_PX` so 12 layers ≈ 45% of the stage height. Layers alternate a small
  rotation so it looks stacked, not printed.
- Wobble from `TOWER.wobbleAt`: the whole tower sways with amplitude growing per layer; the
  character gets a `panic` class (shake + sweat drop drawn in CSS).
- Collapse: layers become debris (existing `Debris` system) thrown in an arc; the character
  gets `stunned` for 600ms. Round continues.
- Bank: lid slams on, the closed sandwich pops up, shrinks, and flies to the BANKED board;
  character gets `cheer`.
- Lean: the character tilts ±6° toward the move direction; squash 1.06/0.94 on catch.

Chop-Chop joins the cast (10 characters) — the cutout is an action graphic, so it gets a
larger `trayY` and no lean. If it looks wrong in a screenshot it is dropped again.

## 3 · Catch geometry

The catch band today is fixed (`catchTop: 76, catchBottom: 90`). With the sandwich in the
player's hands, the catch happens at the **top of the tower**:

- `catchY(round) = TRAY_Y − layers × LAYER_UNITS` where both constants are in grid units
  and live in `config.ts` (`TOWER.trayY = 84`, `TOWER.layerUnits = 2.8`). Band is
  `catchY − 5 … catchY + 4`.
- Horizontal reach is unchanged (`catchReach`).
- Consequence: a tall tower catches earlier, so fast toppings arrive sooner — a real skill
  element, and it makes the gamble visible. The simulator (`pnpm balance`) is re-run; the
  three economy verdicts must still hold (skill ≥ 2×, greed pays, never-bank loses).
- Lid warning: 1s before a lid spawns, `{type:"lid-incoming"}` fires; a horn sound + the
  hatch flashes gold. Implemented by scheduling the event at `nextLidAt − 1`.

No other rule changes.

## 4 · HUD

Everything hangs off the truck or sits in the corners, never over the fall lane:

- Top-left board: `BANKED` (big), `FAT STACKS` count. Top-right board: clock + phase, with
  the last 10 seconds pulsing red.
- Fumbles: three sauce-cup icons under the clock; caught one = tipped over.
- `NEXT UP` ticket on the hatch itself (a small window sign), since that is where it comes
  from.
- Combo: a vertical meter on the right edge of the truck, with the multiplier on top.
- Pot: a burst chip pinned beside the top of the tower that follows it up. Shows `POT` and
  when a lid is live `LID = value`.

## 5 · Screens

Same state machine (`start → select → how-to → playing → results → board`). All screens sit
on the night scene; overlays are dark purple glass with the comic headings.

- Start: logo, `STACK IT HIGH. BANK IT BIG.`, one red button, attract mode after 20s.
- Select: horizontal carousel, one highlighted card centre, left/right to move, button to
  pick. Works with three inputs.
- How-to: unchanged content, restyled.
- Results / board: unchanged flow, restyled; the closed sandwich of the biggest bank is
  drawn at the real height as the hero.

## 6 · Input

Joystick = arrow keys (event box maps to arrows). One button = Space / Enter. Pointer drag
stays as a fallback for laptops. No screen requires a pointer.

## 7 · Files

| File | Change |
|---|---|
| `client/src/game/Scene.tsx` | new — the night scene |
| `client/src/game/Player.tsx` | new — character + tray + tower + states |
| `client/src/game/Hud.tsx` | new — the boards, pulled out of `SuperStackGame.tsx` |
| `client/src/game/screens/*.tsx` | new — Start, Select, HowTo, Results, Board |
| `client/src/game/config.ts` | `TOWER.trayY`, `TOWER.layerUnits`, hatch bounds |
| `client/src/game/round.ts` | `catchY()`, lid-incoming event, spawn x from hatch |
| `client/src/game/characters.ts` | `trayY` per character, Chop-Chop |
| `client/src/game/audio.ts` | horn for lid-incoming |
| `client/src/index.css` | split into `styles/{tokens,scene,player,hud,screens}.css` |
| `client/public/assets/chars/` | re-cut from the marketing folder's No Background PNGs |
| `scripts/simulate-balance.ts` | uses `catchY()` |

`SuperStackGame.tsx` (1,154 lines) shrinks to the state machine + game loop.

## 8 · Testing

- `pnpm check` and `pnpm build` green.
- `pnpm balance` verdicts still pass with the moving catch band.
- Unit tests (vitest, new): `catchY`, `bankValue`, lid scheduling, the spawn-x clamp.
- Screenshots at 1920×1080 and 1280×720 of every screen via Playwright, saved to
  `~/Desktop/fat-stack-shots/`, and a 20-second `?demo` recording.
- Played by hand with the keyboard before it is called done.

## 9 · Out of scope

Engine swap, new AI art, scoring changes, shared leaderboard, phone layout.
