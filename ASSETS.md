# Assets

**Art direction:** Comic Counter Carnival — cream deli paper, controlled red/purple marker bursts, screen-print outlines, actual Fatsandwich cut-outs, and generous tiger-crunch sandwich layers.

All game runtime references now point to `client/public/assets/`, so this package does not depend on the original hosted preview.

| Asset | Purpose | Local runtime URL |
|---|---|---|
| Super Stack icon | Start/result hero symbol | `/assets/super-stack-icon.png` |
| Deli-paper background | Fullscreen game texture | `/assets/super-stack-deli-paper-bg.png` |
| Deli-counter environment | Fatsandwich game-world background | `/assets/super-stack-deli-counter-game-world.png` |
| Turkey sticker | Falling ingredient | `/assets/turkey-ingredient-sticker.png` |
| Pastrami sticker | Falling ingredient | `/assets/pastrami-ingredient-sticker.png` |
| Roast beef sticker | Falling ingredient | `/assets/roast-beef-ingredient-sticker.png` |
| Master wordmark | Brand mark | `/assets/fatsandwich-logo-purple-burst.jpeg` |
| The Fat Sandwich | Player character | `/assets/the-fat-sandwich-player.png` |
| Pastrami Mami | Tutorial and order-ticket host | `/assets/pastrami-mami-host.png` |
| Captain Tuna | Scorekeeper character | `/assets/captain-tuna-scorekeeper.png` |

`ASSET_FILE_LIST.tsv` records every browser-ready image file copied into the package. The full user-supplied brand source library remains in `brand-reference-library/`.
