import { resolveCredential } from "@agent-native/core/credentials";
import { getRequestOrgId, getRequestUserEmail } from "@agent-native/core/server";
import type { z } from "zod";
import type { Turn } from "../../shared/engine/call.js";
import { wavFromPcm } from "./wav.js";

const API = "https://generativelanguage.googleapis.com/v1beta/models";
const KEY_NAME = "GOOGLE_GENERATIVE_AI_API_KEY";
const TEXT_MODEL = process.env.THRESHOLD_CALL_MODEL ?? "gemini-flash-latest";
const VOICE_MODEL = process.env.THRESHOLD_VOICE_MODEL ?? "gemini-3.1-flash-tts-preview";
const VOICE = process.env.THRESHOLD_VOICE ?? "Kore";
const SPEAKING_STYLE = "Say this like a warm, steady person on a real phone call, natural pace, a little breath between phrases, never like an announcer";

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
  const contents = turns.length
    ? turns.map((t) => ({ role: t.who === "agent" ? "model" : "user", parts: [{ text: t.text }] }))
    : [{ role: "user", parts: [{ text: "(The line is picked up.)" }] }];
  const json = await generate(TEXT_MODEL, {
    systemInstruction: { parts: [{ text: system }] },
    contents,
    generationConfig: { responseMimeType: "application/json", temperature: 0.8 },
  });
  return schema.parse(JSON.parse(json.candidates?.[0]?.content?.parts?.[0]?.text ?? ""));
}

/** Speech as a base64 WAV. */
export async function synthesize(text: string): Promise<string> {
  const json = await generate(VOICE_MODEL, {
    contents: [{ parts: [{ text: `${SPEAKING_STYLE}: ${text}` }] }],
    generationConfig: {
      responseModalities: ["AUDIO"],
      speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: VOICE } } },
    },
  });
  const pcm = json.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  if (!pcm) throw new Error("The voice model returned no audio.");
  return wavFromPcm(pcm);
}
