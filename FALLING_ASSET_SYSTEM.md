# Super Stack Falling Asset System

## Creative Rule

Every falling object is a **recognisable, generously styled food ingredient from the Super Stack**, presented as a photographed Fatsandwich-style cut-out with an irregular cream sticker edge and a thin hand-drawn black outline. The playfield must never use geometric substitutes, letter glyphs, generic circles, or emoji.

| Asset group | Exact falling items | Gameplay use | Visual treatment |
|---|---|---|---|
| **Proteins** | Folded turkey, peppered pastrami folds, roast-beef ribbons | Primary score catches; visibly larger, with the strongest weight and landing presence | Close-up, food-real cut-outs at a three-quarter angle; each object reads at 80–120 px on a 16:9 TV |
| **Toppings** | Bacon-bit scatter, iceberg lettuce, tomato slice pair, red-onion rings, pickle chips, pepperoncini | Fast supporting catches that make the stack feel full and colorful | Separate cut-outs with distinct silhouettes and slight rotation variance, never single-color tokens |
| **Bread** | Tiger-crunch bottom roll on the tray and a rare tiger-crunch top lid | The base is permanent; the top lid is a special finish catch that closes a complete Super Stack | Golden crackled Dutch-crunch texture, thick outer silhouette, visibly consistent with the menu bread |
| **Fumbles** | Tipped sauce cup, whole pickle jar, wilted lettuce clump | Avoidable objects that remove a life; no generic bomb imagery | Clearly non-stackable deli mishaps, marked with a small red comic cross only after collision |

## Interaction Hierarchy

The player begins with the tiger-crunch bottom roll. Protein assets are the heaviest, slowest, and highest-value catches. Toppings fall more quickly and build the visible middle of the stack. The top tiger-crunch lid appears only after a protein-and-veg sequence and turns the completed sandwich into a high-value Super Stack. Fumbles remain deliberately rarer than good ingredients so the game stays generous and event-friendly.

## Proposed First-Draft Values

| Object | Points | Fall tempo | Collision width |
|---|---:|---|---|
| Turkey, pastrami, roast beef | 250 | Slow | Wide |
| Bacon bits | 125 | Medium | Medium |
| Lettuce, tomato, onion, pickles, pepperoncini | 100 | Fast | Medium |
| Tiger-crunch lid | 750 + completion bonus | Slow, rare | Wide |
| Sauce cup, pickle jar, wilted lettuce | Fumble | Medium | Medium |

The next screen revision will use these food-real cut-outs as the only falling objects. The generated boards below are for visual approval, not a direct production sprite sheet; the approved objects will subsequently be separated into individual transparent browser assets.
