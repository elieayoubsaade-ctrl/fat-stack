/**
 * Talks to the Fat Stack backend.
 *
 * SECURITY MODEL — worth understanding before changing anything here.
 *   The browser never touches the database tables. Everything goes through three
 *   Postgres functions (`submit_play`, `play_for_claim`, `claim_play`) which run with
 *   elevated rights on the server and return only safe data. Row Level Security is on
 *   with no public policies, so even with the key visible in devtools nobody can read
 *   the `contacts` table where names and emails live.
 *
 * EVENT REALITY — venue wi-fi drops.
 *   The game never waits on the network. Scores that fail to send are queued in
 *   localStorage and retried; the leaderboard falls back to the last copy we saw. A
 *   dead connection costs nobody their round.
 */

import { deviceId, deviceKind } from "./analytics";

const URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const KEY = import.meta.env.VITE_SUPABASE_KEY as string | undefined;

/** False when no backend is configured — the game then runs on local scores only. */
export const backendConfigured = Boolean(URL && KEY);

const BOARD_CACHE_KEY = "fatstack-board-cache";
const BOARD_ALLTIME_CACHE_KEY = "fatstack-board-cache-alltime";
const QUEUE_KEY = "fatstack-pending-plays";
const REQUEST_TIMEOUT = 6000;

export type BoardEntry = { rank: number; name: string; score: number; claimed: boolean };

export type PlaySummary = {
  score: number;
  banks: number;
  biggestBank: number;
  bestCombo: number;
  fumbles: number;
  collapses: number;
  caught: number;
  potLost: number;
  characterId: string;
  endedReason: string | null;
  durationSeconds: number;
};

export type SubmitResult = { playId: string; claimToken: string; rank: number; qualifies: boolean };

export type ClaimInfo = { found: boolean; score?: number; rank?: number; claimed?: boolean };

async function rpc<T>(fn: string, body: Record<string, unknown>): Promise<T> {
  if (!URL || !KEY) throw new Error("backend not configured");
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT);
  try {
    const response = await fetch(`${URL}/rest/v1/rpc/${fn}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: KEY, Authorization: `Bearer ${KEY}` },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      throw new Error(`${fn} failed (${response.status}) ${detail.slice(0, 160)}`);
    }
    return (await response.json()) as T;
  } finally {
    window.clearTimeout(timer);
  }
}

async function selectView<T>(view: string, query: string): Promise<T> {
  if (!URL || !KEY) throw new Error("backend not configured");
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT);
  try {
    const response = await fetch(`${URL}/rest/v1/${view}?${query}`, {
      headers: { apikey: KEY, Authorization: `Bearer ${KEY}` },
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`${view} failed (${response.status})`);
    return (await response.json()) as T;
  } finally {
    window.clearTimeout(timer);
  }
}

/* ── Leaderboard ─────────────────────────────────────────────────────────── */

export type BoardScope = "today" | "alltime";

const cacheKeyFor = (scope: BoardScope) =>
  scope === "alltime" ? BOARD_ALLTIME_CACHE_KEY : BOARD_CACHE_KEY;

function readBoardCache(scope: BoardScope): BoardEntry[] | null {
  try {
    const raw = localStorage.getItem(cacheKeyFor(scope));
    return raw ? (JSON.parse(raw) as BoardEntry[]) : null;
  } catch {
    return null;
  }
}

/**
 * Today's top ten. Returns the cached copy if the network is unavailable, so the
 * board on the cabinet never goes blank mid-event.
 */
export async function fetchLeaderboard(
  scope: BoardScope = "today",
): Promise<{ entries: BoardEntry[]; live: boolean }> {
  if (!backendConfigured) return { entries: readBoardCache(scope) ?? [], live: false };
  try {
    const rows = await selectView<Array<{ rank: number; name: string; score: number; claimed: boolean }>>(
      scope === "alltime" ? "leaderboard_alltime" : "leaderboard_today",
      "select=rank,name,score,claimed&order=score.desc&limit=5",
    );
    const entries = rows.map((r) => ({ rank: r.rank, name: r.name, score: r.score, claimed: r.claimed }));
    try {
      localStorage.setItem(cacheKeyFor(scope), JSON.stringify(entries));
    } catch {
      /* storage full or blocked — the board still works this session */
    }
    return { entries, live: true };
  } catch {
    return { entries: readBoardCache(scope) ?? [], live: false };
  }
}

/** Both boards at once, so switching tabs is instant rather than a loading flicker. */
export async function fetchBothBoards() {
  const [today, alltime] = await Promise.all([fetchLeaderboard("today"), fetchLeaderboard("alltime")]);
  return { today, alltime };
}

/* ── Submitting a round ──────────────────────────────────────────────────── */

function toPayload(play: PlaySummary) {
  return {
    p_score: Math.round(play.score),
    p_banks: play.banks,
    p_biggest_bank: Math.round(play.biggestBank),
    p_best_combo: play.bestCombo,
    p_fumbles: play.fumbles,
    p_collapses: play.collapses,
    p_caught: play.caught,
    p_pot_lost: Math.round(play.potLost),
    p_character_id: play.characterId,
    p_ended_reason: play.endedReason,
    p_duration: Number(play.durationSeconds.toFixed(2)),
    // Anonymous per-browser id — identifies a phone or a cabinet, never a person.
    // Lets us count players, not just rounds.
    p_device_id: deviceId(),
    p_device_kind: deviceKind(),
  };
}

function queuePlay(play: PlaySummary) {
  try {
    const queue = JSON.parse(localStorage.getItem(QUEUE_KEY) ?? "[]") as PlaySummary[];
    queue.push(play);
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue.slice(-50)));
  } catch {
    /* nothing else to do; the round is already over */
  }
}

/**
 * Send a finished round. Returns null when the backend is unreachable — the caller
 * treats that as "no claim QR this time" and the score is queued for later.
 */
export async function submitPlay(play: PlaySummary): Promise<SubmitResult | null> {
  if (!backendConfigured) return null;
  try {
    const result = await rpc<{ play_id: string; claim_token: string; rank: number; qualifies: boolean }>(
      "submit_play",
      toPayload(play),
    );
    return {
      playId: result.play_id,
      claimToken: result.claim_token,
      rank: result.rank,
      qualifies: result.qualifies,
    };
  } catch {
    queuePlay(play);
    return null;
  }
}

/** Retry anything stranded by a dropped connection. Safe to call on every load. */
export async function flushQueuedPlays(): Promise<number> {
  if (!backendConfigured) return 0;
  let queue: PlaySummary[];
  try {
    queue = JSON.parse(localStorage.getItem(QUEUE_KEY) ?? "[]") as PlaySummary[];
  } catch {
    return 0;
  }
  if (!queue.length) return 0;

  const stillPending: PlaySummary[] = [];
  let sent = 0;
  for (const play of queue) {
    try {
      await rpc("submit_play", toPayload(play));
      sent += 1;
    } catch {
      stillPending.push(play);
    }
  }
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(stillPending));
  } catch {
    /* ignore */
  }
  return sent;
}

/** Put the player's arcade initials on the board, straight from the cabinet. */
export async function setInitials(token: string, initials: string): Promise<string | null> {
  if (!backendConfigured) return null;
  try {
    const result = await rpc<{ display_name: string }>("set_initials", {
      p_token: token,
      p_initials: initials,
    });
    return result.display_name;
  } catch {
    return null;
  }
}

/* ── Claiming a place (the player's phone) ───────────────────────────────── */

export async function fetchClaimInfo(token: string): Promise<ClaimInfo> {
  return rpc<ClaimInfo>("play_for_claim", { p_token: token });
}

export async function claimPlace(
  token: string,
  fullName: string,
  email: string,
  marketingConsent: boolean,
): Promise<{ display_name: string; score: number; contact_id: string }> {
  return rpc("claim_play", {
    p_token: token,
    p_full_name: fullName,
    p_email: email,
    p_marketing: marketingConsent,
    p_device_id: deviceId(),
  });
}

/** The URL printed into the claim QR code. */
export function claimUrl(token: string) {
  return `${window.location.origin}/claim?t=${token}`;
}
