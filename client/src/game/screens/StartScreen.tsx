import { gameAssets } from "../assets";

type Props = {
  hasPlayed: boolean;
  topScore: number;
  best: number;
  onStart: () => void;
};

const fmt = (n: number) => n.toLocaleString("en-US");

export default function StartScreen({ hasPlayed, topScore, best, onStart }: Props) {
  return (
    <section className="screen-overlay start-screen" aria-label="Start screen">
      <div className="start-center">
        <img className="start-logo" src={gameAssets.logo} alt="Fat Sandwich" />
        <h1>
          STACK IT HIGH.
          <br />
          <em>BANK</em> IT BIG.
        </h1>
        <p>Catch what falls out of the kiosk. Grab the tiger lid to bank your pot. Don’t let it topple.</p>
        <button className="red-button big-button breathe" onClick={onStart}>
          {hasPlayed ? "PLAY AGAIN" : "PRESS TO PLAY"}
        </button>
        <div className="start-hint">
          <b>◀ ▶</b> MOVE <span>•</span> <b>●</b> START
        </div>
        <div className="stat-row">
          <div className="stat-pill">
            <span>TODAY’S TOP STACK</span>
            <b>{fmt(topScore)}</b>
          </div>
          {best > 0 && (
            <div className="stat-pill red">
              <span>YOUR BEST</span>
              <b>{fmt(best)}</b>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
