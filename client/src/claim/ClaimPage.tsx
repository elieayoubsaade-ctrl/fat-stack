/**
 * The claim page — this is what opens on the player's phone after they scan the QR.
 *
 * It is deliberately a separate, tiny screen: no game engine, no audio, no artwork
 * beyond the logo. It loads fast on venue mobile data and does one job — turn a
 * qualifying score into a name on the board and a contact in the database.
 */
import { useCallback, useEffect, useState } from "react";
import { claimPlace, fetchClaimInfo, type ClaimInfo } from "@/game/api";
import { track } from "@/game/analytics";

type Stage = "loading" | "form" | "saving" | "done" | "already" | "notfound" | "error";

export default function ClaimPage() {
  const [stage, setStage] = useState<Stage>("loading");
  const [info, setInfo] = useState<ClaimInfo | null>(null);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [marketing, setMarketing] = useState(true);
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState("");

  const token = new URLSearchParams(window.location.search).get("t") ?? "";

  useEffect(() => {
    if (!token) {
      setStage("notfound");
      return;
    }
    let cancelled = false;
    fetchClaimInfo(token)
      .then((result) => {
        if (cancelled) return;
        setInfo(result);
        if (!result.found) setStage("notfound");
        else if (result.claimed) setStage("already");
        else {
          setStage("form");
          track("claim_opened", { rank: result.rank, score: result.score });
        }
      })
      .catch(() => {
        if (!cancelled) setStage("error");
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  const submit = useCallback(
    async (event: React.FormEvent) => {
      event.preventDefault();
      setError("");
      setStage("saving");
      try {
        const result = await claimPlace(token, fullName, email, marketing);
        setDisplayName(result.display_name);
        setStage("done");
        track("contact_submitted", { rank: info?.rank, score: info?.score, marketing_consent: marketing });
      } catch (caught) {
        const message = caught instanceof Error ? caught.message : "Something went wrong";
        setError(
          /valid email/i.test(message)
            ? "That email doesn't look right — check it and try again."
            : /name required/i.test(message)
              ? "Please enter your name."
              : /already claimed/i.test(message)
                ? "This place has already been claimed."
                : "Couldn't save that. Check your connection and try again.",
        );
        setStage("form");
      }
    },
    [token, fullName, email, marketing, info],
  );

  return (
    <main className="claim-page">
      <div className="claim-card">
        <div className="claim-brand">
          <span>FAT</span>
          <strong>STACK</strong>
        </div>

        {stage === "loading" && <p className="claim-status">Loading your score…</p>}

        {stage === "notfound" && (
          <>
            <h1>LINK NOT FOUND</h1>
            <p className="claim-status">This claim link isn't valid any more. Have another go on the machine!</p>
          </>
        )}

        {stage === "error" && (
          <>
            <h1>NO CONNECTION</h1>
            <p className="claim-status">We couldn't reach the scoreboard. Check your signal and refresh.</p>
          </>
        )}

        {stage === "already" && (
          <>
            <h1>ALREADY CLAIMED</h1>
            <p className="claim-status">This place on the board has already been signed for.</p>
          </>
        )}

        {(stage === "form" || stage === "saving") && info && (
          <>
            <h1>YOU MADE THE BOARD</h1>
            <div className="claim-score">
              <div>
                <span>YOUR SCORE</span>
                <b>{info.score?.toLocaleString("en-US")}</b>
              </div>
              <div>
                <span>TODAY'S RANK</span>
                <b>#{info.rank}</b>
              </div>
            </div>

            <form onSubmit={submit}>
              <label>
                FULL NAME
                <input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  autoComplete="name"
                  placeholder="Your name"
                  required
                  maxLength={80}
                />
              </label>
              <label>
                EMAIL
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  inputMode="email"
                  placeholder="you@email.com"
                  required
                  maxLength={120}
                />
              </label>

              <label className="claim-check">
                <input type="checkbox" checked={marketing} onChange={(e) => setMarketing(e.target.checked)} />
                <span>I'd like Fatsandwich news and offers</span>
              </label>

              {error && <p className="claim-error">{error}</p>}

              <button className="claim-submit" type="submit" disabled={stage === "saving"}>
                {stage === "saving" ? "SAVING…" : "CLAIM MY PLACE"}
              </button>

              <p className="claim-privacy">
                We use your details to contact you about your prize. Your email is stored privately and never shown
                on the leaderboard — the board shows your first name and last initial only. We never share your
                details with anyone else.
              </p>
            </form>
          </>
        )}

        {stage === "done" && (
          <>
            <h1>YOU'RE ON THE BOARD</h1>
            <div className="claim-done">
              <b>{displayName}</b>
              <span>{info?.score?.toLocaleString("en-US")} · #{info?.rank} today</span>
            </div>
            <p className="claim-status">Show this screen to staff to claim your merch. Nice stacking.</p>
          </>
        )}
      </div>
    </main>
  );
}
