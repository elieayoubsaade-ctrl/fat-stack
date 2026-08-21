export type ScoreEntry = { name: string; score: number };

type Props = { scores: ScoreEntry[]; cutoff: number; onPlay: () => void };

const fmt = (n: number) => n.toLocaleString("en-US");

export default function BoardScreen({ scores, cutoff, onPlay }: Props) {
  return (
    <section className="screen-overlay leaderboard-screen" aria-label="High score screen">
      <div className="board-center">
        <h2>TODAY’S TOP STACKS</h2>
        <div className="score-list">
          {scores.map((entry, index) => (
            <div className={`rank-${index + 1}`} key={`${entry.name}-${entry.score}-${index}`}>
              <i>{index + 1}</i>
              <span>{entry.name}</span>
              <b>{fmt(entry.score)}</b>
            </div>
          ))}
        </div>
        <p>{cutoff > 0 ? `SCORE ${fmt(cutoff + 1)}+ TO JOIN THE BOARD` : "ANY SCORE JOINS THE BOARD"}</p>
        <div className="merch-note">CLAIM YOUR MERCH · SHOW STAFF YOUR SCORE</div>
        <button className="red-button big-button" onClick={onPlay}>PLAY</button>
      </div>
    </section>
  );
}
