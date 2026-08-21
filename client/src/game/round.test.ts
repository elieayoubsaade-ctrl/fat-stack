import { describe, expect, it } from "vitest";
import { ROUND, TOWER } from "./config";
import { catchBand, catchY, createRound, stepRound } from "./round";

const seeded = (seed = 1) => () => {
  seed = (seed * 16807) % 2147483647;
  return (seed - 1) / 2147483646;
};

describe("catch geometry", () => {
  it("catches at the tray when the tower is empty", () => {
    const round = createRound(seeded());
    expect(catchY(round)).toBe(TOWER.trayY);
  });
  it("rises by layerUnits per layer", () => {
    const round = createRound(seeded());
    round.tower = ["turkey", "lettuce", "tomato"];
    expect(catchY(round)).toBeCloseTo(TOWER.trayY - 3 * TOWER.layerUnits);
    const band = catchBand(round);
    expect(band.top).toBeCloseTo(catchY(round) - 8 * ROUND.fallScale);
    expect(band.bottom).toBeCloseTo(catchY(round) + 6 * ROUND.fallScale);
  });
});

describe("spawning", () => {
  it("only spawns inside the truck hatch", () => {
    const xs: number[] = [];
    const round = createRound(seeded(9));
    for (let t = 0; t < 60; t += 1 / 60) {
      stepRound(round, 1 / 60);
      for (const item of round.items) xs.push(item.x);
    }
    expect(xs.length).toBeGreaterThan(100);
    expect(Math.min(...xs)).toBeGreaterThanOrEqual(ROUND.hatch.left);
    expect(Math.max(...xs)).toBeLessThanOrEqual(ROUND.hatch.right);
  });
});

describe("lid warning", () => {
  it("fires lid-incoming one second before a lid becomes available", () => {
    const round = createRound(seeded(3));
    round.tower = ["turkey", "lettuce", "tomato"];
    round.nextLidAt = 5;
    const seen: number[] = [];
    for (let t = 0; t < 6; t += 1 / 60) {
      stepRound(round, 1 / 60);
      if (round.events.some((e) => e.type === "lid-incoming")) seen.push(round.elapsed);
      round.events.length = 0;
    }
    expect(seen.length).toBe(1);
    expect(seen[0]).toBeGreaterThan(3.9);
    expect(seen[0]).toBeLessThan(4.1);
  });
});
