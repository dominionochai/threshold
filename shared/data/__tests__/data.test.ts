import { expect, it } from "vitest";
import { edges, resources } from "../resources";
import { NEIGHBORHOODS } from "../neighborhoods";

it("has unique resource ids and edges that point at real resources", () => {
  const ids = resources.map((r) => r.id);
  expect(new Set(ids).size).toBe(ids.length);
  for (const edge of edges) expect(ids).toContain(edge.from), expect(ids).toContain(edge.to);
});

it("keeps neighborhood names unique", () => {
  expect(new Set(NEIGHBORHOODS.map((n) => n.name)).size).toBe(NEIGHBORHOODS.length);
});

it("only marks a record verified when its source is an official NYC site", () => {
  const official = /^https:\/\/([\w-]+\.)*(nyc\.gov|nychealthandhospitals\.org)\//;
  for (const r of resources.filter((x) => x.verifiedAt)) expect(r.sourceUrl).toMatch(official);
});
