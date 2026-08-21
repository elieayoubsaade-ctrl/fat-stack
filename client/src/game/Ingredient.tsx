/**
 * One falling object.
 *
 * This is the single place where art is swapped in. Any item listed in `ART` renders as
 * a real photographed cut-out; anything not listed falls back to a CSS placeholder shape
 * so the game is playable and readable while the artwork is being produced.
 *
 * To add finished art: drop the file in `client/public/assets/`, add it to
 * `client/src/game/assets.ts`, then add one line to `ART` below. Nothing else changes.
 */
import { gameAssets } from "./assets";
import { ITEMS, type ItemKind } from "./config";

const ART: Partial<Record<ItemKind, string>> = {
  turkey: gameAssets.turkey,
  pastrami: gameAssets.pastrami,
  roast: gameAssets.roastBeef,
  // TODO: bacon, lettuce, tomato, onion, pickle, pepper, lid, sauce, jar, wilted
};

/** True for items still using a placeholder rather than finished artwork. */
export function isPlaceholder(kind: ItemKind) {
  return !ART[kind];
}

export default function Ingredient({ kind }: { kind: ItemKind }) {
  const art = ART[kind];
  const label = ITEMS[kind].label;

  if (art) {
    return <img className="ing-art" src={art} alt={label} draggable={false} />;
  }

  return <span className={`ing ing-${kind}`} role="img" aria-label={label} />;
}
