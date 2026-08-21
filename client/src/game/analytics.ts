/**
 * Product analytics (PostHog).
 *
 * Deliberately uses PostHog's plain HTTP capture endpoint rather than the SDK:
 *   • adds zero kilobytes to a game that loads on venue wi-fi
 *   • no autocapture and no session recording — this is a kiosk, and recording
 *     strangers at a public event is a privacy problem we don't need
 *   • every event is explicit and listed below, so you always know what is collected
 *
 * Nothing personal is ever sent here. The player's name and email live only in the
 * database. The id below identifies a *cabinet*, not a person.
 *
 * Without VITE_POSTHOG_KEY set, every call is a no-op and the game is unaffected.
 */

const KEY = import.meta.env.VITE_POSTHOG_KEY as string | undefined;
const HOST = (import.meta.env.VITE_POSTHOG_HOST as string | undefined) ?? "https://eu.i.posthog.com";

const DEVICE_KEY = "fatstack-device-id";

export const analyticsEnabled = Boolean(KEY);

/** A stable per-device id so you can tell cabinets and phones apart. Not a person. */
function deviceId(): string {
  try {
    let id = localStorage.getItem(DEVICE_KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(DEVICE_KEY, id);
    }
    return id;
  } catch {
    return "anonymous-device";
  }
}

export type GameEventName =
  | "game_opened"
  | "attract_shown"
  | "character_selected"
  | "round_started"
  | "round_completed"
  | "made_leaderboard"
  | "claim_opened"
  | "contact_submitted";

/** Fire and forget — analytics must never delay or break the game. */
export function track(event: GameEventName, properties: Record<string, unknown> = {}) {
  if (!KEY) return;
  try {
    const body = JSON.stringify({
      api_key: KEY,
      event,
      properties: { distinct_id: deviceId(), $lib: "fatstack-web", ...properties },
      timestamp: new Date().toISOString(),
    });
    // keepalive lets the last event survive a page close.
    void fetch(`${HOST}/capture/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true,
    }).catch(() => {
      /* analytics is never allowed to surface an error */
    });
  } catch {
    /* ignore */
  }
}
