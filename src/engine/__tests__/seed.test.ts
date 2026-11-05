import { describe, expect, it } from "vitest";
import { resources } from "../../data/resources.seed";

describe("resource seed integrity", () => {
  it("contains resources and gives every resource a non-empty source URL", () => {
    expect(resources.length).toBeGreaterThan(0);

    for (const resource of resources) {
      expect(resource.sourceUrl.trim(), `${resource.id} must have a source URL`).not.toBe("");
    }
  });

  it("requires verification metadata for every resource with a phone number", () => {
    for (const resource of resources) {
      if (resource.phone !== null) {
        expect(resource.verifiedAt?.trim(), `${resource.id} has a phone but is not verified`).toBeTruthy();
      }
    }
  });
});
