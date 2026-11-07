import { describe, expect, it } from "vitest";
import { openness } from "../hours";
import type { Hours } from "../resource";

// 2026-11-04 is a Wednesday and New York is on EST (UTC-5).
const wed = (hhmm: string) => new Date(`2026-11-04T${hhmm}:00-05:00`);
const thu = (hhmm: string) => new Date(`2026-11-05T${hhmm}:00-05:00`);

describe("openness", () => {
  it("treats missing hours as unknown and 24/7 as always open", () => {
    expect(openness(null, wed("10:00"))).toEqual({ status: "unknown" });
    expect(openness("24/7", thu("03:00"))).toEqual({ status: "open", closes: null });
  });

  it("is open from opening until, but not at, closing time", () => {
    const hours: Hours = { wed: [["09:00", "17:00"]] };
    expect(openness(hours, wed("08:59")).status).toBe("closed");
    expect(openness(hours, wed("09:00"))).toEqual({ status: "open", closes: "17:00" });
    expect(openness(hours, wed("17:00")).status).toBe("closed");
  });

  it("carries an overnight window past midnight into the next day", () => {
    const hours: Hours = { wed: [["22:00", "06:00"]] };
    expect(openness(hours, wed("23:30"))).toEqual({ status: "open", closes: "06:00" });
    expect(openness(hours, thu("00:30"))).toEqual({ status: "open", closes: "06:00" });
    expect(openness(hours, thu("06:00")).status).toBe("closed");
  });

  it("is closed on days with no window", () => {
    expect(openness({ mon: [["09:00", "17:00"]] }, wed("10:00")).status).toBe("closed");
  });

  it("reads the clock in New York, not UTC", () => {
    const hours: Hours = { wed: [["09:00", "17:00"]] };
    expect(openness(hours, new Date("2026-11-04T15:00:00Z")).status).toBe("open"); // 10:00 EST
    expect(openness(hours, new Date("2026-11-04T10:00:00Z")).status).toBe("closed"); // 05:00 EST
  });
});
