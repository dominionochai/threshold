// @vitest-environment happy-dom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { expect, it, vi } from "vitest";
import { StaffPhone } from "../StaffPhone";

const mutateAsync = vi.fn(async (_input: { turns: { who: string }[] }) => ({}));
const played: string[] = [];
vi.mock("@agent-native/core/client/hooks", () => ({ useActionMutation: () => ({ mutateAsync }) }));
vi.mock("../callAudio", () => ({
  startRinging: () => () => undefined,
  preloadClips: async (urls: string[]) => new Map(urls.map((url) => [url, { url } as unknown as HTMLAudioElement])),
  playClip: async (audio: { url: string }) => void played.push(audio.url),
  waitForTurn: async () => undefined,
}));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
Object.defineProperty(globalThis.navigator, "mediaDevices", { value: { getUserMedia: async () => null }, configurable: true });
const call = { id: "call-1", stepId: "s", resourceId: "dhs-path", resourceName: "PATH", status: "ringing" as const, turns: [], scripted: true };

it("is a plain lock screen until a call comes in", async () => {
  const container = document.createElement("div");
  const root = createRoot(container);
  await act(async () => root.render(<StaffPhone call={null} />));
  expect(container.textContent).not.toContain("Threshold");
  expect(container.querySelector("input")).toBeNull();
  await act(async () => root.unmount());
});

it("rings, then plays all five caller lines in order and closes the call with the scripted conversation", async () => {
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  await act(async () => root.render(<StaffPhone call={call} />));
  expect(container.textContent).toContain("incoming call");

  await act(async () => [...container.querySelectorAll("button")].find((b) => b.textContent?.includes("Accept"))?.dispatchEvent(new MouseEvent("click", { bubbles: true })));

  expect(played).toEqual(["a1", "a2", "a3", "a4", "a5"].map((id) => `/demo-voice/${id}.wav`));
  const closing = mutateAsync.mock.calls[mutateAsync.mock.calls.length - 1]?.[0];
  expect(closing?.turns.map((t) => t.who)).toEqual(["agent", "shelter", "agent", "shelter", "agent", "shelter", "agent", "shelter", "agent"]);
  expect(container.textContent).toContain("Call Ended");
  expect(container.querySelector("input")).toBeNull();
  await act(async () => root.unmount());
});
