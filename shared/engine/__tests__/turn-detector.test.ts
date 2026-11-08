import { describe, expect, it } from "vitest";
import { createTurnDetector } from "../turn-detector";

/** Feed the detector 50 ms readings: `loud` ticks of speech, then `quiet` ticks of silence. */
const run = (loud: number, quiet: number, options = {}) => {
  const finished = createTurnDetector(options);
  const readings = [...Array(loud).fill(0.1), ...Array(quiet).fill(0.002)];
  return readings.findIndex((level) => finished(level, 50));
};

describe("createTurnDetector", () => {
  it("finishes a second after real speech stops", () => {
    expect(run(20, 30)).toBe(20 + 20 - 1); // 1000 ms of quiet is 20 ticks
  });

  it("never finishes on silence alone", () => {
    expect(run(0, 200)).toBe(-1);
  });

  it("ignores a cough that is shorter than a real reply", () => {
    expect(run(4, 100)).toBe(-1); // 200 ms of noise
  });

  it("keeps waiting through a short pause mid-sentence", () => {
    const finished = createTurnDetector();
    const sentence = [...Array(15).fill(0.1), ...Array(10).fill(0.002), ...Array(15).fill(0.1)];
    expect(sentence.some((level) => finished(level, 50))).toBe(false);
  });
});
