/**
 * The MOTB night scene — the world the game lives in.
 *
 * Drawn entirely in SVG and CSS from the real kiosk (see
 * `Fat Sandwich MOTB Pitch/assets/truck.jpg`): an orange box, a purple recessed panel,
 * the black service window, the grid of red dots and the red burst. The purple panel is
 * the HATCH — ingredients fall out of it — so its horizontal extent must match
 * `ROUND.hatch` (22%–78% of the stage). The kiosk SVG spans the full stage width on a
 * 1000-unit viewBox, so the panel runs from x=220 to x=780.
 *
 * `hatchFlash` and `bank` are counters: each increment replays an animation.
 */
import { gameAssets } from "./assets";
import { ROUND } from "./config";

/** Fixed star field — no randomness in render, so the sky never shimmers on re-render. */
const STARS: [number, number, number][] = [
  [3, 6, 2],
  [8, 14, 3],
  [12, 4, 2],
  [17, 9, 2],
  [21, 16, 3],
  [26, 3, 2],
  [30, 11, 2],
  [34, 7, 3],
  [39, 15, 2],
  [43, 5, 2],
  [47, 12, 3],
  [52, 8, 2],
  [56, 3, 2],
  [60, 14, 3],
  [64, 6, 2],
  [69, 10, 2],
  [73, 4, 3],
  [77, 13, 2],
  [81, 7, 2],
  [86, 16, 3],
  [90, 5, 2],
  [94, 11, 2],
  [97, 3, 3],
  [5, 22, 2],
  [15, 24, 2],
  [24, 20, 2],
  [37, 23, 3],
  [49, 19, 2],
  [58, 24, 2],
  [71, 21, 2],
  [83, 23, 3],
  [93, 20, 2],
  [10, 30, 2],
  [28, 28, 2],
  [45, 31, 2],
  [62, 29, 2],
  [79, 31, 2],
  [95, 28, 2],
  [19, 34, 2],
  [66, 35, 2],
];

const BULBS = Array.from({ length: 25 }, (_, i) => i * 4 + 2);
/** Two sagging wires; the bulbs hang from the curve. */
function wireY(xPct: number, sag: number, lift: number) {
  const t = xPct / 100;
  return lift + sag * 4 * t * (1 - t);
}

const DOTS = Array.from({ length: 15 }, (_, i) => ({
  cx: 254 + (i % 5) * 26,
  cy: 178 + Math.floor(i / 5) * 17,
}));

const BURST =
  "M640,230 L658,262 L696,246 L690,286 L730,292 L704,318 L732,346 L694,350 L698,392 L662,372 L644,408 L628,372 L590,392 L596,350 L556,346 L584,318 L558,292 L598,286 L592,246 L630,262 Z";

export default function Scene({
  hatchFlash = 0,
  bank = 0,
}: {
  hatchFlash?: number;
  bank?: number;
}) {
  const hatchLeft = ROUND.hatch.left * 10;
  const hatchWidth = (ROUND.hatch.right - ROUND.hatch.left) * 10;

  return (
    <div className="scene" aria-hidden="true">
      <div className="sky">
        {STARS.map(([x, y, s], i) => (
          <span
            key={i}
            className="star"
            style={{ left: `${x}%`, top: `${y}%`, ["--s" as string]: `${s}px` }}
          />
        ))}
      </div>

      <svg
        key={`lights-${bank}`}
        className={`lights ${bank > 0 ? "flash" : ""}`}
        viewBox="0 0 100 30"
        preserveAspectRatio="none"
      >
        <path
          className="wire"
          d={`M0,${wireY(0, 7, 3)} Q50,${wireY(50, 7, 3) + 7} 100,${wireY(100, 7, 3)}`}
          vectorEffect="non-scaling-stroke"
        />
        <path
          className="wire"
          d={`M0,${wireY(0, 9, 12)} Q50,${wireY(50, 9, 12) + 9} 100,${wireY(100, 9, 12)}`}
          vectorEffect="non-scaling-stroke"
        />
        {BULBS.map(x => (
          <ellipse
            key={`a${x}`}
            className="bulb"
            cx={x}
            cy={wireY(x, 7, 3) + 2.2}
            rx={0.55}
            ry={1.4}
          />
        ))}
        {BULBS.map(x => (
          <ellipse
            key={`b${x + 2}`}
            className="bulb"
            cx={x + 2}
            cy={wireY(x + 2, 9, 12) + 2.2}
            rx={0.55}
            ry={1.4}
          />
        ))}
      </svg>

      <svg
        className="kiosk"
        viewBox="0 0 1000 250"
        preserveAspectRatio="xMidYMin meet"
      >
        <defs>
          <linearGradient id="kiosk-inner" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#0b0212" />
            <stop offset="1" stopColor="#2a0b3d" />
          </linearGradient>
          <filter id="kiosk-shadow" x="-5%" y="-5%" width="110%" height="130%">
            <feDropShadow
              dx="0"
              dy="8"
              stdDeviation="7"
              floodColor="#000"
              floodOpacity="0.5"
            />
          </filter>
        </defs>

        {/* Roof marquee posts — the board itself is HTML (see .marquee) so the web font lays out properly */}
        <rect x="482" y="30" width="8" height="18" fill="var(--ink)" />
        <rect x="510" y="30" width="8" height="18" fill="var(--ink)" />

        {/* Body */}
        <g filter="url(#kiosk-shadow)">
          <rect
            x="110"
            y="46"
            width="780"
            height="200"
            rx="7"
            fill="var(--orange)"
            stroke="var(--ink)"
            strokeWidth="5"
          />
          <rect x="113" y="232" width="774" height="12" fill="#c9520f" />
        </g>

        {/* The real logo */}
        <image href={gameAssets.logo} x="330" y="54" width="340" height="40" preserveAspectRatio="xMidYMid meet" />

        {/* Hatch — the purple recessed panel. Everything falls out of here. */}
        <rect
          x={hatchLeft}
          y="96"
          width={hatchWidth}
          height="126"
          rx="4"
          fill="url(#kiosk-inner)"
          stroke="var(--ink)"
          strokeWidth="4"
        />
        <rect
          x={hatchLeft + 8}
          y="104"
          width={hatchWidth - 16}
          height="112"
          fill="var(--purple-mid)"
        />
        <rect
          key={`glow-${hatchFlash}`}
          className={`hatch-glow ${hatchFlash > 0 ? "on" : ""}`}
          x={hatchLeft + 8}
          y="104"
          width={hatchWidth - 16}
          height="112"
          fill="var(--gold)"
        />

        {/* Service window */}
        <rect
          x="244"
          y="114"
          width="130"
          height="50"
          rx="3"
          fill="#0a0510"
          stroke="var(--ink)"
          strokeWidth="5"
        />
        <rect x="251" y="121" width="116" height="5" fill="#3a2650" />

        {/* Red dots */}
        {DOTS.map((d, i) => (
          <circle key={i} cx={d.cx} cy={d.cy} r="6" fill="var(--red)" />
        ))}

        {/* Burst */}
        <path
          d={BURST}
          fill="var(--red)"
          stroke="#9a0f0f"
          strokeWidth="3"
          transform="translate(330,30) scale(0.46)"
        />
      </svg>

      <svg className="crowd" viewBox="0 0 1000 100" preserveAspectRatio="none">
        <path
          d="M0,100 L0,70 C20,70 25,40 45,40 C62,40 65,62 82,62 C95,62 100,30 120,30 C140,30 142,60 160,60 C178,60 180,44 200,44 C218,44 222,72 240,72 C260,72 262,36 285,36 C305,36 310,66 330,66 C345,66 350,28 372,28 C395,28 398,58 418,58 C432,58 436,42 455,42 C475,42 478,70 500,70 C520,70 522,34 545,34 C565,34 568,62 590,62 C608,62 610,46 630,46 C650,46 652,74 672,74 C690,74 692,32 715,32 C735,32 740,60 760,60 C778,60 780,40 800,40 C820,40 822,68 845,68 C862,68 866,30 888,30 C908,30 912,58 932,58 C950,58 955,44 975,44 C990,44 995,70 1000,70 L1000,100 Z"
          fill="#0d0416"
          stroke="#8a3fc4"
          strokeWidth="3"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      <div className="ground" />
    </div>
  );
}
