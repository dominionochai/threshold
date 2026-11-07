import { getOrgContext } from "@agent-native/core/org";
import {
  createAgentChatPlugin,
  loadActionsFromStaticRegistry,
} from "@agent-native/core/server";

import actionsRegistry from "../../.generated/actions-registry.js";
import {
  searchConversationReferences,
  validateConversationReferences,
} from "../lib/composer-references.js";

const INITIAL_TOOL_NAMES = [
  "view-screen",
  "navigate",
  "get-case",
  "create-case",
  "log-event",
  "update-step",
  "update-evidence",
  "rank-resources",
  "place-call",
  "provider-api-request",
  "ask-question",
];

export default createAgentChatPlugin({
  appId: "threshold",
  mentionProviders: {
    chats: {
      label: "composerSources.group",
      search: searchConversationReferences,
    },
  },
  prepareRequest: async ({ references }) => {
    await validateConversationReferences(references);
  },
  actions: loadActionsFromStaticRegistry(actionsRegistry),
  mcp: { connectorCatalog: [], appApprovalPage: true },
  initialToolNames: INITIAL_TOOL_NAMES,
  resolveOrgId: async (event) => (await getOrgContext(event)).orgId,
  systemPrompt: `You are the Threshold agent. Threshold keeps one case record for a household in New York City across two clocks: tonight's crisis (food, a bed, medical, legal) and the SNAP claim that follows.

Use actions as the source of truth: get-case, rank-resources, update-step, update-evidence, log-event, place-call. place-call phones a listed place for the family and always waits for the person's approval. Never invent a shelter, pantry, phone number or hour; only offer places rank-resources returns, and say when one is unverified. Log what happens with log-event: the activity trail is the evidence ledger for the claim.`,
});
