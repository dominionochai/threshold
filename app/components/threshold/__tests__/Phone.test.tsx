// @vitest-environment happy-dom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { beforeEach, expect, it, vi } from "vitest";
import { Phone } from "../Phone";

const mutateAsync = vi.fn();
let hear: { onFinal: (text: string) => void } | undefined;
vi.mock("@agent-native/core/client/hooks", () => ({ useActionMutation: () => ({ mutateAsync }) }));
vi.mock("../callAudio", () => ({
  startRinging: () => () => undefined,
  playWav: async () => undefined,
  canListen: () => true,
  listen: (handlers: { onFinal: (text: string) => void }) => {
    hear = handlers;
    return () => undefined;
  },
}));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
const call = { id: "call-1", stepId: "step-1", resourceId: "dhs-path", resourceName: "PATH" };

beforeEach(() => {
  mutateAsync.mockReset();
  hear = undefined;
  mutateAsync.mockImplementation(async (input: { text?: string; turns?: { who: string }[] }) => {
    if (input.text) return { audio: "AAAA" };
    if (input.turns?.some((t) => t.who === "shelter")) return { say: "Thank you, goodbye.", endCall: false };
    return { say: "Hello, I'm an assistant calling for a family.", endCall: false };
  });
});

async function render() {
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  await act(async () => root.render(<Phone call={call} location="Harlem" onClose={() => undefined} />));
  const click = async (label: string) =>
    act(async () => [...container.querySelectorAll("button")].find((b) => b.textContent === label)?.dispatchEvent(new MouseEvent("click", { bubbles: true })));
  return { container, root, click };
}

it("rings, then the caller speaks first and the line opens by itself, with no text box", async () => {
  const { container, root, click } = await render();
  expect(hear).toBeUndefined();
  await click("Answer");
  expect(container.textContent).toContain("Hello, I'm an assistant calling for a family.");
  expect(hear).toBeDefined(); // listening without anyone pressing anything
  expect(container.querySelector("input")).toBeNull();
  await act(async () => root.unmount());
});

it("sends what the staff member says and speaks the reply", async () => {
  const { container, root, click } = await render();
  await click("Answer");
  await act(async () => hear?.onFinal("Yes, bring them in tonight."));
  expect(container.textContent).toContain("Yes, bring them in tonight.");
  expect(container.textContent).toContain("Thank you, goodbye.");
  await act(async () => root.unmount());
});

it("closes the call into the case when ended", async () => {
  mutateAsync.mockImplementation(async (input: { text?: string; turns?: unknown[] }) =>
    input.text ? { audio: "AAAA" } : input.turns?.length ? { outcome: { result: "confirmed", summary: "They can take the family.", instructions: ["Bring ID"], spokeWith: null } } : { say: "Hi.", endCall: false });
  const { container, root, click } = await render();
  await click("Answer");
  await click("End call");
  expect(container.textContent).toContain("confirmed");
  expect(container.textContent).toContain("Bring ID");
  await act(async () => root.unmount());
});
