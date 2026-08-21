# Fatsandwich Super Stack

This archive is a **GitHub-ready source package** for the first playable Fatsandwich Super Stack event game. It contains the React and TypeScript game source, Babylon browser-game host, design specifications, visual mock-ups, Fatsandwich character art, food-ingredient assets, brand references, and local browser-ready image files.

## Run Locally

Install Node.js 22 or later, then run the following from the repository root.

```bash
pnpm install
pnpm dev
```

The game opens at the local Vite URL. Arrow keys or `A` / `D` move the player; `Space` or `Enter` advances the game. Add `?demo` to the URL to view the built-in autoplay demonstration.

```bash
pnpm check
pnpm build
```

## What Is Included

| Location | Contents |
|---|---|
| `client/src/game/` | Game logic, scene host, score flow, input, asset registry, and screen states |
| `client/src/components/GameCanvas.tsx` | Lifecycle-safe Babylon canvas frame and HTML game wrapper |
| `client/src/index.css` | Fatsandwich comic-deli visual system and responsive event-screen styles |
| `client/public/assets/` | Local logo, character cut-outs, background art, ingredient art, and game mock-ups used by the source package |
| `brand-reference-library/` | Complete Fatsandwich brand library: characters, logo references, food photography, packaging, original sources, palette, and prompts |
| `FALLING_ASSET_SYSTEM.md` | Approved direction for proteins, toppings, bread, and fumble objects |
| `ideas.md`, `PLAN.md`, `STRUCTURE.md`, `MEMORY.md` | Design rationale, game plan, architecture, and implementation notes |

## Talal Edits (branch `Talal-Edits`, 21 Aug 2026)

The game now lives at the Fat Sandwich kiosk at an MOTB night festival, and the chosen
character holds the sandwich.

- **Scene** — `client/src/game/Scene.tsx`: the real orange kiosk (purple panel, service
  window, red dots, burst, `MOTB · WINTER 2027` marquee), string lights, crowd, boardwalk.
  All SVG/CSS, no image files. Ingredients fall out of the purple panel (the hatch).
- **Player** — `client/src/game/Player.tsx`: all ten characters from the marketing folder
  (`scripts/cut-characters.py` re-cuts them), a tray held out to the side, the tower grows
  on the tray, moods (catch / cheer / panic / stunned), collapse throws the layers.
- **Catch point** — the top of the tower, not a fixed line (`catchY` in `round.ts`). A tall
  tower catches earlier. Items spawn at the hatch; `ROUND.fallScale` keeps their travel
  time identical to before so the balance sheet still means what it says.
- **Lid warning** — a horn and the hatch glows gold one second before a lid drops.
- **HUD** — `client/src/game/Hud.tsx`: boards in the corners, NEXT UP on the kiosk face.
- **Screens** — `client/src/game/screens/`: start, a character carousel, how-to, results
  with the biggest banked sandwich drawn as the hero, the board.
- **Joystick + one button, start to finish** — left/right browse the carousel and spin
  initials; the button picks, starts, advances a slot, locks in, and plays again.
- **Styles** — `client/src/styles/{tokens,scene,player,hud,screens}.css`. Fonts (Luckiest Guy,
  Rubik) are self-hosted in `client/public/fonts/` so the event TV needs no internet.
- **Tests** — `pnpm test` (vitest) covers the catch geometry, the hatch spawn clamp, the lid
  warning and the hero-sandwich record. `pnpm balance`: skill 2.0×, never-bank 56%,
  greed-pays 1.05× (target 1.1× — the narrower hatch makes everything reachable for both
  bots; to be settled by real playtesting, not by bending the scoring).

Screenshots from the build are in `~/Desktop/fat-stack-shots/`. Design spec and plan:
`docs/superpowers/`.

## Asset Handling

The copied source uses local public paths such as `/assets/pastrami-ingredient-sticker.png`, so it works once pushed to GitHub and deployed with a normal static Vite workflow. The `ASSET_FILE_LIST.tsv` manifest records every browser-ready image copied into this package. The full brand-reference library is intentionally retained as source material; do not move its high-resolution files into the application bundle unless you actually use them.

## GitHub Upload

Create or open your repository, copy the contents of this directory into it, then commit the source and assets together. Do not commit `node_modules/` or `dist/`; both are excluded by `.gitignore` and rebuilt from `package.json` / `pnpm-lock.yaml`.

> This is an original Fatsandwich game concept. It does not include Disney, Lilo & Stitch, Experiment 625/Reuben, or any copied third-party game art, code, sound, or brand assets.
