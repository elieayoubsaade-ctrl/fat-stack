/**
 * The playable cast.
 *
 * To add or remove a character, edit this one list. Art lives in
 * `client/public/assets/chars/` as trimmed transparent cut-outs; names and personalities
 * follow the brand character guide.
 *
 * `trayY` is where the tray sits on the cut-out, as a fraction of its height from the
 * top (0.6 = six tenths of the way down). Every cut-out is shaped differently, so each
 * has its own. `lean` is off for art that is not a body (Chop-Chop is two hands).
 */
const base = import.meta.env.BASE_URL;

export type Character = {
  id: string;
  name: string;
  /** One-liner shown under the name on the select screen. */
  tag: string;
  art: string;
  /** Tray position, 0–1 from the top of the cut-out. */
  trayY: number;
  /** Whether the character tilts into left/right movement. */
  lean: boolean;
};

export const CHARACTERS: Character[] = [
  { id: "fat-sandwich", name: "The Fat Sandwich", tag: "The main character", art: `${base}assets/chars/fat-sandwich.png` , trayY: 0.62, lean: true },
  { id: "pastrami-mami", name: "Pastrami Mami", tag: "The diva", art: `${base}assets/chars/pastrami-mami.png` , trayY: 0.5, lean: true },
  { id: "captain-tuna", name: "Captain Tuna", tag: "The captain", art: `${base}assets/chars/captain-tuna.png` , trayY: 0.62, lean: true },
  { id: "birdman", name: "Birdman", tag: "Top secret", art: `${base}assets/chars/birdman.png` , trayY: 0.6, lean: true },
  { id: "egghead", name: "Egghead", tag: "Unimpressed", art: `${base}assets/chars/egghead.png` , trayY: 0.56, lean: true },
  { id: "pbj", name: "PB&J", tag: "Double trouble", art: `${base}assets/chars/pbj.png` , trayY: 0.62, lean: true },
  { id: "runny-sunny", name: "Runny Sunny", tag: "Too cool", art: `${base}assets/chars/runny-sunny.png` , trayY: 0.64, lean: true },
  { id: "lil-sprout", name: "Lil Sprout", tag: "Fresh energy", art: `${base}assets/chars/lil-sprout.png` , trayY: 0.6, lean: true },
  { id: "uncle-kraut", name: "Uncle Kraut", tag: "Old school", art: `${base}assets/chars/uncle-kraut.png` , trayY: 0.5, lean: true },
];

export const DEFAULT_CHARACTER = CHARACTERS[0];

export function characterById(id: string | null): Character {
  return CHARACTERS.find((c) => c.id === id) ?? DEFAULT_CHARACTER;
}
