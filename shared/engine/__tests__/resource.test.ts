import { describe, expect, it } from "vitest";
import { resourceSchema } from "../resource";
import { resource } from "./fixtures";

describe("resourceSchema", () => {
  it("accepts a complete record", () => {
    expect(resourceSchema.safeParse(resource()).success).toBe(true);
  });

  it.each([
    ["a missing source URL", { sourceUrl: "" }],
    ["a phone number with no verification", { phone: "212-555-0100", verifiedAt: null }],
    ["a malformed opening time", { hours: { mon: [["9am", "17:00"]] } }],
  ])("rejects %s", (_label, overrides) => {
    expect(resourceSchema.safeParse({ ...resource(), ...overrides }).success).toBe(false);
  });
});
