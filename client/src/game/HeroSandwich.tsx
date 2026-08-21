/** A closed sandwich drawn at its real height — the trophy on the results screen. */
import { gameAssets } from "./assets";
import type { ItemKind } from "./config";
import { artFor } from "./Ingredient";

export default function HeroSandwich({ layers }: { layers: ItemKind[] }) {
  return (
    <div className="hero-sandwich" aria-label={`${layers.length}-layer sandwich`}>
      <div className="tower">
        <img className="tower-base" src={gameAssets.ingBase} alt="" />
        {layers.map((kind, i) => (
          <img key={`${kind}-${i}`} className="tower-layer" src={artFor(kind)} alt="" style={{ transform: `rotate(${((i * 37) % 9) - 4}deg)`, zIndex: i + 2 }} />
        ))}
        {layers.length > 0 && <img className="tower-lid" src={gameAssets.ingLid} alt="" style={{ zIndex: layers.length + 3 }} />}
      </div>
    </div>
  );
}
