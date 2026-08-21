/**
 * Every image the game loads at runtime.
 *
 * Ingredients are the approved 12-render package, trimmed and sized for play
 * (full-resolution masters live in `design-references/approved-renders/`). Characters are
 * the clean transparent cut-outs from the brand library.
 *
 * Paths are built from Vite's BASE_URL so the game works whether it is served from the
 * root of a domain or from a sub-path.
 */
const base = import.meta.env.BASE_URL;

export const gameAssets = {
  logo: `${base}assets/fatsandwich-logo-purple-burst.jpeg`,
  player: `${base}assets/the-fat-sandwich-player.png`,
  pastramiMami: `${base}assets/pastrami-mami-host.png`,
  captainTuna: `${base}assets/captain-tuna-scorekeeper.png`,
  superStack: `${base}assets/super-stack-icon.png`,

  // The approved ingredient renders.
  ingTurkey: `${base}assets/ing/turkey.png`,
  ingPastrami: `${base}assets/ing/pastrami.png`,
  ingRoast: `${base}assets/ing/roast.png`,
  ingBacon: `${base}assets/ing/bacon.png`,
  ingLettuce: `${base}assets/ing/lettuce.png`,
  ingTomato: `${base}assets/ing/tomato.png`,
  ingOnion: `${base}assets/ing/onion.png`,
  ingPickle: `${base}assets/ing/pickle.png`,
  ingPepper: `${base}assets/ing/pepper.png`,
  ingLid: `${base}assets/ing/lid.png`,
  ingBase: `${base}assets/ing/base.png`,
  ingSauce: `${base}assets/ing/sauce.png`,
} as const;
