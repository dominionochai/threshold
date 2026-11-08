import { resolveCredential } from "@agent-native/core/credentials";
import { getRequestOrgId, getRequestUserEmail } from "@agent-native/core/server";
import type { z } from "zod";
import { toContents, type Turn } from "../../shared/engine/conversation.js";
import { DEFAULT_VOICE, synthesizeWith } from "./tts.js";

const API = "https://generativelanguage.googleapis.com/v1beta/models";
const KEY_NAME = "GOOGLE_GENERATIVE_AI_API_KEY";
const TEXT_MODEL = process.env.THRESHOLD_CALL_MODEL ?? "gemini-flash-latest";
const SPEAKING_STYLE = "warm and steady, with a little breath between phrases";

async function apiKey(): Promise<string> {
  const stored = await resolveCredential(KEY_NAME, { userEmail: getRequestUserEmail() ?? "", orgId: getRequestOrgId() ?? null });
  const key = stored ?? process.env[KEY_NAME];
  if (!key) throw new Error("No Gemini key found. Add one in Settings to place calls.");
  return key;
}

async function generate(model: string, body: object) {
  const res = await fetch(`${API}/${model}:generateContent`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-goog-api-key": await apiKey() },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Gemini ${model} failed (${res.status}): ${(await res.text()).slice(0, 300)}`);
  return res.json();
}

/** One JSON reply from the model, validated against `schema`. The agent speaks as "model". */
export async function generateJson<T>(system: string, turns: readonly Turn[], schema: z.ZodType<T>): Promise<T> {
  const json = await generate(TEXT_MODEL, {
    systemInstruction: { parts: [{ text: system }] },
    contents: toContents(turns),
    generationConfig: { responseMimeType: "application/json", temperature: 0.8 },
  });
  return schema.parse(JSON.parse(json.candidates?.[0]?.content?.parts?.[0]?.text ?? ""));
}

/** Speech as a base64 WAV. */
export async function synthesize(text: string): Promise<string> {
  return synthesizeWith(await apiKey(), text, SPEAKING_STYLE, DEFAULT_VOICE);
}

/** Model failures are reported to the phone in words, instead of the framework's blank "Internal server error". */
export async function attempt<T>(work: () => Promise<T>): Promise<T | { error: string }> {
  try {
    return await work();
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e);
    console.error("[threshold] call model failed:", error);
    return { error };
  }
}
