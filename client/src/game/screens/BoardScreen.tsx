import type { BoardEntry } from "../api";

type Props = { entries: BoardEntry[]; cutoff: number; offline: boolean; onPlay: () => void };

const fmt = (n: number) => n.toLocaleString("en-US");

export default function BoardScreen({ entries, cutoff, offline, onPlay }: Props) {
  return (
    <section className="screen-overlay leaderboard-screen" aria-label="High score screen">
      <div className="board-center">
        <h2>TODAY’S TOP STACKS</h2>
        <div className="score-list">
          {entries.length === 0 && <div className="board-empty">NO SCORES YET TODAY — BE FIRST</div>}
          {entries.map((entry, index) => (
            <div
              className={`rank-${index + 1} ${entry.claimed ? "" : "unclaimed"}`}
              key={`${entry.rank}-${entry.score}-${index}`}
            >
              <i>{entry.rank}</i>
              <span>{entry.name}</span>
              <b>{fmt(entry.score)}</b>
            </div>
          ))}
        </div>
        <p>
          {cutoff > 0 ? `SCORE ${fmt(cutoff + 1)}+ TO JOIN THE BOARD` : "ANY SCORE JOINS THE BOARD"}
          {offline && <em className="board-offline"> · OFFLINE — SHOWING LAST KNOWN</em>}
        </p>
        <div className="merch-note">CLAIM YOUR MERCH · SHOW STAFF YOUR SCORE</div>
        <button className="red-button big-button" onClick={onPlay}>
          PLAY
        </button>
      </div>
    </section>
  );
}
