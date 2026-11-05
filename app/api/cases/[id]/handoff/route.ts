import { randomUUID } from "node:crypto";
import { getCase, insertHandoff } from "../../../../../src/lib/db";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export async function POST(request: Request, context: RouteContext) {
  const { id: caseId } = await context.params;
  if (!getCase(caseId)) {
    return Response.json({ error: "Case not found." }, { status: 404 });
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return Response.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  if (
    !isRecord(payload) ||
    (payload.decision !== "approve" && payload.decision !== "reject") ||
    typeof payload.message !== "string" ||
    payload.message.trim().length === 0
  ) {
    return Response.json({ error: "Provide decision 'approve' or 'reject' and a non-empty message." }, { status: 400 });
  }

  const handoff = insertHandoff({
    id: randomUUID(),
    caseId,
    status: payload.decision === "approve" ? "prepared" : "rejected",
    message: payload.message.trim(),
  });

  return Response.json({ handoff }, { status: 201 });
}
