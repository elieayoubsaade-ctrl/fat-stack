import type { Character } from "../characters";

type Props = {
  characters: Character[];
  /** Id of the centred (chosen) character. */
  selectedId: string;
  onSelect: (id: string) => void;
  onPick: () => void;
};

/**
 * A one-axis carousel: left/right slide the cast, the centre card is the pick. Works with
 * a joystick and one button; a pointer can also tap a card to centre it, or the centre
 * card to confirm.
 */
export default function SelectScreen({ characters, selectedId, onSelect, onPick }: Props) {
  const index = Math.max(0, characters.findIndex((c) => c.id === selectedId));
  const picked = characters[index];

  return (
    <section className="screen-overlay select-screen" aria-label="Choose your character">
      <h2>CHOOSE YOUR STACKER</h2>
      <div className="carousel">
        <div className="carousel-track" style={{ transform: `translateX(calc(50% - (${index} + 0.5) * var(--card-w)))` }}>
          {characters.map((c, i) => {
            const offset = i - index;
            return (
              <button
                key={c.id}
                className={`char-card ${offset === 0 ? "centre" : ""}`}
                style={{ ["--offset" as string]: Math.abs(offset) }}
                onClick={() => (offset === 0 ? onPick() : onSelect(c.id))}
                aria-pressed={offset === 0}
              >
                <span className="card-burst" />
                <img src={c.art} alt={c.name} />
              </button>
            );
          })}
        </div>
      </div>
      <div className="pick-name">
        <b>{picked.name}</b>
        <span>{picked.tag}</span>
      </div>
      <button className="red-button big-button" onClick={onPick}>
        STACK AS {picked.name.toUpperCase()}
      </button>
      <div className="start-hint">
        <b>◀ ▶</b> BROWSE <span>•</span> <b>●</b> PICK
      </div>
    </section>
  );
}
