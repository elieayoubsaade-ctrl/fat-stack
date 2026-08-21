# Super Stack — Development Plan (plan of record)

Synthesised from three sources: the v3 audit of our live build (`AUDIT.md`), the 625 Sandwich
Stacker design teardown (the game that inspired ours), and what already works in our codebase.
This replaces the original scaffold plan.

**Design note on the inspiration:** we take the 625 game's *systems* — which are not protectable and
are simply good design — and none of its code, art, characters, or Disney IP. Our theme already
passes the teardown's own test: Fatsandwich characters, deli ingredients, and a stacking sandwich
are not a skin on the mechanic, they *are* the mechanic.

---

## 1 · The design north star

The teardown's key sentence: *"Everything else is dressing on a push-your-luck decision that
repeats every few seconds."*

Our current game has balance, phases, and a working combo — but **no decision**. You catch what
falls, the score goes up, nothing is ever at stake. The 625 game's structure supplies the missing
soul, and it slots almost perfectly into what we've already built:

### What we adopt from 625

1. **The stack is a gamble, not a bonus.** Ingredient points no longer go straight to your score —
   they go into a **pending pot** that lives beside your growing sandwich. You only *bank* the pot
   by catching a tiger-crunch lid. Until then, it's at risk.
2. **Two opposing fail states.** Fumbles (3 hazards = round over) punish careless catching — we have
   this. **Collapse** punishes greed: past a height threshold the tower topples, and *the entire
   unbanked pot spills*. Careless play kills you; too-successful play robs you. The interesting game
   lives between.
3. **The bank arrives on a random timer.** Lids appear on a randomised interval once your stack is
   big enough to be a sandwich — you can't schedule your cash-out, only take or decline the exit in
   front of you. This is what turns "when do I stop" into a live gamble.
4. **Superlinear stack value.** A banked 10-layer sandwich must beat two banked 5-layer sandwiches,
   or banking early is always correct and the gamble dies. The teardown calls this "the one number
   that matters most" — our sim will verify it, not our gut.
5. **Layout grammar:** HUD in dedicated rails that never overlap the field; the bank object (lid)
   lives *in the world* as a falling object, not a button; warm food on a cool, calm field.
6. **Funny failure.** Collapse is a comic avalanche and a character reaction, not a punishment
   screen.

### What we keep from our build (and 625 lacks)

- **Fixed 60-second round.** 625 is endless-until-death; an event with a queue needs rounds of a
  known length. Collapse therefore *spills the pot* rather than ending the round.
- **Per-catch feedback.** 625's critical flaw is a score that sits at zero for minutes. Our pot
  ticks up on every catch, right beside the tower, and flies into the score on bank.
- **Combo system, difficulty phases, end-of-round bonuses, the balance simulator, synthesized
  audio, the measured 1.3MB payload.**

### What we reject

- **Run-ending collapse** (queue-hostile) and **endless play** (same reason).
- **625's hidden height limit** — the teardown flags the ungauged fail state as unfair. Our tower
  wobbles, the character panics, and a "MAX" line sits on the lane.
- **Hazards that look like food** — our hazards get a hard visual grammar (green tint + stink
  lines, no exceptions).

---

## 2 · The new core loop, precisely

```
catch food ──▶ layer added to tower · pot += points × combo × phase
                     │
                     ├── tower ≥ 3 layers ──▶ lids start arriving (random 5–9s timer,
                     │                         odds rise as the tower grows — mercy rule)
                     │
        ┌────────────┴─────────────┐
   CATCH THE LID                DECLINE (let it fall — costs nothing)
   pot × height bonus ──▶ SCORE   keep stacking: pot grows superlinearly,
   tower resets, fresh start      tower creeps toward collapse
                                       │
                                  12th layer ──▶ COLLAPSE: comic avalanche,
                                                 pot spills to zero, tower resets
                                                 (round continues; not a fumble)

hazards: unchanged — catch one = fumble, 3 = round over, combo resets
round end: TIME! — any unbanked pot is LOST → the last 10 seconds become "BANK IT!" pressure
```

**Starting tuning values** (to be beaten into shape by the simulator, then by humans):

| Parameter | Value | Rationale |
|---|---|---|
| Collapse height | 12 layers | Reachable in ~25s of clean play; wobble warning from 8 |
| Lid eligibility | tower ≥ 3 layers | A 1-layer sandwich isn't a sandwich |
| Lid interval | random 5–9s, odds ↑ with height | Can't be scheduled; merciful when you're deep |
| Bank bonus | pot + layers² × 50 | Quadratic: 10-layer kicker (5,000) beats two 5-layer kickers (2×1,250) |
| Item points → pot | current values (protein 250…) × combo × phase | Combo and phases keep their roles |
| Fumbles | 3, hazards only | Unchanged |
| End-of-round bonuses | keep (clean counter / survived) | They reward the *fumble* axis |
| Round | 60s, three phases | Unchanged — event queue requirement |

**The simulator must answer before humans play:** does always-bank-at-3 lose to smart banking? Does
never-banking lose harder? What % of pot value does each skill tier lose to collapse? Is the
expert/novice spread still ≥ ~2×? (`pnpm balance` gets extended for the pot economy.)

---

## 3 · Milestones

Each one ships to the live URL and is independently playtestable.

### M1 — Feel (the game becomes good to touch)
*No design changes; pure responsiveness and feedback. All items from audit v3 Phase 1.*

- [ ] Remove the 120ms CSS transition on player movement; transform-based positioning
- [ ] Floating "+250" score text at the catch point; squash-and-stretch on catch
- [ ] Screen shake + flash on fumble; catch-flash on proteins
- [ ] Count-in "3·2·1·STACK!" · "TIME!" freeze-beat · phase slams ("RUSH!")
- [ ] Shuffle-bag spawner: never two hazards in a row, no protein droughts
- [ ] Denser RUSH (~420ms spawns) — re-verify fairness with the sim
- [ ] Hazard visual grammar (green tint + stink lines) and DODGE styling in NEXT UP
- [ ] Item shadows on the tray line (makes the catch zone legible)
- [ ] Mute button · live score formatting · mobile **drag** control + haptics

**Done when:** movement feels instant, every catch visibly pays, a fumble physically hurts, and
nobody catches a hazard because it looked like food.

### M2 — The Bank (the game becomes a game)
*The core-loop rebuild from §2. The big one.*

- [ ] Pot economy in `round.ts`; pot display beside the tower, ticking per catch
- [ ] Lid as randomly-timed bank; height-weighted odds; pot→score fly animation
- [ ] Collapse at 12: wobble from 8, character panic, comic avalanche, pot spill
- [ ] **Hero tower** — the sandwich renders big, layered, distinct ingredients, wobble animation
  (it is the progress bar, the risk gauge, and the spectacle: one asset, three jobs)
- [ ] Unbanked pot lost at TIME! (+ "BANK IT!" callout in the last 10s)
- [ ] Simulator extended to the pot economy; tuning iterated until the strategy table in §2 holds
- [ ] Teach by playing: first 8s hazard-free; first-ever lid gets a slow-motion beat + one-line
  callout ("CATCH THE LID = BANK YOUR STACK!")

**Done when:** a spectator watching someone play at 9 layers with a lid on screen *feels* the
decision — and the sim proves greed is rational but dangerous.

### M3 — The Loop closers (the game becomes addictive)
- [ ] Results sequence: score count-up → rank reveal → **NEW #1 TODAY** celebration
- [ ] Arcade 3-initial entry for board places (replaces every row saying "YOU")
- [ ] Personal best + delta on results ("beat your last run by 4,200")
- [ ] Attract mode: idle 20s on start → autoplay demo with PRESS-TO-PLAY overlay
- [ ] Character reactions: Captain Tuna flinches on fumble, Mami cheers on bank
- [ ] Music loop (tension rises in RUSH) + lid-incoming sting + count-in sound
- [ ] Repeat players skip the how-to (straight to count-in after first play of a session)

**Done when:** a player who just missed the board immediately plays again without being asked.

### M4 — The Look (the game becomes clean)
- [ ] Recompose all screens for 16:9: wide lane, HUD rails narrow and purposeful (625's grammar),
  giant clock, zero overlaps, zero dead zones, characters uncut
- [ ] Cool/calm lane field (temperature separation — warm food on cool ground); decoration
  moved out of the play area
- [ ] Type scale for TV distance (3 sizes; nothing that matters under ~18px)
- [ ] Transparent logo + clean character cut-outs from the brand library
- [ ] Favicon + og tags · fullscreen button · pause
- [ ] Strip Babylon + the inlined manus runtime (payload → ~0.5MB) · fix `pnpm start` on Windows

**Done when:** a screenshot of any screen looks like a finished product, and cold load on venue
Wi-Fi is near-instant.

### Parallel track — Art (content, not code; can start today)
- The 7 placeholder ingredients + lid + 3 hazards as photographed-style cut-outs per
  `FALLING_ASSET_SYSTEM.md` (swap-in is one line each in `Ingredient.tsx`)
- The deli-counter background (the current one never existed — a failed generation)
- Tower layer art: each ingredient as a *stackable layer* sprite (needed by M2's hero tower)
- Collapse/avalanche and character-reaction frames (needed by M2/M3)

---

## 4 · Open decisions (Elie)

1. **Shared leaderboard?** Per-device is fine for one cabinet; multiple screens or a multi-day
   event needs a tiny backend (an hour of work, needs a decision, not a design).
2. **Initials entry** — planned in M3; confirm you want arcade-style 3 letters.
3. **Kids difficulty** — novices currently survive the full round 39% of the time. One number in
   `config.ts` makes it gentler if the event skews young.
4. **Art production** — who makes the ingredient/tower/background art, and when. Code stops being
   the bottleneck after M2.

---

## 5 · Order of work and why

**M1 → M2 → M3 → M4.** Feel first because every playtest after it is more informative; the bank
second because it changes what we're tuning and it's the biggest risk (if the gamble isn't fun, we
want to know before polishing anything around it); loop-closers third because they multiply
whatever the game is by then; looks last because recomposing screens twice is waste.

The art track runs in parallel throughout — it gates nothing until M2's hero tower, which can ship
with styled placeholder layers if needed.
