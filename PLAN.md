# Game Plan: Fatsandwich Super Stack

## Risk Tasks

### 1. Event input and timing loop
- **Why isolated:** The game must respond cleanly to keyboard arrows and arcade joysticks that map to arrows while ingredients, scoring, fumbles, and the 60-second countdown advance together.
- **Approach:** Use one browser animation loop for item movement, a semantic keyboard input listener, and a light DOM renderer for the first 2D draft.
- **Verify:** Left/right movement follows held arrow input, ingredients land or exit cleanly, hazards add one fumble, and the result screen opens at zero seconds or three fumbles.

## Main Build

Build a fullscreen browser arcade game with start, tutorial, live play, result, and daily high-score states. Use the Fatsandwich character cast as interactive hosts; use tiger-crunch ingredients, red/purple comic UI, and generated ingredient art.

- **Assets needed:** Deli-paper background, stacked-sandwich icon, turkey/pastrami/roast-beef ingredient stickers, approved logo, and approved character cut-outs.
- **Verify:**
  - Arrow-key input visibly moves the player character.
  - Good catches add score, combo, and a stack layer.
  - Hazards increase fumbles; three fumbles ends the round.
  - Start, tutorial, play, results, and high-score screens all open from the interface.
  - UI remains legible at a 16:9 desktop/event-TV viewport.
  - `?demo` starts a short auto-play run for visual verification.
  - No console errors or missing image URLs.
