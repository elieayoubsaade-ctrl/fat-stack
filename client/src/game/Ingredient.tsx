/**
 * One game item, drawn with its approved render.
 *
 * Every falling item now has final approved artwork (the 12-render package). Hazards
 * additionally get a danger treatment from CSS (`.falling-item.hazard`) so nothing
 * dangerous can ever be mistaken for food — the visual grammar rule.
 */
import { gameAssets } from "./assets";
import { ITEMS, type ItemKind } from "./config";

const ART: Record<ItemKind, string> = {
  turkey: gameAssets.ingTurkey,
  pastrami: gameAssets.ingPastrami,
  roast: gameAssets.ingRoast,
  bacon: gameAssets.ingBacon,
  lettuce: gameAssets.ingLettuce,
  tomato: gameAssets.ingTomato,
  onion: gameAssets.ingOnion,
  pickle: gameAssets.ingPickle,
  pepper: gameAssets.ingPepper,
  lid: gameAssets.ingLid,
  sauce: gameAssets.ingSauce,
};

export function artFor(kind: ItemKind) {
  return ART[kind];
}

export default function Ingredient({ kind }: { kind: ItemKind }) {
  return <img className="ing-art" src={ART[kind]} alt={ITEMS[kind].label} draggable={false} />;
}
