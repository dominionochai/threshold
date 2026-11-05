import { randomUUID } from "node:crypto";
import { insertCase, listCases } from "../../../src/lib/db";
import type { CaseRecord, Need } from "../../../src/engine/types";

export const runtime = "nodejs";

const allowedNeeds = new Set<Need>(["food", "bed", "medical", "legal"]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export async function GET() {
  return Response.json(listCases());
}

export async function POST(request: Request) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return Response.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  if (!isRecord(payload)) {
    return Response.json({ error: "Request body must be an object." }, { status: 400 });
  }

  const { children, needs, location, language } = payload;
  if (
    !Array.isArray(children) ||
    !children.every((age) => Number.isInteger(age) && (age as number) >= 0 && (age as number) <= 17)
  ) {
    return Response.json({ error: "children must contain only integer ages from 0 through 17." }, { status: 400 });
  }
  if (!Array.isArray(needs) || !needs.every((need) => typeof need === "string" && allowedNeeds.has(need as Need))) {
    return Response.json({ error: "needs must contain only food, bed, medical, or legal." }, { status: 400 });
  }
  if (typeof location !== "string" || location.trim().length === 0) {
    return Response.json({ error: "location is required." }, { status: 400 });
  }
  if (typeof language !== "string" || language.trim().length === 0) {
    return Response.json({ error: "language is required." }, { status: 400 });
  }

  // Whitelist the taps-only fields; ignore all other submitted properties.
  const record: CaseRecord = {
    id: randomUUID(),
    children: [...(children as number[])],
    needs: [...(needs as Need[])],
    location: location.trim(),
    language: language.trim(),
    evidence: {
      mealRecords: false,
      attendanceDays: false,
      allergyDeclarations: false,
      idDocuments: false,
    },
    simulated: true,
  };

  insertCase(record);
  return Response.json(record, { status: 201 });
}
