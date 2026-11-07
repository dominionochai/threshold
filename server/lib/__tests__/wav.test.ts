import { expect, it } from "vitest";
import { wavFromPcm } from "../wav";

it("wraps PCM in a valid 24 kHz mono WAV header", () => {
  const pcm = Buffer.alloc(100, 1).toString("base64");
  const wav = Buffer.from(wavFromPcm(pcm), "base64");
  expect(wav.toString("ascii", 0, 4)).toBe("RIFF");
  expect(wav.toString("ascii", 8, 12)).toBe("WAVE");
  expect(wav.readUInt32LE(24)).toBe(24000);
  expect(wav.readUInt32LE(40)).toBe(100);
  expect(wav.length).toBe(144);
});
