import { findClaimGaps, orderSteps, rankResources } from "../../../../../src/engine";
import { getCase, listResources } from "../../../../../src/lib/db";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const household = getCase(id);
  if (!household) {
    return Response.json({ error: "Case not found." }, { status: 404 });
  }

  const resources = listResources();
  const rankedResources = rankResources(resources, household);
  const availableDirectories = rankedResources.length === 0
    ? resources.filter((resource) => resource.kind === "directory")
    : [];

  return Response.json({
    household,
    rankedResources,
    steps: orderSteps(household.needs),
    claimGaps: findClaimGaps(household.evidence),
    availableDirectories,
  });
}
