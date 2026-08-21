/**
 * The in-round HUD: sign-boards pinned to the corners of the stage, never over the fall
 * lane (x 22–78%, y 30–90%). The only thing inside that box is the NEXT UP sign, which
 * sits on the top edge of the hatch because that is where the next item comes from.
 */
import Ingredient from "./Ingredient";
import { ITEMS, ROUND, type ItemKind } from "./config";

export type HudProps = {
  score: number;
  banks: number;
  fumbles: number;
  seconds: number;
  phaseLabel: string;
  urgent: boolean;
  combo: number;
  multiplier: number;
  topScore: number;
  /** Bump to replay the score pulse. */
  scorePulse: number;
};

const fmt = (n: number) => n.toLocaleString("en-US");

function SauceCup({ tipped }: { tipped: boolean }) {
  return (
    <svg
      className={`cup ${tipped ? "tipped" : ""}`}
      viewBox="0 0 40 40"
      aria-hidden="true"
    >
      <path
        d="M6 10 H34 L30 36 H10 Z"
        fill="#fff4e3"
        stroke="#111"
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <rect
        x="4"
        y="6"
        width="32"
        height="7"
        rx="2"
        fill="#e02b2b"
        stroke="#111"
        strokeWidth="3"
      />
      <path
        d="M13 18 Q20 22 27 18"
        stroke="#e02b2b"
        strokeWidth="3"
        fill="none"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default function Hud(p: HudProps) {
  return (
    <>
      <div className="board board-banked">
        <span className="eyebrow">BANKED</span>
        <b key={p.scorePulse} className="pulse-on-mount">
          {fmt(p.score)}
        </b>
        <small>
          FAT STACKS <em>{p.banks}</em>
        </small>
      </div>

      <div className={`board board-clock ${p.urgent ? "urgent" : ""}`}>
        <b>{p.seconds.toString().padStart(2, "0")}</b>
        <i>{p.phaseLabel}</i>
        <div
          className="cups"
          aria-label={`${p.fumbles} of ${ROUND.maxFumbles} fumbles`}
        >
          {Array.from({ length: ROUND.maxFumbles }, (_, i) => (
            <SauceCup key={i} tipped={i < p.fumbles} />
          ))}
        </div>
      </div>

      <div className="combo-meter">
        <b>x{p.multiplier}</b>
        <div className="combo-bar">
          <i style={{ transform: `scaleY(${Math.min(1, p.combo * 0.06)})` }} />
        </div>
        <span>COMBO</span>
      </div>

      <div className="board board-top">
        <span className="eyebrow">TODAY’S TOP</span>
        <b>{fmt(p.topScore)}</b>
      </div>
    </>
  );
}
