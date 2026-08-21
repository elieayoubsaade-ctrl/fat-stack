/**
 * The playable cast.
 *
 * To add or remove a character, edit this one list. Art lives in
 * `client/public/assets/chars/` as trimmed transparent cut-outs; names and personalities
 * follow the brand character guide.
 *
 * Chop-Chop is deliberately not here — that artwork is an action graphic (two chopping
 * hands), not a body that can hold a sandwich tray. Add it back if the art changes.
 */
const base = import.meta.env.BASE_URL;

export type Character = {
  id: string;
  name: string;
  /** One-liner shown under the name on the select screen. */
  tag: string;
  art: string;
};

export const CHARACTERS: Character[] = [
  { id: "fat-sandwich", name: "The Fat Sandwich", tag: "The main character", art: `${base}assets/chars/fat-sandwich.png` },
  { id: "pastrami-mami", name: "Pastrami Mami", tag: "The diva", art: `${base}assets/chars/pastrami-mami.png` },
  { id: "captain-tuna", name: "Captain Tuna", tag: "The captain", art: `${base}assets/chars/captain-tuna.png` },
  { id: "birdman", name: "Birdman", tag: "Top secret", art: `${base}assets/chars/birdman.png` },
  { id: "egghead", name: "Egghead", tag: "Unimpressed", art: `${base}assets/chars/egghead.png` },
  { id: "pbj", name: "PB&J", tag: "Double trouble", art: `${base}assets/chars/pbj.png` },
  { id: "runny-sunny", name: "Runny Sunny", tag: "Too cool", art: `${base}assets/chars/runny-sunny.png` },
  { id: "lil-sprout", name: "Lil Sprout", tag: "Fresh energy", art: `${base}assets/chars/lil-sprout.png` },
  { id: "uncle-kraut", name: "Uncle Kraut", tag: "Old school", art: `${base}assets/chars/uncle-kraut.png` },
];

export const DEFAULT_CHARACTER = CHARACTERS[0];

export function characterById(id: string | null): Character {
  return CHARACTERS.find((c) => c.id === id) ?? DEFAULT_CHARACTER;
}
