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

## Asset Handling

The copied source uses local public paths such as `/assets/pastrami-ingredient-sticker.png`, so it works once pushed to GitHub and deployed with a normal static Vite workflow. The `ASSET_FILE_LIST.tsv` manifest records every browser-ready image copied into this package. The full brand-reference library is intentionally retained as source material; do not move its high-resolution files into the application bundle unless you actually use them.

## GitHub Upload

Create or open your repository, copy the contents of this directory into it, then commit the source and assets together. Do not commit `node_modules/` or `dist/`; both are excluded by `.gitignore` and rebuilt from `package.json` / `pnpm-lock.yaml`.

> This is an original Fatsandwich game concept. It does not include Disney, Lilo & Stitch, Experiment 625/Reuben, or any copied third-party game art, code, sound, or brand assets.
