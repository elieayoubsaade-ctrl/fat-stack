/**
 * The player: the chosen character, the tray in their hands, and the sandwich growing on
 * it. This is the star of the screen — like the reference game, the sandwich is built in
 * front of the character and gets comically tall.
 *
 * Everything here is presentation. `x` is the round's `playerX` on the 0–100 grid; the
 * round decides catches, this component only shows them.
 */
import { gameAssets } from "./assets";
import type { Character } from "./characters";
import { TOWER, type ItemKind } from "./config";
import { artFor } from "./Ingredient";

export type PlayerMood = "idle" | "catch" | "cheer" | "panic" | "stunned";

export type PlayerProps = {
  character: Character;
  x: number;
  /** -1 left, 0 still, 1 right. */
  direction: number;
  layers: ItemKind[];
  pot: number;
  lidLive: boolean;
  bankValue: number;
  heat: "calm" | "warm" | "hot";
  mood: PlayerMood;
  /** Bump to replay the mood animation. */
  moodKey: number;
  debris: { id: number; kind: ItemKind; dx: number; rot: number }[];
};

const fmt = (n: number) => n.toLocaleString("en-US");

export default function Player(p: PlayerProps) {
  const lean = p.character.lean ? p.direction * 6 : 0;
  const wobble = Math.max(0, p.layers.length - TOWER.wobbleAt + 1);

  return (
    <div className="player" style={{ left: `${p.x}%` }}>
      <div key={p.moodKey} className={`player-body mood-${p.mood}`} style={{ ["--lean" as string]: `${lean}deg` }}>
        <img className="player-art" src={p.character.art} alt={p.character.name} draggable={false} />
        {p.mood === "panic" && <span className="sweat" />}
      </div>

      <div className="tray" style={{ bottom: `${(1 - p.character.trayY) * 100}%` }}>
        <svg className="tray-art" viewBox="0 0 200 46" aria-hidden="true">
          <ellipse cx="100" cy="23" rx="96" ry="19" fill="#d9d4e3" stroke="#111" strokeWidth="5" />
          <ellipse cx="100" cy="18" rx="78" ry="11" fill="#f2eff7" />
        </svg>

        <div className={`tower heat-${p.heat}`} style={{ ["--wobble" as string]: wobble }}>
          <img className="tower-base" src={gameAssets.ingBase} alt="" />
          {p.layers.map((kind, i) => (
            <img
              key={`${kind}-${i}`}
              className="tower-layer"
              src={artFor(kind)}
              alt=""
              style={{ transform: `rotate(${((i * 37) % 9) - 4}deg)`, zIndex: i + 2 }}
            />
          ))}
        </div>

        {p.pot > 0 && (
          <div className={`pot-chip ${p.lidLive ? "lid-live" : ""}`} style={{ bottom: `calc(var(--layer-px) * ${p.layers.length + 2.2})` }}>
            <span>POT</span>
            <b>{fmt(p.pot)}</b>
            {p.lidLive && <i>LID = {fmt(p.bankValue)}</i>}
          </div>
        )}
        {p.layers.length > 0 && (
          <div className={`height-chip heat-${p.heat}`} style={{ bottom: `calc(var(--layer-px) * ${p.layers.length + 2.2})` }}>
            {p.layers.length}/{TOWER.collapseAt}
          </div>
        )}
      </div>

      {p.debris.map((d) => (
        <div key={d.id} className="debris" style={{ ["--dx" as string]: `${d.dx}%`, ["--rot" as string]: `${d.rot}deg` }}>
          <img src={artFor(d.kind)} alt="" />
        </div>
      ))}
    </div>
  );
}
