import { gameAssets } from "../assets";
import { TOWER } from "../config";
import Ingredient from "../Ingredient";

export default function HowToScreen({ onStart }: { onStart: () => void }) {
  return (
    <section className="screen-overlay tutorial-screen" aria-label="How to play">
      <h2>HOW TO STACK</h2>
      <div className="tutorial-grid">
        <article>
          <span className="step-num">01</span>
          <div className="tutorial-items">
            <Ingredient kind="pastrami" />
            <Ingredient kind="tomato" />
            <Ingredient kind="lettuce" />
          </div>
          <h3>CATCH</h3>
          <p>EVERY CATCH FILLS YOUR POT</p>
        </article>
        <article>
          <span className="step-num">02</span>
          <div className="tutorial-items">
            <Ingredient kind="lid" />
          </div>
          <h3>BANK</h3>
          <p>THE TIGER LID CASHES YOUR POT IN. TALLER = BIGGER BONUS</p>
        </article>
        <article>
          <span className="step-num">03</span>
          <div className="tutorial-items">
            <img className="topple-demo" src={gameAssets.ingBase} alt="Tiger crunch base" />
          </div>
          <h3>DON’T TOPPLE</h3>
          <p>{TOWER.collapseAt} LAYERS = CRASH. POT LOST</p>
        </article>
        <article>
          <span className="step-num">04</span>
          <div className="tutorial-items">
            <div className="hazard-demo">
              <Ingredient kind="sauce" />
              <span className="hazard-mark">✕</span>
            </div>
          </div>
          <h3>AVOID</h3>
          <p>3 SAUCE SPILLS = GAME OVER</p>
        </article>
      </div>
      <button className="red-button big-button" onClick={onStart}>
        PRESS TO START
      </button>
    </section>
  );
}
