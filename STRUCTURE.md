# Structure

```text
client/src/
├── App.tsx                    # Fullscreen game route only
├── components/GameCanvas.tsx  # Babylon lifecycle-safe canvas frame + DOM game
├── game/
│   ├── scene.ts               # Babylon background scene handle
│   ├── assets.ts              # Centralized external asset URLs
│   └── SuperStackGame.tsx     # HTML game state machine, input, score, and screens
└── index.css                  # Comic Counter Carnival game system
```

The first draft uses a Babylon-owned transparent canvas as the browser-game host and a DOM UI layer for fast, readable 2D arcade gameplay. `SuperStackGame` owns menu state, input, falling items, scoring, fumbles, and local high-score data. The DOM layer is intentionally used for fast iteration on the branded event UI; later passes can move sprites and effects into Babylon if the production build needs it.
