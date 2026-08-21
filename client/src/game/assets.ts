/**
 * Every image the game loads at runtime.
 *
 * All are sized to roughly twice the largest size they are ever drawn at — the
 * full-resolution masters live in `design-references/full-resolution-originals/`.
 *
 * There is deliberately no deli-counter background here: the file that was meant to
 * provide it turned out to be a failed-generation placeholder, so the app paints a
 * brand-coloured ground in CSS until the real environment art exists.
 *
 * Paths are built from Vite's BASE_URL so the game works whether it is served from the
 * root of a domain or from a sub-path such as /fat-stack/.
 */
const base = import.meta.env.BASE_URL;

export const gameAssets = {
  logo: `${base}assets/fatsandwich-logo-purple-burst.jpeg`,
  player: `${base}assets/the-fat-sandwich-player.png`,
  pastramiMami: `${base}assets/pastrami-mami-host.png`,
  captainTuna: `${base}assets/captain-tuna-scorekeeper.png`,
  superStack: `${base}assets/super-stack-icon.png`,
  deliPaper: `${base}assets/super-stack-deli-paper-bg.jpg`,
  turkey: `${base}assets/turkey-ingredient-sticker.png`,
  pastrami: `${base}assets/pastrami-ingredient-sticker.png`,
  roastBeef: `${base}assets/roast-beef-ingredient-sticker.png`,
} as const;
