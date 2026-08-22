import type { BoardEntry, BoardScope } from "../api";

type Props = {
  scope: BoardScope;
  onScope: (scope: BoardScope) => void;
  entries: BoardEntry[];
  cutoff: number;
  offline: boolean;
  onPlay: () => void;
};

const fmt = (n: number) => n.toLocaleString("en-US");

export default function BoardScreen({ scope, onScope, entries, cutoff, offline, onPlay }: Props) {
  const today = scope === "today";

  return (
    <section className="screen-overlay leaderboard-screen" aria-label="High score screen">
      <div className="board-center">
        <h2>{today ? "TODAY’S TOP STACKS" : "ALL-TIME TOP STACKS"}</h2>

        <div className="board-tabs" role="tablist" aria-label="Leaderboard range">
          <button role="tab" aria-selected={today} className={today ? "on" : ""} onClick={() => onScope("today")}>
            TODAY
          </button>
          <button role="tab" aria-selected={!today} className={!today ? "on" : ""} onClick={() => onScope("alltime")}>
            ALL TIME
          </button>
        </div>

        <div className="score-list">
          {entries.length === 0 && (
            <div className="board-empty">{today ? "NO SCORES YET TODAY — BE FIRST" : "NO SCORES YET — BE FIRST"}</div>
          )}
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
          {today
            ? cutoff > 0
              ? `SCORE ${fmt(cutoff + 1)}+ TO JOIN TODAY’S BOARD`
              : "ANY SCORE JOINS TODAY’S BOARD"
            : cutoff > 0
              ? `SCORE ${fmt(cutoff + 1)}+ TO JOIN THE HALL OF FAME`
              : "ANY SCORE JOINS THE HALL OF FAME"}
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
