---
name: fatsandwich-brand
description: "Fatsandwich brand design system for generating on-brand images, social posts, menu graphics, packaging mockups, and any visual asset for the Fatsandwich restaurant brand. MUST read before creating any image, graphic, or visual content for Fatsandwich. Contains the complete visual identity: logo rules, color palette, character roster, food photography style, and prompt-crafting framework for AI image generation."
---

# Fatsandwich Brand Design Skill

## Brand Overview

Fatsandwich is a **character-led, pop-art-inspired sandwich brand** built around a cast of illustrated menu personalities. The visual identity is deliberately loud, playful, and graphic — drawing from comic-book explosions, sticker culture, underground zines, and 90s/early-2000s cartoon energy. It is not a quiet deli; it is a sandwich universe.

**Brand essence:** Indulgence with personality. Oversized cravings, comfort food, cult-brand energy.

**Tone:** Short, cheeky, self-aware, conversational. Confident and slightly chaotic, always warm and inviting.

**Social handle / contact:** @fat.sandwich / info@fatsandwich.me

---

## Color Palette

| Role | Color | Hex |
|---|---|---|
| **Brand Purple** (primary background / logo fill) | Medium violet-purple | `#7B5EA7` approx |
| **Brand Red** (wordmark / type) | Saturated comic red | `#E8191A` approx |
| **Black** (outlines, shadows, drop shadows) | Pure black | `#000000` |
| **White** (backgrounds, negative space) | Clean white | `#FFFFFF` |
| **Mint / Seafoam** (Captain Tuna accent) | Light mint green | `#A8E6C8` approx |
| **Orange** (Runny Sunny, action accents) | Vivid orange | `#F26522` approx |
| **Sky Blue** (Chop-Chop, Egghead accents) | Bright sky blue | `#4DA6E8` approx |
| **Yellow** (starburst highlights) | Warm yellow | `#F5D020` approx |

**Primary combination:** Purple background + red wordmark + black outline. This is the hero brand signature.

---

## Logo System

The **hero mark** is the "FAT SANDWICH" wordmark set in thick, rounded, comic-style lettering in saturated red, placed inside an irregular jagged starburst/burst shape filled with brand purple, with a heavy black outline/drop shadow.

- The burst shape is asymmetric and spiky — not a clean circle or star
- The wordmark sits centered inside the burst, stacked on two lines: "FAT" over "SANDWICH"
- The black shadow gives the logo a 3D sticker-like depth
- On packaging, the logo appears large and centered with no competing elements

**Reference file:** `templates/logo-purple-burst.jpeg`, `templates/craft-paper-bag.pdf`

---

## Background / Pattern System

The brand uses a **repeating all-over starburst doodle pattern** as a background texture:

- Multiple sizes of jagged comic explosion/starburst outlines scattered randomly across a white background
- Drawn in a hand-sketched style with slightly imperfect lines
- In the red colorway: outlines are drawn in dark red/crimson on white
- In the black colorway: outlines are black on white
- Mini versions of the logo wordmark (FAT SANDWICH in red) can be scattered throughout the pattern
- A pill/stadium-shaped rounded rectangle is sometimes placed over the pattern as a content frame

**Reference file:** `templates/pattern-background.jpeg`

---

## Character Roster

Each character represents a menu item and has its own personality, color world, and illustration style. All characters are hand-drawn, imperfect, slightly absurd, and animated with limbs and expressions.

| Character | Visual Description | Background Color | Represents |
|---|---|---|---|
| **The Fat Sandwich** | Anthropomorphic hoagie roll with eyes and tiny limbs, slightly tilted | Purple | Main mascot / brand hero |
| **Captain Tuna** | Tuna fish wearing a captain's hat, mounted on a round brown plaque | Mint green | Tuna sandwich |
| **Pastrami Mami** | Retro-glamorous woman in pink/red dress with kitchen tools (fork + knife), flowing auburn hair | Purple | Pastrami sandwich |
| **PB&J (Peanut Butter Jelly)** | Duo: a tall brown peanut wearing a red cap + a round purple jelly blob with spiky hair, holding hands | Purple/blue | PB&J sandwich |
| **Egghead** | Egg-shaped bald man in office shirt and tie, carrying briefcase and coffee mug, deadpan expression | Sky blue | Egg sandwich |
| **Lil Sprout** | Small smiling green bean sprout with a tiny leaf on top, stubby limbs | Purple | Veggie/fresh option |
| **Runny Sunny** | Cool sun character with sunglasses, backwards pink cap, and roller skates, waving | Orange | Sunny-side egg / breakfast |
| **Chop-Chop** | Two hands chopping/clapping together with a yellow starburst impact, no body | Sky blue | Speed / kitchen action |
| **Birdman** | Confident turkey with sunglasses carrying a "TOP SECRET" briefcase | Tan/peach | Turkey sandwich |
| **Uncle Kraut** | Pastrami-themed character with sauerkraut/German deli personality | Purple | Reuben / kraut variant |

**Character files (with background):** `templates/characters/`
**Character files (transparent PNG):** `templates/characters/no-bg/`

---

## Food Photography Style

All product photography follows a **consistent studio format**:

- **Background:** Pure white or very light off-white, clean and minimal
- **Lighting:** Bright, high-key studio lighting with a single soft shadow cast to the lower-left
- **Angle:** Three-quarter front view, slightly elevated — shows the full length of the sandwich and the layered fillings
- **Prop:** A single pickle spear placed to the lower-right of the sandwich, slightly angled
- **Bread:** Dutch crunch / tiger roll bread (crackled golden-brown crust) used consistently across all sandwiches
- **Filling presentation:** Generous, overflowing, photogenic — ingredients visible and identifiable
- **No text, no logo** in the product shot itself — the photo is clean

**Food photo reference files:** `templates/food-photos/`

| File | Sandwich |
|---|---|
| `pastrami-mami.webp` | Pastrami with lettuce, tomato, red onion, pepperoncini |
| `chop-chop.webp` | Chopped beef with cheddar, pickles, tomato, ketchup, lettuce |
| `birdman.webp` | Turkey with bacon, avocado, red onion, tomato, lettuce |
| `uncle-kraut.webp` | Pastrami with Swiss cheese, sauerkraut, thousand island |
| `captain-tuna.webp` | Tuna with pickles, tomato, red onion, lettuce |
| `roast-beast.jpg` | Roast beef with lettuce, red onion, pepperoncini, relish |

---

## Image Generation Framework

### Task Routing

| Task Type | Approach |
|---|---|
| Social post with food photo + brand overlay | Composite: use food photo as base, add brand graphic elements |
| Character illustration (new pose/scene) | AI generation with character description from roster above |
| Background / pattern | AI generation using doodle starburst pattern description |
| Menu graphic | Food photo + character + purple burst logo lockup |
| Packaging mockup | Logo on craft paper / solid color surface |
| Campaign poster | Character + food photo + burst background + wordmark |

### Prompt Framework

**For character-based images:**
```
[Character name and description from roster], hand-drawn cartoon illustration style,
thick black outlines, flat color fills, slightly imperfect line quality,
90s cartoon energy, [character's background color] solid background,
centered composition, [character's name] text in rounded comic lettering below
```

**For brand scene / social post:**
```
[Scene description], Fatsandwich brand aesthetic, pop-art comic style,
purple and red color palette, jagged starburst graphic elements,
bold flat colors, thick black outlines, energetic and playful,
white background with hand-drawn doodle starbursts
```

**For food photography (new product):**
```
[Sandwich name] sandwich on Dutch crunch tiger roll bread, overflowing with [ingredients],
studio product photography, pure white background, bright high-key lighting,
soft shadow to lower left, three-quarter front angle, pickle spear to the right,
clean minimal food photography, professional commercial food shot
```

**For composite social media posts:**
- Use the food photo as the hero element
- Add the purple burst logo in a corner or as an overlay
- Use the starburst doodle pattern as background texture
- Keep text minimal and in the brand red/black comic style

---

## Design Do's and Don'ts

**Do:**
- Use purple as the primary brand background color
- Use the burst/starburst motif as a graphic device
- Keep illustration style hand-drawn and slightly imperfect
- Pair loud graphic moments with clean white space
- Use characters to represent specific menu items
- Keep food photography clean, white-background, and consistent

**Don't:**
- Use polished, corporate, or minimalist design language
- Mix too many colors in a single composition without a dominant anchor
- Use the starburst pattern AND the characters AND the logo all at full intensity simultaneously — choose a hero element
- Use generic food photography backgrounds (wood, marble, dark moody)
- Make characters look too clean or digitally perfect — the hand-drawn quality is intentional

---

## Reference Files Quick Guide

| File | Use For |
|---|---|
| `templates/logo-purple-burst.jpeg` | Logo reference and color matching |
| `templates/pattern-background.jpeg` | Background pattern reference |
| `templates/craft-paper-bag.pdf` | Packaging application reference |
| `templates/characters/*.jpeg` | Character reference with backgrounds |
| `templates/characters/no-bg/*.png` | Character cutouts for compositing |
| `templates/food-photos/*.webp/.jpg` | Food photography style reference |

For detailed prompt examples by use case, see `references/prompt-examples.md`.
For full character descriptions, see `references/character-guide.md`.
