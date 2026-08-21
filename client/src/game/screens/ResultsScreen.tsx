import type { ReactNode } from "react";
import { claimUrl } from "../api";
import QrCode from "../QrCode";
import type { EndReason } from "../round";
import type { ItemKind } from "../config";
import HeroSandwich from "../HeroSandwich";

export type RunSummary = {
  score: number;
  banks: number;
  biggestBank: number;
  biggestLayers: ItemKind[];
  bestCombo: number;
  fumbles: number;
  collapses: number;
  caught: number;
  potLost: number;
  bonusClean: number;
  bonusSurvived: number;
  reason: EndReason;
};

export type ResultStage = "counting" | "initials" | "done";

type Props = {
  run: RunSummary;
  stage: ResultStage;
  countedScore: number;
  best: number;
  initials: [number, number, number];
  initialSlot: number;
  savedRank: number | null;
  onSlot: (slot: number) => void;
  onSpin: (slot: number, dir: 1 | -1) => void;
  onConfirmInitials: () => void;
  /** Set when this round earned a board place — renders the merch-claim QR. */
  claimToken: string | null;
  onPlayAgain: () => void;
  onBoard: () => void;
  /** The slam overlay (NEW #1 TODAY!) — rendered by the parent. */
  slam?: ReactNode;
};

const fmt = (n: number) => n.toLocaleString("en-US");

export default function ResultsScreen(p: Props) {
  const { run, stage } = p;
  return (
    <section className="screen-overlay results-screen" aria-label="Results screen">
      <div className="result-hero">
        <HeroSandwich layers={run.biggestLayers} />
        <span className="hero-caption">
          {run.biggestLayers.length > 0 ? `YOUR FATTEST STACK · ${run.biggestLayers.length} LAYERS` : "NOTHING BANKED THIS TIME"}
        </span>
      </div>

      <div className="result-center">
        <h2>{resultHeadline(run)}</h2>
        <div className="score-receipt">
          <span>YOUR SCORE</span>
          <b>{fmt(p.countedScore)}</b>
          <small>{resultCaption(run)}</small>
          {stage !== "counting" && (
            <div className="receipt-lines">
              <div><span>FAT STACKS BANKED</span><b>{run.banks}</b></div>
              <div><span>BIGGEST BANK</span><b>{fmt(run.biggestBank)}</b></div>
              <div><span>TOPPLES</span><b>{run.collapses}</b></div>
              <div><span>POT LEFT UNBANKED</span><b>{fmt(run.potLost)}</b></div>
              {run.bonusSurvived > 0 && <div className="bonus-line"><span>SURVIVED THE RUSH</span><b>+{fmt(run.bonusSurvived)}</b></div>}
              {run.bonusClean > 0 && <div className="bonus-line"><span>CLEAN COUNTER</span><b>+{fmt(run.bonusClean)}</b></div>}
              {p.best > 0 && run.score < p.best && <div className="bonus-line delta-line"><span>YOUR BEST</span><b>{fmt(p.best)}</b></div>}
            </div>
          )}
        </div>

        {stage === "initials" && (
          <div className="initials-entry">
            <strong>YOU MADE THE BOARD — SIGN IT</strong>
            <div className="initials-slots">
              {p.initials.map((letter, slot) => (
                <div key={slot} className={`initial-slot ${slot === p.initialSlot ? "active" : ""}`} onClick={() => p.onSlot(slot)}>
                  <button className="spin" onClick={(e) => { e.stopPropagation(); p.onSlot(slot); p.onSpin(slot, 1); }}>▲</button>
                  <b>{String.fromCharCode(65 + letter)}</b>
                  <button className="spin" onClick={(e) => { e.stopPropagation(); p.onSlot(slot); p.onSpin(slot, -1); }}>▼</button>
                </div>
              ))}
            </div>
            <div className="start-hint"><b>◀ ▶</b> LETTER <span>•</span> <b>●</b> NEXT</div>
            <button className="red-button" onClick={p.onConfirmInitials}>LOCK IT IN</button>
          </div>
        )}

        {stage === "done" && <div className="merch-note">HIGH SCORE = MERCH · SHOW STAFF YOUR SCORE</div>}
        {stage === "done" && p.claimToken && (
          <div className="claim-invite">
            <div className="claim-copy">
              <strong>CLAIM YOUR MERCH</strong>
              <span>Scan with your phone to collect your prize</span>
            </div>
            <QrCode value={claimUrl(p.claimToken)} size={170} />
          </div>
        )}

        {stage === "done" && (
          <div className="result-actions">
            {p.savedRank !== null && <div className="rank-badge">#{p.savedRank} TODAY</div>}
            <button className="red-button big-button" onClick={p.onPlayAgain}>PLAY AGAIN</button>
            <button className="white-button" onClick={p.onBoard}>VIEW BOARD</button>
          </div>
        )}
      </div>
      {p.slam}
    </section>
  );
}

function resultHeadline(run: RunSummary) {
  if (run.banks >= 4) return "FAT STACK LEGEND!";
  if (run.banks >= 2) return "THAT’S A FAT STACK!";
  if (run.banks === 1) return "FIRST BANK IN!";
  if (run.score >= 15000) return "SOLID STACKING!";
  if (run.score === 0) return "NOTHING ON THE BREAD.";
  return "DECENT SANDWICH.";
}

function resultCaption(run: RunSummary) {
  if (run.score === 0) return "YOU CAUGHT NOTHING. HAVE ANOTHER GO.";
  if (run.reason === "fumbles") return `${run.fumbles} SAUCE SPILLS. THE COUNTER WON THAT ONE.`;
  if (run.potLost > run.score / 2) return `${fmt(run.potLost)} POINTS NEVER REACHED THE BANK. GRAB THE LID!`;
  if (run.fumbles === 0 && run.collapses === 0) return "CLEAN ROUND. NOTHING SPILLED, NOTHING TOPPLED.";
  if (run.collapses > 0) return `${run.collapses} TOPPLE${run.collapses > 1 ? "S" : ""}. BANK BEFORE IT FALLS.`;
  if (run.fumbles > 0) return `${run.fumbles} FUMBLE${run.fumbles > 1 ? "S" : ""}. STILL TASTY.`;
  return "NO FUMBLES. NICE.";
}
